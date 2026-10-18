import { existsSync, rmSync } from "node:fs";
import { SKILLS_DIR } from "./paths.ts";
import { join, resolve } from "node:path";
import { listDir, readText, writeText } from "./files.ts";
import { Request, type RequestT } from "./schema.ts";

// Live requests: the studio files them, an agent claims and fulfils them.

export const requestsDir = (root: string) => join(root, ".omgp", "requests");
const heartbeatPath = (root: string) => join(root, ".omgp", "agent.json");
type LogEntry = RequestT["log"][number];

export function listRequests(root: string): RequestT[] {
  return listDir(requestsDir(root))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const r = Request.safeParse(JSON.parse(readText(join(requestsDir(root), f))));
        return r.success ? r.data : null;
      } catch {
        return null;
      }
    })
    .filter((r): r is RequestT => !!r)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getRequest(root: string, id: string): RequestT | null {
  const path = join(requestsDir(root), `${id}.json`);
  if (!existsSync(path)) return null;
  try {
    const r = Request.safeParse(JSON.parse(readText(path)));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function saveRequest(root: string, r: RequestT) {
  writeText(join(requestsDir(root), `${r.id}.json`), JSON.stringify(r, null, 2) + "\n");
}

function update(root: string, id: string, fn: (r: RequestT) => RequestT | null) {
  const r = getRequest(root, id);
  if (!r) return null;
  const next = fn(r);
  if (!next) return null;
  next.updatedAt = new Date().toISOString();
  saveRequest(root, next);
  return next;
}

export function createRequest(
  root: string,
  input: Omit<RequestT, "id" | "status" | "createdAt" | "text" | "log"> & { text?: string },
): RequestT {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const r: RequestT = {
    ...input,
    text: input.text ?? "",
    log: [],
    id: `r-${stamp}-${Math.random().toString(36).slice(2, 6)}`,
    status: "open",
    createdAt: now.toISOString(),
  };
  saveRequest(root, r);
  return r;
}

/** Take an open request. Returns null when someone else was faster. */
export function claimRequest(root: string, id: string, owner: NonNullable<RequestT["owner"]>) {
  return update(root, id, (r) =>
    r.status !== "open"
      ? null
      : { ...r, status: "working", owner, startedAt: new Date().toISOString(), finishedAt: undefined, message: undefined },
  );
}

export function setRequestStatus(root: string, id: string, status: RequestT["status"], message?: string) {
  return update(root, id, (r) => ({
    ...r,
    status,
    message: message ?? (status === "open" ? undefined : r.message),
    ...(status === "done" || status === "failed" || status === "cancelled" ? { finishedAt: new Date().toISOString() } : {}),
    ...(status === "open" ? { owner: undefined, startedAt: undefined, finishedAt: undefined } : {}),
  }));
}

export function appendLog(root: string, id: string, entries: Omit<LogEntry, "at">[]) {
  if (!entries.length) return null;
  const at = new Date().toISOString();
  return update(root, id, (r) => ({ ...r, log: [...r.log, ...entries.map((e) => ({ ...e, at }))].slice(-300) }));
}

// ---------- who is listening ----------

export interface Heartbeat {
  pid: number;
  mode: "server" | "worker" | "listen";
  agent?: string;
  startedAt: string;
  beatAt: string;
  busy: string[];
}

export const pidAlive = (pid?: number) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

export function writeHeartbeat(root: string, hb: Omit<Heartbeat, "beatAt">) {
  writeText(heartbeatPath(root), JSON.stringify({ ...hb, beatAt: new Date().toISOString() }, null, 2) + "\n");
}

export function clearHeartbeat(root: string, pid: number) {
  const hb = readHeartbeat(root);
  if (hb?.pid === pid) rmSync(heartbeatPath(root), { force: true });
}

export function readHeartbeat(root: string): (Heartbeat & { alive: boolean }) | null {
  try {
    const hb = JSON.parse(readText(heartbeatPath(root))) as Heartbeat;
    const fresh = Date.now() - Date.parse(hb.beatAt) < 12_000;
    return { ...hb, alive: fresh && pidAlive(hb.pid) };
  } catch {
    return null;
  }
}

/**
 * Put requests back in the queue whose worker is gone (crashed, closed terminal).
 * Requests claimed with `omgp listen` belong to an interactive agent; they are only
 * released after 15 minutes without a sign of life.
 */
export function requeueStale(root: string) {
  const out: string[] = [];
  for (const r of listRequests(root)) {
    if (r.status !== "working") continue;
    const last = Date.parse(r.log.at(-1)?.at ?? r.updatedAt ?? r.startedAt ?? r.createdAt);
    const gone = r.owner?.mode === "listen" || !r.owner ? Date.now() - last > 15 * 60_000 : !pidAlive(r.owner.pid);
    if (!gone) continue;
    appendLog(root, r.id, [{ kind: "status", text: "requeued: the agent working on it is gone" }]);
    setRequestStatus(root, r.id, "open");
    out.push(r.id);
  }
  return out;
}

// ---------- the prompt ----------

const skillsDir = SKILLS_DIR;

/** A second round when the worker found the prototype broken after the agent finished. */
export function fixPrompt(r: RequestT, problems: string[]) {
  return [
    `You just worked on live omgp request ${r.id} for project ${r.project}, and the prototype you changed is broken now. A real browser reported:`,
    ...problems.slice(0, 12).map((p) => `- ${p}`),
    `Fix these in the prototype without undoing what the request asked for. Then run \`omgp check ${r.project} --shots\` until it reports ok, and look at the screenshots of the states you changed. Keep it small: people are waiting in a meeting.`,
  ].join("\n");
}

/** The prompt an agent gets for a request; also printed by `omgp listen`. */
export function requestPrompt(r: RequestT, mode: "listen" | "worker" = "listen") {
  const where = r.session ? `projects/${r.project}/sessions/${r.session}.yaml` : `projects/${r.project}/`;
  const threads = r.threads?.length
    ? ` and address the comment threads ${r.threads.join(", ")} (read them with \`omgp comments ${r.project}\`; afterwards \`omgp reply <thread> "<what changed>"\` and \`omgp resolve <thread>\` for each)`
    : "";
  const what: Record<RequestT["kind"], string> = {
    option: `Someone in the meeting rejected the options of step "${r.step}" and described their own. Append it as a new option (id "custom-<n>", requestId "${r.id}") with a visual of the same type as the sibling options so the studio can diff it, plus pros, cons and effort.`,
    "revise-option": `Rebuild option "${r.option}" of step "${r.step}" as described${threads}. Keep its id; update label, summary, visual (same type as its siblings, stable ids so it still diffs), pros, cons, effort, enables and forecloses so they match.`,
    "revise-step": `Rebuild decision "${r.step}" as described${threads}: options, their visuals, recommendation and because. Keep option ids that still make sense; results already recorded refer to them.`,
    visual: `Add or improve the visual of step "${r.step}" as described.`,
    step: `Add a new step after "${r.step}" as described.`,
    prototype: `Change the prototype as described. Fork it to a new file if the change is a real alternative.`,
    comment: `Address comment thread ${r.thread} (run \`omgp comments ${r.project}\` to read it with its target). Change the file it points at as asked. Then \`omgp reply ${r.thread} "<what you changed>"\` and \`omgp resolve ${r.thread}\`. If it needs a human decision instead, reply with the question and leave it open.`,
  };
  const check = `If you changed a prototype, look at it before you finish: \`omgp check ${r.project} --shots\` opens it in a real browser, visits every #state the sessions use and saves a screenshot per state. Fix every problem it reports, then open the screenshots of the states you changed with your file reader and make sure they show what was asked. Never say it works unless the check passes and you saw it.`;
  const finish =
    mode === "worker"
      ? `${check} When you are done, run \`omgp validate\` and fix every error in the files you touched. You don't need to call \`omgp done\`; the worker marks the request when you exit.`
      : `${check} Then run \`omgp validate\` and \`omgp done ${r.id}\` (or \`omgp done ${r.id} --fail "why"\`). While you work, report each step in a few words with \`omgp progress ${r.id} "<what you're doing>"\` so the room can follow.`;
  return [
    `Live omgp request ${r.id} (${r.kind}). People are waiting in a meeting: keep it small, fast and correct.`,
    `File: ${where}`,
    what[r.kind],
    r.text ? `What they said: """${r.text}"""` : "",
    r.sketch ? `Their sketch (look at it): ${r.sketch}` : "",
    finish,
    `How to write it: ${skillsDir}/omgp-facilitate/SKILL.md and ${skillsDir}/omgp-kickoff/SKILL.md. File format: ${skillsDir}/omgp/references/format.md. Write in the session's language.`,
    `If the workspace has a rules.md, read it first: the team's rules win over the skills.`,
  ]
    .filter(Boolean)
    .join("\n");
}
