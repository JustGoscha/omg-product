// Pulse: what people feel matters most, from duels. Two projects at a time, "which one is
// more important?", in short rounds a person can stop after. Choosing between two forces the
// trade-off that rating each project alone never does: alone, everything is important.
// No node imports here: the studio ranks in the browser, the CLI and server on disk.
//
// Every duel is an Elo match, applied in date order, so what people say now moves the ranking
// more than what they said a month ago. Opponents are random, so a project from the bottom
// meets the top now and then, and beating it makes a big jump.

export const START = 1500;
export const K = 32;
/** duels per round */
export const DAILY = 5;
/**
 * How far a project is out in the world, apart from how far it is built (stage). Built is
 * not done: after it come the release, the launch, marketing, the first customers and
 * improving what is out.
 */
export const reaches = ["unreleased", "ready", "released", "launched", "marketing", "customers", "improving"] as const;
export type Reach = (typeof reaches)[number];
export const reachIndex = (r: string | undefined) => Math.max(0, reaches.indexOf((r ?? "unreleased") as Reach));

/**
 * Is a project in the pulse? Dropped ones are not. Done ones only while they are not yet as
 * far out as `doneMeans`; with `never` (or no doneMeans) done never means out of the pulse,
 * unless nothing says otherwise: without a profile, done is done. Paused ones stay: revive or
 * drop is the question.
 */
export function inPulse(p: { stage?: string; reach?: string }, doneMeans?: string) {
  if (p.stage === "dropped") return false;
  if (p.stage !== "done") return true;
  if (!doneMeans) return false;
  if (doneMeans === "never") return true;
  return reachIndex(p.reach) < reachIndex(doneMeans);
}

/**
 * One call on two projects: `win` matters more than `over`. With `neither`, neither matters
 * right now: both lose against an average project (START), so both drop, the higher one more.
 * In the file: { win, over } or { neither: [a, b] }.
 */
export interface Duel {
  win: string;
  over: string;
  neither?: boolean;
}

/** One person's duels on one day, in order: pulse/<date>/<voter>.yaml */
export interface PulseDay {
  voter: string;
  date: string;
  duels: Duel[];
}

export interface Ranked {
  id: string;
  rating: number;
  /** change over the last 7 days of duels */
  delta: number;
  wins: number;
  losses: number;
  /** people disagree: pairs with this project were decided both ways */
  split: boolean;
}

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
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const isDuel = (d: unknown): d is Duel =>
  !!d && typeof (d as Duel).win === "string" && typeof (d as Duel).over === "string" && (d as Duel).win !== (d as Duel).over;

/** Elo ratings after every duel of `days`, in date order. An upset moves both by up to k. */
export function elo(days: PulseDay[], ids: string[], k = K): Map<string, number> {
  const r = new Map(ids.map((id) => [id, START]));
  const expect = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));
  for (const day of [...days].sort(byDate))
    for (const { win, over, neither } of day.duels) {
      if (!r.has(win) || !r.has(over)) continue;
      if (neither) {
        // both lose to an average project
        const [a, b] = [r.get(win)!, r.get(over)!];
        r.set(win, a - k * expect(a, START));
        r.set(over, b - k * expect(b, START));
        continue;
      }
      const expected = 1 / (1 + 10 ** ((r.get(over)! - r.get(win)!) / 400));
      r.set(win, r.get(win)! + k * (1 - expected));
      r.set(over, r.get(over)! - k * (1 - expected));
    }
  return r;
}

