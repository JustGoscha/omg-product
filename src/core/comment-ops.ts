import type { CommentTargetT, ThreadT } from "./schema.ts";

// Pure comment updates, shared by the server and the studio (optimistic updates).

export type CommentOp =
  | { op: "add"; id: string; target: CommentTargetT; text: string; author: string }
  | { op: "reply"; thread: string; id: string; text: string; author: string; agent?: boolean }
  | { op: "edit"; thread: string; comment: string; text: string }
  | { op: "resolve"; thread: string; by?: string }
  | { op: "reopen"; thread: string }
  | { op: "delete"; thread: string };

export interface CommentsDoc {
  threads: ThreadT[];
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function applyCommentOp(doc: CommentsDoc, op: CommentOp, now = new Date().toISOString()): CommentsDoc {
  const threads: ThreadT[] = JSON.parse(JSON.stringify(doc.threads));
  const find = (id: string) => threads.find((t) => t.id === id);
  switch (op.op) {
    case "add":
      if (!find(op.id))
        threads.push({
          id: op.id,
          target: op.target,
          status: "open",
          createdAt: now,
          comments: [{ id: `${op.id}-1`, author: op.author, text: op.text, at: now }],
        });
      break;
    case "reply": {
      const t = find(op.thread);
      if (t && !t.comments.some((c) => c.id === op.id))
        t.comments.push({ id: op.id, author: op.author, text: op.text, at: now, ...(op.agent ? { agent: true } : {}) });
      break;
    }
    case "edit": {
      const c = find(op.thread)?.comments.find((c) => c.id === op.comment);
      if (c) c.text = op.text;
      break;
    }
    case "resolve": {
      const t = find(op.thread);
      if (t) Object.assign(t, { status: "resolved", resolvedAt: now, ...(op.by ? { resolvedBy: op.by } : {}) });
      break;
    }
    case "reopen": {
      const t = find(op.thread);
      if (t) {
        t.status = "open";
        delete t.resolvedAt;
        delete t.resolvedBy;
      }
      break;
    }
    case "delete":
      return { threads: threads.filter((t) => t.id !== op.thread) };
  }
  return { threads };
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
/** Markdown as it reads on screen: what people select in the studio. */
export const stripMd = (s: string) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|[*_`]/g, "")
    .replace(/^\s*(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s?)/gm, "");

/** Where a quoted passage sits in the current text: 1-based line, or null when it was changed away. */
export function locateQuote(text: string, quote: string, hint?: number): number | null {
  if (!quote.trim()) return null;
  let i = text.indexOf(quote);
  if (i < 0) {
    // tolerate re-wrapping, extra spaces and markdown syntax around selected words
    const flat = norm(stripMd(quote));
    const lines = text.split("\n").map(stripMd);
    const windowHas = (start: number) => {
      let acc = "";
      for (let end = start; end < Math.min(lines.length, start + 40); end++) {
        acc = norm(`${acc} ${lines[end]}`);
        if (acc.includes(flat)) return true;
        if (acc.length > flat.length * 2 + 400) return false;
      }
      return false;
    };
    // the match starts at the last line from which it is still found
    let found = -1;
    for (let start = 0; start < lines.length; start++) {
      if (windowHas(start)) found = start;
      else if (found >= 0) break;
    }
    return found >= 0 ? found + 1 : null;
  }
  // with repeats, prefer the occurrence closest to the hint
  let best = i;
  if (hint) {
    let bestDist = Infinity;
    for (let j = i; j >= 0; j = text.indexOf(quote, j + 1)) {
      const line = text.slice(0, j).split("\n").length;
      const d = Math.abs(line - hint);
      if (d < bestDist) (bestDist = d), (best = j);
    }
  }
  return text.slice(0, best).split("\n").length;
}

/** Short human label for a target, used in lists and agent prompts. */
export function targetLabel(t: CommentTargetT): string {
  switch (t.kind) {
    case "text":
      return `${t.file}${t.line ? `:${t.line}` : ""} “${t.quote.length > 60 ? t.quote.slice(0, 59) + "…" : t.quote}”`;
    case "step":
      return `${t.file} › ${t.step}${t.option ? ` › option ${t.option}` : ""}${t.field ? ` › ${t.field}` : ""}`;
    case "element":
      return `${t.file}${t.step ? ` › ${t.step}` : ""}${t.option ? ` › ${t.option}` : ""} › ${t.element}${t.label ? ` (${t.label})` : ""}`;
    case "prototype":
      return `${t.file}${t.label ? ` › ${t.label}` : ""}${t.selector ? ` (${t.selector})` : ""}`;
    case "file":
      return t.file;
  }
}
