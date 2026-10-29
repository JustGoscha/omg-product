// What a swipe on a triage card means. Directions: up, right, down, left.
// Solutions and features get a priority, problems a severity, assumptions are checked.
export const triageScales = ["priority", "severity", "frequency", "agreement"] as const;
export type TriageScale = (typeof triageScales)[number];

export const scaleValues: Record<TriageScale, readonly [string, string, string, string]> = {
  priority: ["must", "should", "nice", "no"],
  severity: ["critical", "noticeable", "minor", "none"],
  frequency: ["daily", "weekly", "rarely", "never"],
  agreement: ["yes", "rather", "unsure", "no"],
};

/** How a checkpoint closes a part of the meeting. */
export const checkpointValues = ["agreed", "concerns", "not-yet"] as const;

/** Direction slot of a stored value (also used for colors): up | right | down | left. */
export const slots = ["up", "right", "down", "left"] as const;
export type Slot = (typeof slots)[number];
export const slotOf = (scale: TriageScale, value?: string): Slot | null => {
  const i = value ? scaleValues[scale].indexOf(value) : -1;
  return i >= 0 ? slots[i] : null;
};
