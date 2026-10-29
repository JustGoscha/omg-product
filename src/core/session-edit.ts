import { join } from "node:path";
import YAML, { isMap, isScalar, isSeq, type Document, type Pair, type YAMLMap, type YAMLSeq } from "yaml";
import { readText, writeText } from "./files.ts";
import { EditConflict } from "./comments.ts";

// Edit one field of one session step in place, as a text edit on the file: a value
// is replaced, a line inserted or removed. Everything else stays byte for byte, so
// git diffs show exactly what changed. Only shapes we can't splice fall back to
// re-rendering that one step.

export type StepPath = (string | number)[];

function findStep(doc: Document, stepId: string): YAMLMap | null {
  const sections = doc.get("sections");
  if (!isSeq(sections)) return null;
  for (const sec of sections.items) {
    if (!isMap(sec)) continue;
    const steps = sec.get("steps");
    if (!isSeq(steps)) continue;
    for (const st of steps.items) if (isMap(st) && st.get("id") === stepId) return st as YAMLMap;
  }
  return null;
}

/** Option ids in paths (["options", "@rule", "label"]) resolve to their index. */
function resolvePath(step: YAMLMap, path: StepPath): StepPath {
  return path.map((seg, i) => {
    if (typeof seg !== "string" || !seg.startsWith("@")) return seg;
    const list = step.getIn(path.slice(0, i));
    if (!isSeq(list)) throw new EditConflict(`${path.slice(0, i).join(".")} is not a list`);
    const idx = list.items.findIndex((it) => isMap(it) && it.get("id") === seg.slice(1));
    if (idx < 0) throw new EditConflict(`no option "${seg.slice(1)}"`);
    return idx;
  });
}

const plain = (v: unknown) => (v && typeof v === "object" && "toJSON" in v ? (v as { toJSON(): unknown }).toJSON() : v);
const lineStart = (src: string, off: number) => src.lastIndexOf("\n", off - 1) + 1;
const lineEnd = (src: string, off: number) => {
  const i = src.indexOf("\n", off);
  return i < 0 ? src.length : i + 1;
};
const columnOf = (src: string, off: number) => off - lineStart(src, off);
const splice = (src: string, from: number, to: number, text: string) => src.slice(0, from) + text + src.slice(to);

