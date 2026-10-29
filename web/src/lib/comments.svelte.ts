import { api } from "./api";
import { store } from "./store.svelte";
import { applyCommentOp, newId } from "../../../src/core/comment-ops";
import { isStatic } from "./static";
import type { AnchoredThread, CommentOp, CommentTargetT } from "./types";

/** Comment threads of one scope (a project id, or "_root"), kept live. */
export class Comments {
  scope: string;
  /** a static demo shows threads but cannot write them */
  readOnly = isStatic;
  threads = $state<AnchoredThread[]>([]);
  error = $state<string | null>(null);
  /** thread ids handed to the agent in this session */
  sent = $state<Set<string>>(new Set());
  private off: (() => void) | null = null;

  constructor(scope: string) {
    this.scope = scope;
  }

  async load() {
    try {
      this.threads = (await api.comments(this.scope)).threads;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  start() {
    this.load();
    const file = this.scope === "_root" ? "comments.json" : `projects/${this.scope}/`;
    this.off = store.on((ev) => {
      if (ev.type === "comments" && ev.scope === this.scope) this.load();
      // edited files move text anchors; comments.json changes from the CLI
      if (ev.type === "change" && (ev.paths ?? []).some((p) => p.startsWith(file))) this.load();
    });
  }

  stop() {
    this.off?.();
  }

  async act(op: CommentOp) {
    if (this.readOnly) return;
    this.threads = applyCommentOp({ threads: this.threads }, op).threads as AnchoredThread[];
    try {
      this.threads = (await api.commentOp(this.scope, op)).threads;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  add(target: CommentTargetT, text: string) {
    const id = newId("t");
    this.act({ op: "add", id, target, text, author: store.author || "someone" });
    return id;
  }

  reply(thread: string, text: string) {
    return this.act({ op: "reply", thread, id: newId("c"), text, author: store.author || "someone" });
  }

  /** save a new comment and hand it to the agent right away */
  async addForAgent(target: CommentTargetT, text: string) {
    const id = newId("t");
    // the thread must be on disk before the agent looks for it
    await this.act({ op: "add", id, target, text, author: store.author || "someone" });
    await this.toAgent(id);
    return id;
  }

  async toAgent(thread: string) {
    const r = await api.request({ kind: "comment", project: this.scope, thread, text: "", author: store.author || undefined });
    this.sent = new Set([...this.sent, thread]);
    return r;
  }
}
