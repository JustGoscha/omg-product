import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";

export const ROOT_FILE = "product.yaml";

export function findRoot(from = process.cwd()): string | null {
  let dir = resolve(from);
  while (true) {
    if (existsSync(join(dir, ROOT_FILE))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

export function readText(path: string) {
  return readFileSync(path, "utf8");
}

/** Write via a temp file so a reader never sees half a file. */
export function writeText(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

export function listDir(path: string): string[] {
  try {
    return readdirSync(path).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}

export const isDir = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontmatter(src: string): { yaml: string; body: string } {
  const m = src.match(FM);
  if (!m) return { yaml: "", body: src };
  return { yaml: m[1], body: m[2] };
}

export function parseYaml(src: string): unknown {
  return YAML.parse(src, { prettyErrors: true });
}

/** Set top-level frontmatter keys in a markdown file, keeping comments and order. */
export function updateFrontmatter(path: string, patch: Record<string, unknown>) {
  const src = readText(path);
  const { yaml, body } = splitFrontmatter(src);
  const doc = YAML.parseDocument(yaml);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) doc.delete(key);
    else if (typeof value === "object" && !Array.isArray(value)) {
      // small maps like `when` stay on one line, as people write them
      const node = doc.createNode(value);
      (node as { flow?: boolean }).flow = true;
      doc.set(key, node);
    } else doc.set(key, value);
  }
  const yamlOut = doc.toString({ lineWidth: 0, flowCollectionPadding: false });
  writeText(path, `---\n${yamlOut.trimEnd()}\n---\n${body}`);
}

export function yamlStringify(value: unknown) {
  return YAML.stringify(value, { lineWidth: 0 });
}

/** Split a markdown body into `## Heading` sections. Keys are lowercased headings. */
export function markdownSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let key = "";
  let buf: string[] = [];
  const flush = () => {
    const t = buf.join("\n").trim();
    if (key || t) out[key] = t;
  };
  for (const line of body.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      key = m[1].toLowerCase();
      buf = [];
    } else buf.push(line);
  }
  flush();
  return out;
}

export function htmlMeta(src: string) {
  const title = src.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = src.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
  return { title, description };
}
