import { join } from "node:path";
import { readText, updateFrontmatter, writeText, yamlStringify } from "../core/files.ts";
import type { Workspace } from "../core/workspace.ts";

// Import from Linear: creates missing initiatives and projects, and keeps dates in
// sync. Dates marked `from: manual` (dragged on the roadmap) are never touched;
// dates from Linear or from an agent's estimate are replaced by what Linear has.
// Local fields (stage after kickoff, dependsOn, stream, size, sessions…) stay.
//
// Data comes from the Linear API (LINEAR_API_KEY) or from a JSON file an agent
// wrote from a Linear MCP: { initiatives?: [...], projects: [...] } as listed below.

export interface LinearInitiative {
  id: string; // "I-7" or uuid
  name: string;
  description?: string | null;
  status?: string;
  targetDate?: string | null;
  url?: string;
}
export interface LinearProject {
  id: string; // "ENG-56" or uuid
  name: string;
  description?: string | null;
  url?: string;
  startDate?: string | null;
  targetDate?: string | null;
  priority?: number | { value: number };
  status: { type: string } | string;
  initiatives?: { id?: string; name?: string }[] | { nodes: { id?: string; name?: string }[] };
}
export interface LinearData {
  initiatives?: LinearInitiative[];
  projects: LinearProject[];
}

const QUERY = `query {
  initiatives(first: 100) { nodes { id name description status targetDate url } }
  projects(first: 250) { nodes {
    id name description url startDate targetDate priority
    status { type }
    initiatives { nodes { id name } }
  } }
}`;

const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "untitled";
const stageFor: Record<string, string> = { backlog: "idea", planned: "scoped", started: "building", paused: "paused", completed: "done", canceled: "dropped" };
const priorityFor = ["medium", "urgent", "high", "medium", "low"];
const initiativeStatus = (s?: string) => ({ Planned: "planned", Active: "active", Completed: "done" })[s ?? ""] ?? "active";
const statusType = (p: LinearProject) => (typeof p.status === "string" ? p.status : p.status.type).toLowerCase();
const prio = (p: LinearProject) => priorityFor[typeof p.priority === "object" ? p.priority.value : (p.priority ?? 0)] ?? "medium";
const inits = (p: LinearProject) => (Array.isArray(p.initiatives) ? p.initiatives : (p.initiatives?.nodes ?? []));

export async function linearPull(ws: Workspace, opts: { dryRun: boolean; from?: string; backlog?: boolean }) {
  let data: LinearData;
  if (opts.from) data = JSON.parse(readText(opts.from)) as LinearData;
  else {
    const key = process.env.LINEAR_API_KEY;
    if (!key) {
      console.error("Set LINEAR_API_KEY (Linear → Settings → API), or let an agent with a Linear MCP write the data to a file and run `omgp linear pull --from <file.json>`.");
      process.exit(1);
    }
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: key },
      body: JSON.stringify({ query: QUERY }),
    });
    const body = (await res.json()) as { data?: { initiatives: { nodes: LinearInitiative[] }; projects: { nodes: LinearProject[] } }; errors?: unknown };
    if (!body.data) {
      console.error("Linear request failed:", JSON.stringify(body.errors ?? body));
      process.exit(1);
    }
    data = { initiatives: body.data.initiatives.nodes, projects: body.data.projects.nodes };
  }
  for (const line of applyLinear(ws, data, opts.dryRun, opts.backlog)) console.log(line);
  if (opts.dryRun) console.log("(dry run, nothing written)");
}

