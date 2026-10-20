import type { ProductConfigT } from "./schema.ts";
import { addDays, daysBetween, sizeWeeks, weekStart, type Span } from "./time.ts";
import { reachIndex } from "./pulse.ts";

interface ProjectLike {
  id: string;
  name: string;
  stage: string;
  priority: string;
  size?: string;
  stream?: string;
  reach?: string;
  span: Span | null;
  dependsOn: { on: string; kind: string; note?: string }[];
}

export interface Analysis {
  conflicts: { project: string; on: string; message: string }[];
  cycles: string[][];
  bottlenecks: { project: string; dependents: string[] }[];
  delegatable: string[];
  overload: { stream: string; from: string; to: string; peak: number; capacity: number; projects: string[] }[];
  unscheduled: string[];
  /** built, but not launched yet (or not as far out as profile.doneMeans asks) */
  notOut: string[];
  /** more projects in progress than profile.focus allows */
  unfocused: { active: string[]; focus: number } | null;
  load: Record<string, { week: string; load: number }[]>;
}

const inactive = new Set(["done", "dropped"]);
const activeStage = (s: string) => !inactive.has(s);

export function analyze(input: { today: string; config: ProductConfigT; projects: ProjectLike[] }): Analysis {
  const { projects, config } = input;
  const byId = new Map(projects.map((p) => [p.id, p]));
  const active = projects.filter((p) => activeStage(p.stage));

  // conflicts: a hard dependency must be done before the dependent starts
  const conflicts: Analysis["conflicts"] = [];
  for (const p of active) {
    for (const d of p.dependsOn) {
      const dep = byId.get(d.on);
      if (!dep || dep.stage === "done" || d.kind !== "hard") continue;
      if (dep.stage === "dropped") {
        conflicts.push({ project: p.id, on: dep.id, message: `${p.name} is blocked by ${dep.name}, which was dropped` });
        continue;
      }
      if (p.span && !dep.span)
        conflicts.push({ project: p.id, on: dep.id, message: `${p.name} is scheduled, but its blocker ${dep.name} is not` });
      else if (p.span && dep.span && p.span.start <= dep.span.end)
        conflicts.push({
          project: p.id,
          on: dep.id,
          message: `${p.name} starts ${p.span.start}, before its blocker ${dep.name} ends ${dep.span.end}`,
        });
    }
  }

  // cycles over hard dependencies
  const cycles: string[][] = [];
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string) => {
    state.set(id, 1);
    stack.push(id);
    for (const d of byId.get(id)?.dependsOn ?? []) {
      if (d.kind !== "hard" || !byId.has(d.on)) continue;
      const s = state.get(d.on) ?? 0;
      if (s === 1) cycles.push([...stack.slice(stack.indexOf(d.on)), d.on]);
      else if (s === 0) visit(d.on);
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const p of projects) if (!state.get(p.id)) visit(p.id);

  // dependents: who waits on whom
  const dependents = new Map<string, Set<string>>();
  for (const p of active)
    for (const d of p.dependsOn)
      if (d.kind !== "loose") {
        if (!dependents.has(d.on)) dependents.set(d.on, new Set());
        dependents.get(d.on)!.add(p.id);
      }
  const transitive = (id: string, seen = new Set<string>()) => {
    for (const x of dependents.get(id) ?? [])
      if (!seen.has(x)) {
        seen.add(x);
        transitive(x, seen);
      }
    return seen;
  };
  const bottlenecks = active
    .map((p) => ({ project: p.id, dependents: [...transitive(p.id)] }))
    .filter((b) => b.dependents.length >= 2)
    .sort((a, b) => b.dependents.length - a.dependents.length);

  // delegatable: nothing hard or tight in or out among active projects
  const coupled = new Set<string>();
  for (const p of active)
    for (const d of p.dependsOn) {
      const dep = byId.get(d.on);
      if (d.kind === "loose" || !dep || !activeStage(dep.stage)) continue;
      coupled.add(p.id);
      coupled.add(d.on);
    }
  const delegatable = active
    .filter((p) => !coupled.has(p.id) && !["xl", "l"].includes(p.size ?? "m") && p.stage !== "paused")
    .map((p) => p.id);

  // stream load per week
  const load: Analysis["load"] = {};
  const overload: Analysis["overload"] = [];
  for (const stream of config.roadmap.streams) {
    const items = active.filter(
      (p) => p.stream === stream.id && p.span && (p.span.resolution === "day" || p.span.resolution === "month") && p.stage !== "paused",
    );
    if (!items.length) continue;
    const from = weekStart(items.reduce((m, p) => (p.span!.start < m ? p.span!.start : m), items[0].span!.start));
    const to = items.reduce((m, p) => (p.span!.end > m ? p.span!.end : m), items[0].span!.end);
    const weeks: { week: string; load: number; projects: string[] }[] = [];
    for (let w = from; w <= to; w = addDays(w, 7)) {
      const wEnd = addDays(w, 6);
      let sum = 0;
      const who: string[] = [];
      for (const p of items) {
        const s = p.span!;
        if (s.end < w || s.start > wEnd) continue;
        const weeksLong = Math.max(1, (daysBetween(s.start, s.end) + 1) / 7);
        sum += (sizeWeeks[p.size ?? "m"] ?? 2) / weeksLong;
        who.push(p.id);
      }
      weeks.push({ week: w, load: Math.round(sum * 100) / 100, projects: who });
    }
    load[stream.id] = weeks.map(({ week, load }) => ({ week, load }));
    let run: (typeof overload)[number] | null = null;
    for (const wk of weeks) {
      if (wk.load > stream.capacity + 0.01) {
        if (!run) run = { stream: stream.id, from: wk.week, to: addDays(wk.week, 6), peak: wk.load, capacity: stream.capacity, projects: [] };
        run.to = addDays(wk.week, 6);
        run.peak = Math.max(run.peak, wk.load);
        for (const p of wk.projects) if (!run.projects.includes(p)) run.projects.push(p);
      } else if (run) {
        overload.push(run);
        run = null;
      }
    }
    if (run) overload.push(run);
  }

  const unscheduled = active
    .filter((p) => !p.span && (p.priority === "urgent" || p.priority === "high") && p.stage !== "paused")
    .map((p) => p.id);

  // built is not out in the world: built projects that are not launched yet. Only with a profile
  // (the onboarding), without one a company workspace's rollout stages say enough.
  const doneMeans = config.profile?.doneMeans;
  const bar = reachIndex(!doneMeans || doneMeans === "never" ? "launched" : doneMeans);
  const notOut = config.profile
    ? projects.filter((p) => ["rollout", "measuring", "done"].includes(p.stage) && reachIndex(p.reach) < bar).map((p) => p.id)
    : [];
  const inProgress = projects.filter((p) => ["exploring", "prototyping", "kickoff", "scoped", "building", "rollout"].includes(p.stage)).map((p) => p.id);
  const focus = config.profile?.focus;
  const unfocused = focus && inProgress.length > focus ? { active: inProgress, focus } : null;

  return { conflicts, cycles, bottlenecks, delegatable, overload, unscheduled, notOut, unfocused, load };
}
