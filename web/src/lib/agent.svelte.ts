import { api } from "./api";
import { store } from "./store.svelte";
import { isStatic } from "./static";
import type { RequestT } from "./types";

/** What the agent is doing, for the dock and the status boxes. */
class Agent {
  configured = $state<string | null>(null);
  heartbeat = $state<{ mode: string; agent?: string; alive: boolean } | null>(null);
  requests = $state<RequestT[]>([]);
  now = $state(Date.now());
  private pending: ReturnType<typeof setTimeout> | null = null;

  /** someone builds requests right now: the studio's worker, `omgp work`, or an agent chat */
  connected = $derived(!!this.heartbeat?.alive);
  active = $derived(this.requests.filter((r) => r.status === "working"));
  queued = $derived(this.requests.filter((r) => r.status === "open"));

  async load() {
    try {
      const d = await api.agent();
      this.configured = d.configured;
      this.heartbeat = d.heartbeat;
      this.requests = d.requests;
    } catch {
      /* the studio shows connection problems elsewhere */
    }
  }

  start() {
    if (isStatic) return; // no agent behind a static demo
    this.load();
    store.on((ev) => {
      if (ev.type === "request" || (ev.type === "change" && (ev.paths ?? []).some((p) => p.startsWith(".omgp/")))) {
        if (this.pending) return;
        this.pending = setTimeout(() => ((this.pending = null), this.load()), 200);
      }
    });
    setInterval(() => (this.now = Date.now()), 1000);
    setInterval(() => this.load(), 8000);
  }

  get(id?: string) {
    return id ? this.requests.find((r) => r.id === id) : undefined;
  }

  /** a request marked working whose agent is gone */
  orphaned(r: RequestT) {
    if (r.status !== "working") return false;
    if (r.owner?.mode === "listen") return Date.now() - Date.parse(r.log.at(-1)?.at ?? r.startedAt ?? r.createdAt) > 15 * 60_000;
    return !this.connected;
  }

  elapsed(r: RequestT) {
    const from = Date.parse(r.startedAt ?? r.createdAt);
    const to = r.finishedAt ? Date.parse(r.finishedAt) : this.now;
    const s = Math.max(0, Math.round((to - from) / 1000));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
}

export const agent = new Agent();
