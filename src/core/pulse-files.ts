import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { listDir, parseYaml, writeText, yamlStringify } from "./files.ts";
import { addDuel, inPulse, isDuel, markUnclear, voterSlug, type Duel, type PulseDay } from "./pulse.ts";
import type { Workspace } from "./workspace.ts";

// pulse/<YYYY-MM-DD>/<voter>.yaml, one file per person and day, the duels in order:
//
//   voter: Anna
//   date: 2026-10-19
//   duels:
//     - { win: offline-sync, over: csv-import }
//     - { win: customer-portal, over: job-templates }
//     - { neither: [csv-import, job-templates] }    neither matters right now: both drop

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const fromFile = (d: unknown): unknown => {
  const n = (d as { neither?: unknown })?.neither;
  return Array.isArray(n) && n.length === 2 ? { win: String(n[0]), over: String(n[1]), neither: true } : d && { win: (d as Duel).win, over: (d as Duel).over };
};

export function loadPulse(root: string): PulseDay[] {
  const days: PulseDay[] = [];
  for (const date of listDir(join(root, "pulse"))) {
    if (!DATE.test(date)) continue;
    for (const file of listDir(join(root, "pulse", date))) {
      if (!file.endsWith(".yaml")) continue;
      try {
        const raw = parseYaml(readFileSync(join(root, "pulse", date, file), "utf8")) as { voter?: unknown; duels?: unknown } | null;
        const duels = (Array.isArray(raw?.duels) ? raw.duels : []).map(fromFile).filter(isDuel);
        const u = (raw as { unclear?: unknown })?.unclear;
        const unclear = Array.isArray(u) ? u.map(String) : [];
        days.push({ voter: String(raw?.voter ?? file.replace(/\.yaml$/, "")), date, duels, ...(unclear.length ? { unclear } : {}) });
      } catch {
        /* a broken file counts as no duels */
      }
    }
  }
  return days;
}

export function savePulseDuel(root: string, voter: string, date: string, duel: Duel, undo = false) {
  if (!DATE.test(date)) throw new Error("date must be YYYY-MM-DD");
  if (!isDuel(duel)) throw new Error("a duel is { win, over } with two different projects");
  const path = join(root, "pulse", date, `${voterSlug(voter)}.yaml`);
  const before = existsSync(path) ? loadPulse(root).filter((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter)) : [];
  writeDay(path, addDuel(before, voter, date, duel, undo)[0], date);
}

export function savePulseUnclear(root: string, voter: string, date: string, project: string, undo = false) {
  if (!DATE.test(date)) throw new Error("date must be YYYY-MM-DD");
  const path = join(root, "pulse", date, `${voterSlug(voter)}.yaml`);
  const before = existsSync(path) ? loadPulse(root).filter((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter)) : [];
  writeDay(path, markUnclear(before, voter, date, project, undo)[0], date);
}

function writeDay(path: string, day: PulseDay | undefined, date: string) {
  if (!day) return rmSync(path, { force: true });
  writeText(
    path,
    yamlStringify({
      voter: day.voter,
      date,
      duels: day.duels.map((d) => (d.neither ? { neither: [d.win, d.over] } : { win: d.win, over: d.over })),
      ...(day.unclear?.length ? { unclear: day.unclear } : {}),
    }),
  );
}

/** Projects that are in the pulse (see inPulse). */
export const pulseProjects = (ws: Workspace) => ws.projects.filter((p) => inPulse(p, ws.config.profile?.doneMeans)).map((p) => p.id);
