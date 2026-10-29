import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Markdown from workspace files. Raw HTML is escaped; files are written by agents, not trusted to inject. */
export function md(src: string | undefined | null): string {
  if (!src) return "";
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => escapeHtml(text);
  renderer.link = ({ href, text }) => `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${text}</a>`;
  return marked.parse(src, { renderer, async: false }) as string;
}

/** Inline markdown (bold, code, links) for single lines. */
export function mdInline(src: string | undefined | null): string {
  if (!src) return "";
  return marked.parseInline(escapeHtml(src), { async: false }) as string;
}