/** The ranking, best first. `voter` limits it to one person's duels ("just me"). */
export function rank(days: PulseDay[], ids: string[], opts: { today?: string; voter?: string; k?: number } = {}): Ranked[] {
  const mine = opts.voter ? days.filter((d) => voterSlug(d.voter) === voterSlug(opts.voter!)) : days;
  const today = opts.today ?? localDate();
  const now = elo(mine, ids, opts.k);
  const weekAgo = elo(
    mine.filter((d) => d.date <= daysBefore(today, 7)),
    ids,
    opts.k,
  );
  // the latest call of each person on each pair; a pair is contested when people call it both ways
  const calls = new Map<string, Map<string, string>>();
  for (const d of [...mine].sort(byDate))
    for (const { win, over, neither } of d.duels) {
      if (neither) continue;
      const key = pairKey(win, over);
      if (!calls.has(key)) calls.set(key, new Map());
      calls.get(key)!.set(voterSlug(d.voter), win);
    }
  const contested = new Map<string, number>();
  for (const [key, who] of calls) {
    const winners = [...who.values()];
    const [a] = key.split("|");
    const share = winners.filter((w) => w === a).length / winners.length;
    if (winners.length >= 2 && Math.min(share, 1 - share) >= 0.3)
      for (const id of key.split("|")) contested.set(id, (contested.get(id) ?? 0) + 1);
  }
  return ids
    .map((id) => {
      let wins = 0;
      let losses = 0;
      for (const d of mine)
        for (const x of d.duels) {
          if (x.win === id && !x.neither) wins++;
          if (x.over === id || (x.neither && x.win === id)) losses++;
        }
      return {
        id,
        rating: Math.round(now.get(id)!),
        delta: Math.round(now.get(id)! - weekAgo.get(id)!),
        wins,
        losses,
        split: (contested.get(id) ?? 0) >= 2,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.wins + b.losses - (a.wins + a.losses) || a.id.localeCompare(b.id));
}

/**
 * The next duel for one person: a project from the least compared third (never compared
 * before anything else) against a random one. Nobody comes back within `fresh` duels, so a
 * round is a mix and not the same few projects catching up, and no pair is decided twice
 * while there are others. Random opponents, not close ones: the bottom meets the top now and then.
 */
export function nextPair(days: PulseDay[], ids: string[], voter: string, today: string, skipped: string[] = [], fresh = 10): [string, string] | null {
  if (ids.length < 2) return null;
  const me = voterSlug(voter);
  const seen = new Map<string, number>();
  const decided = new Set<string>(skipped);
  const todays: string[] = [];
  for (const d of [...days].sort(byDate)) {
    if (voterSlug(d.voter) !== me) continue;
    for (const { win, over } of d.duels) {
      seen.set(win, (seen.get(win) ?? 0) + 1);
      seen.set(over, (seen.get(over) ?? 0) + 1);
      decided.add(pairKey(win, over));
      if (d.date === today) todays.push(win, over);
    }
  }
  const n = todays.length / 2 + skipped.length;
  const recent = new Set([...todays.slice(-2 * Math.min(fresh, Math.floor((ids.length - 2) / 2))), ...skipped.slice(-fresh).flatMap((k) => k.split("|"))]);
  const roll = (id: string) => hash(`${today}:${me}:${n}:${id}`);
  const open = (a: string) => ids.filter((b) => b !== a && !decided.has(pairKey(a, b)));
  const firsts = ids.filter((a) => open(a).length);
  if (!firsts.length) return null;
  const rested = firsts.filter((a) => !recent.has(a));
  const pool = (rested.length ? rested : firsts).sort((a, b) => (seen.get(a) ?? 0) - (seen.get(b) ?? 0) || roll(a) - roll(b));
  // the least compared third, at least a handful, so coverage stays fair without clustering
  const least = pool.slice(0, Math.max(5, Math.ceil(pool.length / 3)));
  const first = least.sort((a, b) => roll(a) - roll(b))[0];
  const opponents = open(first);
  const second = (opponents.some((b) => !recent.has(b)) ? opponents.filter((b) => !recent.has(b)) : opponents).sort((a, b) => roll(a) - roll(b))[0];
  // which one is shown first is random too, so the first card has no advantage
  return roll(first + second) % 2 ? [first, second] : [second, first];
}

/** How many duels this person decided today. */
export const duelsToday = (days: PulseDay[], voter: string, today: string) =>
  days.find((d) => d.date === today && voterSlug(d.voter) === voterSlug(voter))?.duels.length ?? 0;

/** May this person decide another duel today? Only limited when the workspace turns "keep going" off. */
export const mayDuel = (days: PulseDay[], voter: string, today: string, cfg: { daily?: number; more?: boolean } = {}) =>
  cfg.more !== false || duelsToday(days, voter, today) < (cfg.daily ?? DAILY);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Record a duel, or with `undo` take back the last call on that pair that day. */
export function addDuel(days: PulseDay[], voter: string, date: string, duel: Duel, undo = false): PulseDay[] {
  const i = days.findIndex((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter));
  const day: PulseDay = i >= 0 ? { ...days[i], duels: [...days[i].duels] } : { voter, date, duels: [] };
  if (undo) {
    const key = pairKey(duel.win, duel.over);
    const j = day.duels.findLastIndex((d) => pairKey(d.win, d.over) === key);
    if (j >= 0) day.duels.splice(j, 1);
  } else day.duels.push(duel.neither ? { win: duel.win, over: duel.over, neither: true } : { win: duel.win, over: duel.over });
  const rest = days.filter((_, j) => j !== i);
  return day.duels.length ? [...rest, day] : rest;
}
