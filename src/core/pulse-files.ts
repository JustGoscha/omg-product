import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { listDir, parseYaml, writeText, yamlStringify } from "./files.ts";
import { addDuel, isDuel, OUT_OF_PULSE, voterSlug, type Duel, type PulseDay } from "./pulse.ts";
import type { Workspace } from "./workspace.ts";

// pulse/<YYYY-MM-DD>/<voter>.yaml, one file per person and day, the duels in order:
//
//   voter: Anna
//   date: 2026-10-19
//   duels:
//     - { win: offline-sync, over: csv-import }
//     - { win: customer-portal, over: job-templates }

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function loadPulse(root: string): PulseDay[] {
  const days: PulseDay[] = [];
  for (const date of listDir(join(root, "pulse"))) {
    if (!DATE.test(date)) continue;
    for (const file of listDir(join(root, "pulse", date))) {
      if (!file.endsWith(".yaml")) continue;
      try {
        const raw = parseYaml(readFileSync(join(root, "pulse", date, file), "utf8")) as { voter?: unknown; duels?: unknown } | null;
        const duels = (Array.isArray(raw?.duels) ? raw.duels : []).filter(isDuel).map((d) => ({ win: d.win, over: d.over }));
        days.push({ voter: String(raw?.voter ?? file.replace(/\.yaml$/, "")), date, duels });
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
  const day = addDuel(before, voter, date, duel, undo)[0];
  if (!day) return rmSync(path, { force: true });
  writeText(path, yamlStringify({ voter: day.voter, date, duels: day.duels }));
}

/** Projects that are in the pulse: everything that is not done or dropped. */
export const pulseProjects = (ws: Workspace) => ws.projects.filter((p) => !OUT_OF_PULSE.has(p.stage ?? "idea")).map((p) => p.id);
