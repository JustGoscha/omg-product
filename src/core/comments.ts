import { existsSync } from "node:fs";
import { join } from "node:path";
import { readText, splitFrontmatter, writeText } from "./files.ts";
import { CommentsFile, type ThreadT } from "./schema.ts";
import { applyCommentOp, locateQuote, type CommentOp, type CommentsDoc } from "./comment-ops.ts";

// Comment threads on workspace files. Scope is a project id, or "_root" for files
// outside projects (initiatives, vision). Paths in targets are relative to the scope.

export const ROOT_SCOPE = "_root";

export function scopeDir(root: string, scope: string) {
  return scope === ROOT_SCOPE ? root : join(root, "projects", scope);
}
const commentsPath = (root: string, scope: string) => join(scopeDir(root, scope), "comments.json");

export function loadComments(root: string, scope: string): CommentsDoc {
  const path = commentsPath(root, scope);
  if (!existsSync(path)) return { threads: [] };
  try {
    const parsed = CommentsFile.safeParse(JSON.parse(readText(path)));
    return parsed.success ? parsed.data : { threads: [] };
  } catch {
    return { threads: [] };
  }
}

export function updateComments(root: string, scope: string, op: CommentOp): CommentsDoc {
  const next = applyCommentOp(loadComments(root, scope), op);
  writeText(commentsPath(root, scope), JSON.stringify(next, null, 2) + "\n");
  return next;
}

export interface AnchoredThread extends ThreadT {
  /** current 1-based line of a text target; null when the passage no longer exists */
  line?: number | null;
  outdated?: boolean;
}

/** Re-find text anchors in the current files, like review comments after a change. */
export function anchorThreads(root: string, scope: string, doc: CommentsDoc): AnchoredThread[] {
  const cache = new Map<string, string | null>();
  const read = (file: string) => {
    if (!cache.has(file)) {
      const p = join(scopeDir(root, scope), file);
      cache.set(file, existsSync(p) ? readText(p) : null);
    }
    return cache.get(file)!;
  };
  return doc.threads.map((t) => {
    if (t.target.kind !== "text") return t;
    const text = read(t.target.file);
    if (text == null) return { ...t, line: null, outdated: true };
    const line = locateQuote(text, t.target.quote, t.target.line);
    return { ...t, line, outdated: line == null };
  });
}

// ---------- editing markdown sections ----------

export class EditConflict extends Error {}

/**
 * Replace the content under `## heading` in a markdown file (frontmatter kept).
 * `expect` is the content the editor started from; a mismatch means someone else
 * changed it meanwhile. A missing heading is appended.
 */
export function replaceSection(path: string, heading: string, content: string, expect?: string) {
  const src = readText(path);
  const fm = splitFrontmatter(src);
  const head = src.slice(0, src.length - fm.body.length);
  const lines = fm.body.split("\n");
  const isH2 = (l: string) => /^##\s+/.test(l);
  const start = lines.findIndex((l) => isH2(l) && l.replace(/^##\s+/, "").trim().toLowerCase() === heading.trim().toLowerCase());
  const clean = content.replace(/\s+$/, "");
  let body: string;
  if (start < 0) {
    if (expect?.trim()) throw new EditConflict(`section "${heading}" no longer exists`);
    body = `${fm.body.replace(/\s+$/, "")}\n\n## ${heading}\n${clean}\n`;
  } else {
    let end = lines.findIndex((l, i) => i > start && isH2(l));
    if (end < 0) end = lines.length;
    const current = lines.slice(start + 1, end).join("\n").trim();
    if (expect !== undefined && current !== expect.trim()) throw new EditConflict(`section "${heading}" was changed meanwhile`);
    const tail = lines.slice(end);
    body = [...lines.slice(0, start + 1), clean, ...(tail.length ? ["", ...tail] : [""])].join("\n");
  }
  writeText(path, head + body);
}

/** Replace the whole body (below the frontmatter) of a markdown file. */
export function replaceBody(path: string, content: string, expect?: string) {
  const src = readText(path);
  const fm = splitFrontmatter(src);
  if (expect !== undefined && fm.body.trim() !== expect.trim()) throw new EditConflict("the file was changed meanwhile");
  const head = src.slice(0, src.length - fm.body.length);
  writeText(path, head + content.replace(/\s+$/, "") + "\n");
}
