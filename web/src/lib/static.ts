import { applyOp, type ResultOp } from "../../../src/core/ops";
import type { LoadedSession, ResultsT } from "./types";

// The studio as a static demo (`exportStatic`, src/cli/export.ts): no server behind it.
// The export sets window.__OMGP_STATIC__ in index.html. GET endpoints are read from JSON
// snapshots next to index.html, and meeting results live in this browser's localStorage,
// one entry per session, so visitors can click through a session and come back to it.

export interface StaticInfo {
  workspace?: string;
  exportedAt?: string;
}

declare global {
  interface Window {
    __OMGP_STATIC__?: StaticInfo;
  }
}

export const staticInfo: StaticInfo | null = (typeof window !== "undefined" && window.__OMGP_STATIC__) || null;
export const isStatic = staticInfo !== null;
export const REPO_URL = "https://github.com/JustGoscha/omg-product";

/** Where the snapshot of a GET endpoint lives, relative to index.html: /api/x/y → api/x/y.json */
export const snapshotPath = (apiPath: string) => `${apiPath.replace(/^\//, "")}.json`;

// GitHub Pages serves every project of a user from one origin: keep demos apart by path
const storageKey = (project: string, session: string) => `omgp:demo:${location.pathname.replace(/index\.html$/, "")}:${project}/${session}`;

interface Saved {
  results: ResultsT;
  /** answered steps, as the workspace's session summary counts them */
  answered?: number;
}

// without localStorage (blocked, private mode) results last until the page reloads
const memory = new Map<string, Saved | null>();

function read(project: string, session: string): Saved | null {
  const key = storageKey(project, session);
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(project: string, session: string, saved: Saved | null) {
  const key = storageKey(project, session);
  memory.set(key, saved);
  try {
    if (saved) localStorage.setItem(key, JSON.stringify(saved));
    else localStorage.removeItem(key);
  } catch {
    /* kept in memory */
  }
}

/** sessions as exported, so local results can start from them and reset to them */
const exported = new Map<string, { session: LoadedSession; results: ResultsT }>();

export function rememberExported(project: string, session: string, data: { session: LoadedSession; results: ResultsT }) {
  exported.set(`${project}/${session}`, structuredClone(data));
}

export const localResults = (project: string, session: string) => read(project, session)?.results ?? null;
export const localAnswered = (project: string, session: string) => read(project, session)?.answered ?? null;

function countAnswered(session: LoadedSession | undefined, results: ResultsT) {
  if (!session) return undefined;
  return session.sections
    .flatMap((sec) => sec.steps)
    .filter((s) => s.type !== "slide" && s.type !== "broken")
    .filter((s) => {
      const r = results.steps[s.id];
      return !!r && (!!r.status || !!r.value);
    }).length;
}

const listeners = new Set<() => void>();
/** called when local results change what the workspace shows (answered counts) */
export function onLocalChange(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Apply a result op in the browser, the same way the server does, and keep the results. */
export function applyLocalOp(project: string, session: string, op: ResultOp): ResultsT {
  const base = exported.get(`${project}/${session}`);
  const empty: ResultsT = { session, steps: {}, annotations: [] };
  const before = read(project, session);
  let next: ResultsT;
  if (op.op === "reset") {
    // back to the session as it was exported
    write(project, session, null);
    next = structuredClone(base?.results ?? empty);
  } else {
    next = applyOp(before?.results ?? base?.results ?? empty, op);
    write(project, session, { results: next, answered: countAnswered(base?.session, next) });
  }
  const after = read(project, session);
  if (before?.answered !== after?.answered) for (const l of listeners) l();
  return next;
}
