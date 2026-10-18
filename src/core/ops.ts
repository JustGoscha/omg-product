import type { AnnotationT, ResultsT, StepResultT } from "./schema.ts";

// Pure result updates, shared by the server and the studio (optimistic updates).

export type ResultOp =
  | { op: "step"; step: string; patch: Partial<StepResultT> | null }
  | { op: "vote"; step: string; voter: string; value: string | null }
  | { op: "current"; step: string }
  | { op: "annotate"; annotation: AnnotationT }
  | { op: "unannotate"; id: string }
  | { op: "reset" };

export function applyOp(r: ResultsT, op: ResultOp, now = new Date().toISOString()): ResultsT {
  const next: ResultsT = JSON.parse(JSON.stringify(r));
  next.startedAt ??= now;
  next.updatedAt = now;
  switch (op.op) {
    case "step": {
      if (op.patch === null) {
        delete next.steps[op.step];
        break;
      }
      const prev = next.steps[op.step] ?? {};
      const merged: StepResultT = { ...prev, ...op.patch, at: now };
      for (const k of Object.keys(merged) as (keyof StepResultT)[])
        if (merged[k] === undefined || merged[k] === null || merged[k] === "") delete merged[k];
      next.steps[op.step] = merged;
      break;
    }
    case "vote": {
      const prev = next.steps[op.step] ?? {};
      const votes = { ...(prev.votes ?? {}) };
      if (op.value === null) delete votes[op.voter];
      else votes[op.voter] = op.value;
      next.steps[op.step] = { ...prev, votes };
      break;
    }
    case "current":
      next.current = op.step;
      break;
    case "annotate": {
      const i = next.annotations.findIndex((a) => a.id === op.annotation.id);
      const a = { ...op.annotation, at: op.annotation.at ?? now };
      if (i >= 0) next.annotations[i] = a;
      else next.annotations.push(a);
      break;
    }
    case "unannotate":
      next.annotations = next.annotations.filter((a) => a.id !== op.id);
      break;
    case "reset":
      return { session: r.session, steps: {}, annotations: [] };
  }
  return next;
}
