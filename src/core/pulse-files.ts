import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listDir, parseYaml, writeText, yamlStringify } from "./files.ts";
import { addVote, isTier, OUT_OF_PULSE, voterSlug, type PulseDay, type Tier } from "./pulse.ts";
import type { Workspace } from "./workspace.ts";

// pulse/<YYYY-MM-DD>/<voter>.yaml, one file per person and day:
//
//   voter: Anna
//   date: 2026-10-19
//   votes: { offline-sync: top, csv-import: low }

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function loadPulse(root: string): PulseDay[] {
  const days: PulseDay[] = [];
  for (const date of listDir(join(root, "pulse"))) {
    if (!DATE.test(date)) continue;
    for (const file of listDir(join(root, "pulse", date))) {
      if (!file.endsWith(".yaml")) continue;
      try {
        const raw = parseYaml(readFileSync(join(root, "pulse", date, file), "utf8")) as Partial<PulseDay> | null;
        const votes = Object.fromEntries(Object.entries(raw?.votes ?? {}).filter(([, t]) => isTier(t))) as Record<string, Tier>;
        days.push({ voter: String(raw?.voter ?? file.replace(/\.yaml$/, "")), date, votes });
      } catch {
        /* a broken file counts as no votes; omgp validate reports YAML errors elsewhere */
      }
    }
  }
  return days;
}

export function savePulseVote(root: string, voter: string, date: string, project: string, tier: Tier | null) {
  if (!DATE.test(date)) throw new Error("date must be YYYY-MM-DD");
  if (tier !== null && !isTier(tier)) throw new Error(`tier must be one of top, high, low, drop`);
  const path = join(root, "pulse", date, `${voterSlug(voter)}.yaml`);
  const before = existsSync(path) ? loadPulse(root).filter((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter)) : [];
  const day = addVote(before, voter, date, project, tier)[0] ?? { voter, date, votes: {} };
  writeText(path, yamlStringify({ voter: day.voter, date, votes: day.votes }));
  return day;
}

/** Projects that are in the pulse: everything that is not done or dropped. */
export const pulseProjects = (ws: Workspace) => ws.projects.filter((p) => !OUT_OF_PULSE.has(p.stage ?? "idea")).map((p) => p.id);
