import type { ProjectInfo } from "./types";

// The lifecycle in four phases, each with its own color:
// discover (blue) → align (amber) → deliver (green) → learn (violet).
export const STAGES = ["idea", "exploring", "prototyping", "kickoff", "scoped", "building", "rollout", "measuring", "done"] as const;
export type Stage = (typeof STAGES)[number];

const phase: Record<Stage, { color: string; soft: string }> = {
  idea: { color: "#3a7bc8", soft: "#deebf8" },
  exploring: { color: "#3a7bc8", soft: "#deebf8" },
  prototyping: { color: "#3a7bc8", soft: "#deebf8" },
  kickoff: { color: "#c98a00", soft: "#fff0c2" },
  scoped: { color: "#c98a00", soft: "#fff0c2" },
  building: { color: "#2f8a5b", soft: "#dcf1e5" },
  rollout: { color: "#2f8a5b", soft: "#dcf1e5" },
  measuring: { color: "#7a4fc4", soft: "#ece4fa" },
  done: { color: "#7a4fc4", soft: "#ece4fa" },
};

export const stageColor = (s: string) => phase[s as Stage]?.color ?? "#8a8f96";
export const stageSoft = (s: string) => phase[s as Stage]?.soft ?? "#ebedef";

/** What the files show for a stage, so a tick means something. */
export function evidence(p: ProjectInfo, s: Stage): string | null {
  const has = (k: string) => Object.keys(p.sections).some((x) => x.startsWith(k));
  switch (s) {
    case "exploring":
      return has("problem") || has("metric") ? [has("problem") && "Problem", has("metric") && "Metric"].filter(Boolean).join(" · ") : null;
    case "prototyping":
      return p.prototypes.length ? `${p.prototypes.length} prototype${p.prototypes.length > 1 ? "s" : ""}` : null;
    case "kickoff": {
      const k = p.sessions.filter((x) => x.kind === "kickoff" || x.kind === "exploration");
      if (!k.length) return null;
      return k.map((x) => `${x.answered}/${x.steps}`).join(" · ");
    }
    case "scoped":
      return p.handoff ? "handoff.md" : null;
    case "measuring": {
      const m = p.metrics.find((x) => x.current);
      return m ? `${m.current} / ${m.target ?? "?"}` : null;
    }
    default:
      return null;
  }
}