// New projects come in when they are planned or running, or in the backlog with a date;
// undated backlog ideas only with `backlog`, so the roadmap isn't flooded.
export function applyLinear(ws: Workspace, data: LinearData, dryRun: boolean, backlog = false): string[] {
  const log: string[] = [];
  const sameLinear = (ref: { id?: string; url?: string } | undefined, l: { id: string; url?: string }) =>
    !!ref && (ref.id === l.id || (!!ref.url && !!l.url && ref.url === l.url));

  // initiatives: map Linear ids and names to local ids
  const initiativeId = new Map<string, string>();
  for (const i of ws.initiatives) {
    initiativeId.set(i.name.toLowerCase(), i.id);
    if (i.linear?.id) initiativeId.set(i.linear.id, i.id);
  }
  for (const li of data.initiatives ?? []) {
    const existing = ws.initiatives.find((i) => sameLinear(i.linear, li) || i.name.toLowerCase() === li.name.toLowerCase());
    if (existing) {
      initiativeId.set(li.id, existing.id);
      continue;
    }
    if (li.status === "Completed" || li.status === "Canceled") continue;
    const id = slug(li.name);
    initiativeId.set(li.id, id);
    initiativeId.set(li.name.toLowerCase(), id);
    log.push(`+ initiative ${id}`);
    if (!dryRun)
      writeText(
        join(ws.root, "initiatives", `${id}.md`),
        `---\n${yamlStringify({
          id, name: li.name, status: initiativeStatus(li.status),
          ...(li.targetDate ? { when: { end: li.targetDate } } : {}),
          linear: { id: li.id, ...(li.url ? { url: li.url } : {}) },
        }).trimEnd()}\n---\n${li.description ?? ""}\n`,
      );
  }

  const linearWhen = (lp: LinearProject) =>
    lp.startDate || lp.targetDate
      ? { ...(lp.startDate ? { start: lp.startDate } : {}), ...(lp.targetDate ? { end: lp.targetDate } : {}), from: "linear" }
      : null;

  const taken = new Set(ws.projects.map((p) => p.id));
  let skipped = 0;
  for (const lp of data.projects) {
    const st = statusType(lp);
    const existing = ws.projects.find((p) => sameLinear(p.linear, lp)) ?? ws.projects.find((p) => p.name.toLowerCase() === lp.name.toLowerCase());
    if (existing) {
      const patch: Record<string, unknown> = {};
      const want = linearWhen(lp);
      if (existing.when?.from !== "manual") {
        const now = existing.when ? JSON.stringify({ start: existing.when.start, end: existing.when.end, from: existing.when.from }) : "null";
        const next = want ? JSON.stringify({ start: want.start, end: want.end, from: "linear" }) : "null";
        if (now !== next) {
          patch.when = want; // null removes guessed dates Linear doesn't have
          log.push(`~ ${existing.id}: when ${existing.when ? `${existing.when.start ?? "…"} → ${existing.when.end ?? "…"}` : "none"} ⇒ ${want ? `${want.start ?? "…"} → ${want.end ?? "…"}` : "none (backlog)"}`);
        }
      }
      if ((st === "completed" || st === "canceled") && !["done", "dropped"].includes(existing.stage)) {
        patch.stage = stageFor[st];
        log.push(`~ ${existing.id}: stage ${existing.stage} ⇒ ${stageFor[st]} (Linear: ${st})`);
      }
      if (!existing.linear?.id) patch.linear = { id: lp.id, ...(lp.url ? { url: lp.url } : {}) };
      if (Object.keys(patch).length && !dryRun) updateFrontmatter(join(ws.root, existing.file), patch);
      continue;
    }
    if (st === "completed" || st === "canceled") continue;
    if (st === "backlog" && !backlog && !lp.startDate && !lp.targetDate) {
      skipped++;
      continue;
    }
    let id = slug(lp.name);
    if (taken.has(id)) id = `${id}-${slug(lp.id).slice(-4)}`;
    taken.add(id);
    const when = linearWhen(lp);
    log.push(`+ project ${id}${when ? ` (${when.start ?? "…"} → ${when.end ?? "…"})` : " (backlog)"}`);
    if (!dryRun)
      writeText(
        join(ws.root, "projects", id, "project.md"),
        `---\n${yamlStringify({
          id,
          name: lp.name,
          initiatives: inits(lp).map((n) => initiativeId.get(n.id ?? "") ?? initiativeId.get((n.name ?? "").toLowerCase())).filter(Boolean),
          stage: stageFor[st] ?? "idea",
          priority: prio(lp),
          confidence: "low",
          ...(when ? { when } : {}),
          linear: { id: lp.id, ...(lp.url ? { url: lp.url } : {}) },
        }).trimEnd()}\n---\n\n${lp.description?.trim() ? lp.description.trim() : "## Problem\n"}\n`,
      );
  }
  if (skipped) log.push(`(${skipped} undated backlog projects left out; add them with --backlog)`);
  return log.length ? log : ["nothing to do"];
}