/** A scalar that is valid in block and flow context. */
function scalarText(v: unknown) {
  if (typeof v !== "string") return String(v);
  const risky = /^[\s\-?:,[\]{}#&*!|>'"%@`]|[:#]\s|[,[\]{}]|\s$|^(true|false|null|yes|no|on|off|~)$|^[\d.+-]+$/i;
  return risky.test(v) || v === "" ? JSON.stringify(v) : v;
}
const inlineSeq = (src: string, items: unknown[]) => {
  const padded = (src.match(/\[ \S/g)?.length ?? 0) > (src.match(/\[[^\s\]]/g)?.length ?? 0);
  const inner = items.map(scalarText).join(", ");
  return padded ? `[ ${inner} ]` : `[${inner}]`;
};
/** End offset of a pair's value (or key), including the newline of a block scalar. */
const pairEnd = (p: Pair) => {
  const v = p.value as { range?: [number, number, number] } | null;
  const k = p.key as { range?: [number, number, number] };
  return v?.range?.[1] ?? k.range![1];
};

function keyLines(key: string, value: unknown, indent: string, src: string): string {
  if (typeof value === "string" && value.includes("\n"))
    return `${indent}${key}: |\n${value.replace(/\s+$/, "").split("\n").map((l) => (l ? `${indent}  ${l}` : "")).join("\n")}\n`;
  if (Array.isArray(value)) {
    const inline = inlineSeq(src, value);
    if (inline.length < 90) return `${indent}${key}: ${inline}\n`;
    return `${indent}${key}:\n${value.map((v) => `${indent}  - ${scalarText(v)}\n`).join("")}`;
  }
  return `${indent}${key}: ${scalarText(value)}\n`;
}

/** Try to apply the change as a text edit. Null when the shape needs a re-render. */
function textEdit(src: string, parent: unknown, key: string | number, node: unknown, value: unknown, remove: boolean): string | null {
  // replace a scalar
  if (!remove && isScalar(node) && node.range && ["string", "number", "boolean"].includes(typeof value)) {
    const [s, e] = node.range;
    const str = String(value);
    if (node.type === "BLOCK_LITERAL" || node.type === "BLOCK_FOLDED") {
      const indent = src.slice(s, e).match(/\n( +)\S/)?.[1] ?? " ".repeat(columnOf(src, s) + 2);
      return splice(src, s, e, "|\n" + str.replace(/\s+$/, "").split("\n").map((l) => (l ? indent + l : "")).join("\n") + "\n");
    }
    if (!str.includes("\n")) return splice(src, s, e, scalarText(value));
    if (isMap(parent) && !parent.flow) {
      const pair = parent.items.find((p) => p.value === node);
      const col = pair ? columnOf(src, (pair.key as { range: number[] }).range[0]) : columnOf(src, s);
      return splice(src, s, e, "|\n" + str.replace(/\s+$/, "").split("\n").map((l) => (l ? " ".repeat(col + 2) + l : "")).join("\n"));
    }
    return null;
  }
  // replace a list
  if (!remove && isSeq(node) && node.range && Array.isArray(value) && value.every((v) => typeof v !== "object")) {
    const seq = node as YAMLSeq;
    const [s, e] = seq.range!;
    if (seq.flow) return splice(src, s, e, inlineSeq(src, value));
    const col = columnOf(src, s);
    return splice(src, lineStart(src, s), lineEnd(src, e - 1), value.map((v) => `${" ".repeat(col)}- ${scalarText(v)}\n`).join(""));
  }
  if (!isMap(parent) || typeof key !== "string") return null;
  const map = parent as YAMLMap;
  // remove a key from a block map
  if (remove) {
    if (map.flow || node === undefined) return node === undefined ? src : null;
    const pair = map.items.find((p) => (isScalar(p.key) ? p.key.value : p.key) === key);
    if (!pair) return src;
    const from = lineStart(src, (pair.key as { range: number[] }).range[0]);
    const end = pairEnd(pair);
    return splice(src, from, src[end - 1] === "\n" ? end : lineEnd(src, end), "");
  }
  // add a key
  if (node === undefined && map.range) {
    if (map.flow) {
      if (typeof value === "string" && value.includes("\n")) return null;
      const close = src.lastIndexOf("}", map.range[1]);
      const pad = src[close - 1] === " " ? 1 : 0;
      const inline = Array.isArray(value) ? inlineSeq(src, value) : scalarText(value);
      return splice(src, close - pad, close - pad, `, ${key}: ${inline}`);
    }
    const first = map.items[0];
    if (!first) return null;
    const indent = " ".repeat(columnOf(src, (first.key as { range: number[] }).range[0]));
    const end = pairEnd(map.items[map.items.length - 1]);
    const at = src[end - 1] === "\n" ? end : lineEnd(src, end);
    return splice(src, at, at, keyLines(key, value, indent, src));
  }
  return null;
}

function renderStep(src: string, step: YAMLMap): string {
  const [s, e] = step.range!;
  const col = columnOf(src, s);
  const d = new YAML.Document();
  d.contents = step;
  const out = d.toString({ lineWidth: 0 }).replace(/\n+$/, "");
  const indented = out.split("\n").map((l, i) => (i === 0 || !l ? l : " ".repeat(col) + l)).join("\n");
  const tail = src.slice(e);
  return src.slice(0, s) + indented + (tail.startsWith("\n") ? "" : "\n") + tail;
}

export function patchStep(root: string, project: string, session: string, stepId: string, path: StepPath, value: unknown, expect?: unknown) {
  const file = join(root, "projects", project, "sessions", `${session}.yaml`);
  const src = readText(file);
  const doc = YAML.parseDocument(src);
  const step = findStep(doc, stepId);
  if (!step?.range) throw new EditConflict(`no step "${stepId}" in ${session}.yaml`);
  const p = resolvePath(step, path);
  if (expect !== undefined) {
    const current = plain(step.getIn(p));
    if (JSON.stringify(current ?? null) !== JSON.stringify(expect ?? null)) throw new EditConflict(`${p.join(".")} was changed meanwhile`);
  }
  const remove = value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length);
  const parent = p.length > 1 ? step.getIn(p.slice(0, -1), true) : step;
  const node = step.getIn(p, true);
  const edited = textEdit(src, parent, p[p.length - 1], node, value, remove);
  if (edited != null) {
    YAML.parseDocument(edited, { prettyErrors: true }).errors.forEach((e) => {
      throw new EditConflict(`edit would break the YAML: ${e.message}`);
    });
    return writeText(file, edited);
  }
  if (remove) step.deleteIn(p);
  else step.setIn(p, value);
  writeText(file, renderStep(src, step));
}
