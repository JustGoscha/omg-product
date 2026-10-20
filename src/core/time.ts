// Time values go from sharp to fuzzy: 2026-10-26 · 2026-11 · 2026-Q1 · 2027-H1 · 2027.

export type Resolution = "day" | "month" | "quarter" | "half" | "year";

export interface Range {
  start: string; // ISO date, inclusive
  end: string; // ISO date, inclusive
  resolution: Resolution;
}

export interface Span extends Range {
  derived?: boolean; // one side computed from size
  derivedSide?: "start" | "end";
  from?: "linear" | "manual" | "estimate";
}

const order: Resolution[] = ["day", "month", "quarter", "half", "year"];
export const coarser = (a: Resolution, b: Resolution) =>
  order.indexOf(a) >= order.indexOf(b) ? a : b;

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
export const addDays = (s: string, n: number) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
const lastDayOfMonth = (y: number, m: number) => iso(new Date(Date.UTC(y, m, 0))); // m is 1-based

export function parseTime(value: string | number | undefined | null): Range | null {
  if (value == null) return null;
  const v = String(value).trim();
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    const d = toDate(v);
    if (Number.isNaN(d.getTime()) || iso(d) !== v) return null;
    return { start: v, end: v, resolution: "day" };
  }
  if ((m = v.match(/^(\d{4})-(\d{2})$/))) {
    const y = +m[1], mo = +m[2];
    if (mo < 1 || mo > 12) return null;
    return { start: `${y}-${pad(mo)}-01`, end: lastDayOfMonth(y, mo), resolution: "month" };
  }
  if ((m = v.match(/^(\d{4})-?Q([1-4])$/i))) {
    const y = +m[1], q = +m[2];
    const first = (q - 1) * 3 + 1;
    return { start: `${y}-${pad(first)}-01`, end: lastDayOfMonth(y, first + 2), resolution: "quarter" };
  }
  if ((m = v.match(/^(\d{4})-?H([12])$/i))) {
    const y = +m[1], h = +m[2];
    return h === 1
      ? { start: `${y}-01-01`, end: `${y}-06-30`, resolution: "half" }
      : { start: `${y}-07-01`, end: `${y}-12-31`, resolution: "half" };
  }
  if ((m = v.match(/^(\d{4})$/))) return { start: `${m[1]}-01-01`, end: `${m[1]}-12-31`, resolution: "year" };
  return null;
}

export const sizeWeeks: Record<string, number> = { xs: 0.5, s: 1, m: 2, l: 4, xl: 8 };

export function resolveSpan(
  when: { start?: string; end?: string; from?: Span["from"] } | undefined,
  size?: string,
): Span | null {
  if (!when) return null;
  const s = parseTime(when.start);
  const e = parseTime(when.end);
  const from = when.from;
  if (!s && !e) return null;
  if (s && e) return { start: s.start, end: e.end, resolution: coarser(s.resolution, e.resolution), from };
  if (s) {
    if (s.resolution !== "day") return { ...s, from };
    const days = Math.max(1, Math.round((sizeWeeks[size ?? "m"] ?? 2) * 7) - 1);
    return { start: s.start, end: addDays(s.start, days), resolution: "day", derived: true, derivedSide: "end", from };
  }
  // only an end: assume it runs for its size before that
  const days = Math.max(1, Math.round((sizeWeeks[size ?? "m"] ?? 2) * 7) - 1);
  return { start: addDays(e!.end, -days), end: e!.end, resolution: e!.resolution, derived: true, derivedSide: "start", from };
}

/** Monday of the ISO week containing the date. */
export function weekStart(s: string) {
  const d = toDate(s);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return iso(d);
}

export function todayIso(override?: string) {
  if (override) {
    const r = parseTime(override);
    if (r) return r.start;
  }
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
