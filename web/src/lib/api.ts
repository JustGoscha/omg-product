import type { LoadedSession, RequestT, ResultOp, ResultsT, Workspace } from "./types";
import type { CommentOp } from "../../../src/core/comment-ops";
import type { AnchoredThread } from "../../../src/core/comments";
import type { Heartbeat } from "../../../src/core/requests";
import { applyLocalOp, isStatic, localAnswered, localPulse, localResults, rememberExported, saveLocalPulse, snapshotPath } from "./static";
import { addDuel, type PulseDay } from "../../../src/core/pulse";

export class ApiError extends Error {
  constructor(message: string, public status: number, public conflict = false) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (isStatic) return snapshot<T>(path, init);
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string; conflict?: boolean });
    throw new ApiError(body.error ?? `${init?.method ?? "GET"} ${path} → ${res.status}`, res.status, !!body.conflict);
  }
  return res.json() as Promise<T>;
}

/** Static demo: a GET reads the exported snapshot; anything that writes is refused without a request. */
async function snapshot<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.method && init.method !== "GET") throw new ApiError("Demo: read-only", 405);
  const res = await fetch(snapshotPath(path));
  if (!res.ok) throw new ApiError(`${path} is not part of this demo (${res.status})`, res.status);
  return res.json() as Promise<T>;
}

const enc = encodeURIComponent;

export const api = {
  workspace: async () => {
    const ws = await call<Workspace>("/api/workspace");
    // progress made in this browser
    if (isStatic) for (const p of ws.projects) for (const s of p.sessions) s.answered = localAnswered(p.id, s.id) ?? s.answered;
    return ws;
  },
  session: async (project: string, session: string) => {
    const d = await call<{ session: LoadedSession; results: ResultsT; requests: RequestT[] }>(`/api/session/${enc(project)}/${enc(session)}`);
    if (isStatic) {
      rememberExported(project, session, d);
      d.results = localResults(project, session) ?? d.results;
    }
    return d;
  },
  op: (project: string, session: string, op: ResultOp) =>
    isStatic
      ? Promise.resolve(applyLocalOp(project, session, op))
      : call<ResultsT>(`/api/session/${enc(project)}/${enc(session)}/op`, { method: "POST", body: JSON.stringify(op) }),
  handoff: (project: string, sessions?: string[]) =>
    call<{ markdown: string; file: string }>(`/api/handoff/${enc(project)}`, { method: "POST", body: JSON.stringify({ sessions }) }),
  patchProject: (project: string, patch: Record<string, unknown>) =>
    call<{ ok: true }>(`/api/project/${enc(project)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  asset: (project: string, dataUrl: string, name?: string) =>
    call<{ path: string; workspacePath: string }>(`/api/assets/${enc(project)}`, { method: "POST", body: JSON.stringify({ dataUrl, name }) }),
  comments: (scope: string) => call<{ threads: AnchoredThread[] }>(`/api/comments/${enc(scope)}`),
  commentOp: (scope: string, op: CommentOp) =>
    call<{ threads: AnchoredThread[] }>(`/api/comments/${enc(scope)}`, { method: "POST", body: JSON.stringify(op) }),
  editText: (scope: string, edit: { file: string; heading?: string; content: string; expect?: string }) =>
    call<{ ok: true }>(`/api/text/${enc(scope)}`, { method: "PATCH", body: JSON.stringify(edit) }),
  editStep: (project: string, session: string, step: string, edit: { path: (string | number)[]; value: unknown; expect?: unknown }) =>
    call<{ ok: true }>(`/api/session/${enc(project)}/${enc(session)}/step/${enc(step)}`, { method: "PATCH", body: JSON.stringify(edit) }),
  // the static demo keeps swipes in this browser, on top of the exported ones
  pulse: async () => {
    const d = await call<{ days: PulseDay[] }>("/api/pulse");
    return isStatic ? { days: localPulse<PulseDay[]>() ?? d.days } : d;
  },
  pulseDuel: async (v: { voter: string; date: string; win: string; over: string; undo?: boolean }) => {
    if (!isStatic) return call<{ days: PulseDay[] }>("/api/pulse", { method: "POST", body: JSON.stringify(v) });
    const base = localPulse<PulseDay[]>() ?? (await call<{ days: PulseDay[] }>("/api/pulse")).days;
    const days = addDuel(base, v.voter, v.date, { win: v.win, over: v.over }, v.undo);
    saveLocalPulse(days);
    return { days };
  },
  agent: () =>
    call<{ configured: string | null; heartbeat: (Heartbeat & { alive: boolean }) | null; requests: RequestT[] }>("/api/agent"),
  cancelRequest: (id: string) => call<RequestT>(`/api/requests/${enc(id)}/cancel`, { method: "POST" }),
  retryRequest: (id: string) => call<RequestT>(`/api/requests/${enc(id)}/retry`, { method: "POST" }),
  request: (r: Omit<RequestT, "id" | "status" | "createdAt" | "log">) =>
    call<RequestT & { prompt: string; agent: boolean }>("/api/requests", { method: "POST", body: JSON.stringify(r) }),
};

// the static demo lives under a sub-path (GitHub Pages): workspace files sit next to index.html
const FILES = isStatic ? "files/" : "/files/";

/** URL of a workspace file, as served by the studio. */
export const fileUrl = (path: string) => `${FILES}${path.split("/").map(enc).join("/")}`;

/** URL of a project-relative file (prototype, image). Keeps #hash. */
export function projectFileUrl(project: string, src: string, annotate = false) {
  if (/^https?:\/\//.test(src)) return src;
  const [pathAndQuery, hash] = src.split("#");
  const [path] = pathAndQuery.split("?");
  return `${fileUrl(`projects/${project}/${path}`)}${annotate ? "?omgp=1" : ""}${hash ? `#${hash}` : ""}`;
}
