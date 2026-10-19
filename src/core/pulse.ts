// Pulse: what people feel is most important, one short swipe deck a day.
// No node imports here: the studio ranks in the browser, the CLI and server on disk.
//
// Every person rates up to `daily` projects a day: ↑ top, → high, ↓ low, ← drop. One
// person's day becomes Elo matches between the projects they rated: a higher tier beats a
// lower one, the same tier is a draw. Days are applied in date order, so what people say
// now moves the ranking more than what they said a month ago.

export const tiers = ["top", "high", "low", "drop"] as const;
export type Tier = (typeof tiers)[number];
const points: Record<Tier, number> = { top: 3, high: 2, low: 1, drop: 0 };

export const START = 1500;
export const K = 32;
export const DAILY = 10;
// projects nobody needs to rate any more (paused ones stay: revive or drop is the question)
export const OUT_OF_PULSE = new Set(["done", "dropped"]);

/** One person's swipes on one day: pulse/<date>/<voter>.yaml */
export interface PulseDay {
  voter: string;
  date: string;
  votes: Record<string, Tier>;
}

export interface Ranked {
  id: string;
  rating: number;
  /** change over the last 7 days of votes */
  delta: number;
  /** how many times it was rated */
  votes: number;
  /** ratings per tier */
  tally: Record<Tier, number>;
  /** people disagree: the tiers given are far apart */
  split: boolean;
}

export const isTier = (v: unknown): v is Tier => typeof v === "string" && (tiers as readonly string[]).includes(v);
export const voterSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "anonymous";
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysBefore = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - n);
  return localDate(d);
};

const byDate = (a: PulseDay, b: PulseDay) => a.date.localeCompare(b.date) || a.voter.localeCompare(b.voter);

/** Elo ratings after applying `days` in date order. Each day moves a project by at most about K. */
export function elo(days: PulseDay[], ids: string[], k = K): Map<string, number> {
  const r = new Map(ids.map((id) => [id, START]));
  for (const day of [...days].sort(byDate)) {
    const rated = Object.entries(day.votes).filter(([id, t]) => r.has(id) && isTier(t));
    if (rated.length < 2) continue;
    // all matches of a day are scored against the ratings from before it, so the order of
    // the swipes doesn't matter; k is shared between a project's matches of that day
    const kk = k / (rated.length - 1);
    const before = new Map(rated.map(([id]) => [id, r.get(id)!]));
    for (const [a, ta] of rated) {
      let change = 0;
      for (const [b, tb] of rated) {
        if (a === b) continue;
        const expected = 1 / (1 + 10 ** ((before.get(b)! - before.get(a)!) / 400));
        const score = points[ta] > points[tb] ? 1 : points[ta] < points[tb] ? 0 : 0.5;
        change += kk * (score - expected);
      }
      r.set(a, before.get(a)! + change);
    }
  }
  return r;
}

/** The ranking, best first. `voter` limits it to one person's votes ("just me"). */
export function rank(days: PulseDay[], ids: string[], opts: { today?: string; voter?: string; k?: number } = {}): Ranked[] {
  const mine = opts.voter ? days.filter((d) => voterSlug(d.voter) === voterSlug(opts.voter!)) : days;
  const today = opts.today ?? localDate();
  const now = elo(mine, ids, opts.k);
  const weekAgo = elo(
    mine.filter((d) => d.date <= daysBefore(today, 7)),
    ids,
    opts.k,
  );
  return ids
    .map((id) => {
      const tally: Record<Tier, number> = { top: 0, high: 0, low: 0, drop: 0 };
      // the latest tier per person counts for the spread, older ones are history
      const latest = new Map<string, Tier>();
      for (const d of [...mine].sort(byDate)) {
        const t = d.votes[id];
        if (!isTier(t)) continue;
        tally[t]++;
        latest.set(voterSlug(d.voter), t);
      }
      const pts = [...latest.values()].map((t) => points[t]);
      const votes = tiers.reduce((n, t) => n + tally[t], 0);
      return {
        id,
        rating: Math.round(now.get(id)!),
        delta: Math.round(now.get(id)! - weekAgo.get(id)!),
        votes,
        tally,
        split: pts.length >= 3 && Math.max(...pts) - Math.min(...pts) >= 3 && spread(pts) >= 1.1,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.votes - a.votes || a.id.localeCompare(b.id));
}

function spread(xs: number[]) {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

/**
 * Today's cards for one person: projects they rated least come first, then those
 * everybody rated least, then a shuffle that stays the same all day. Projects a person
 * never rated are always in the deck, so the first deck has everything and a new
 * project shows up the next time; `daily` limits the deck after that.
 */
export function deck(days: PulseDay[], ids: string[], voter: string, today: string, daily = DAILY): { cards: string[]; done: string[] } {
  const me = voterSlug(voter);
  const done = Object.keys(days.find((d) => d.date === today && voterSlug(d.voter) === me)?.votes ?? {}).filter((id) => ids.includes(id));
  const mineCount = new Map<string, number>();
  const allCount = new Map<string, number>();
  for (const d of days)
    for (const id of Object.keys(d.votes)) {
      allCount.set(id, (allCount.get(id) ?? 0) + 1);
      if (voterSlug(d.voter) === me) mineCount.set(id, (mineCount.get(id) ?? 0) + 1);
    }
  const never = ids.filter((id) => !mineCount.has(id)).length;
  const left = Math.max(0, Math.min(daily, ids.length) - done.length, never);
  const cards = ids
    .filter((id) => !done.includes(id))
    .map((id) => ({ id, mine: mineCount.get(id) ?? 0, all: allCount.get(id) ?? 0, shuffle: hash(`${today}:${me}:${id}`) }))
    .sort((a, b) => a.mine - b.mine || a.all - b.all || a.shuffle - b.shuffle)
    .slice(0, left)
    .map((c) => c.id);
  return { cards, done };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Record one swipe in a list of days (the browser's copy, or before writing the file). */
export function addVote(days: PulseDay[], voter: string, date: string, project: string, tier: Tier | null): PulseDay[] {
  const i = days.findIndex((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter));
  const day: PulseDay = i >= 0 ? { ...days[i], votes: { ...days[i].votes } } : { voter, date, votes: {} };
  if (tier) day.votes[project] = tier;
  else delete day.votes[project];
  const rest = days.filter((_, j) => j !== i);
  return Object.keys(day.votes).length ? [...rest, day] : rest;
}
