import { api } from "./api";
import { isStatic, onLocalChange } from "./static";
import { labels, type Labels } from "../../../src/core/i18n";
import type { Workspace } from "./types";

type Listener = (event: { type: string; paths?: string[]; [k: string]: unknown }) => void;

const AUTHOR_KEY = "omgp:author";
const readAuthor = () => {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? "";
  } catch {
    return "";
  }
};

class Store {
  ws = $state<Workspace | null>(null);
  /** who writes comments and annotations on this device */
  author = $state(readAuthor());
  error = $state<string | null>(null);
  connected = $state(false);
  t = $derived<Labels>(labels(this.ws?.config.locale));
  private listeners = new Set<Listener>();

  async load() {
    try {
      this.ws = await api.workspace();
      this.error = null;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  connect() {
    // a static demo has no server to listen to; only results made in this browser change counts
    if (isStatic) return void onLocalChange(() => this.load());
    const es = new EventSource("/api/events");
    es.onopen = () => (this.connected = true);
    es.onerror = () => (this.connected = false);
    es.onmessage = (m) => {
      const event = JSON.parse(m.data);
      if (event.type === "change" && event.paths.some((p: string) => !p.startsWith(".omgp/"))) this.load();
      for (const l of this.listeners) l(event);
    };
  }

  on(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  setAuthor(name: string) {
    this.author = name.trim();
    try {
      localStorage.setItem(AUTHOR_KEY, this.author);
    } catch {
      /* private mode */
    }
  }

  project(id: string) {
    return this.ws?.projects.find((p) => p.id === id) ?? null;
  }
}

export const store = new Store();
