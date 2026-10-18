// A checkpoint closes a part of the meeting. It sums up the sections it names,
// or else every step since the previous checkpoint (slides don't count).

interface Placed {
  step: { type: string; of?: string[] };
  section: string;
}

/** Indices of the steps the checkpoint at `at` sums up. */
export function checkpointScope(steps: Placed[], at: number): number[] {
  const cp = steps[at]?.step;
  if (!cp || cp.type !== "checkpoint") return [];
  const counts = (s: Placed) => !["slide", "checkpoint", "broken"].includes(s.step.type);
  if (cp.of?.length) return steps.flatMap((s, i) => (cp.of!.includes(s.section) && counts(s) ? [i] : []));
  const out: number[] = [];
  for (let i = at - 1; i >= 0 && steps[i].step.type !== "checkpoint"; i--) if (counts(steps[i])) out.unshift(i);
  return out;
}
