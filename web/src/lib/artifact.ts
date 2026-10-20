// Hosted as a claude.ai Artifact, the page's own shared database replaces the server for the
// pulse: one document per person, pulse/<user id> = { days: { "<date>": Duel[] } }. Everyone
// reads all of them, each person writes only their own (see ARTIFACT_CAPABILITIES).
// Anywhere else (the GitHub Pages demo, a saved file) `claude.use` is missing or resolves null,
// and the static export keeps working as before.
import { addDuel, type Duel, type PulseDay } from "../../../src/core/pulse";

/** What `omgp export --artifact` declares when it publishes the page. */
export const ARTIFACT_CAPABILITIES = {
  db: { rules: [{ path: "pulse", read: "view", write: "owner" }, { path: "pulse/{self}", write: "interact" }] },
  user: {},
};

type Snap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type Db = {
  collection(path: string): { get(): Promise<{ docs: Snap[] }> };
  doc(path: string): { get(): Promise<Snap>; set(data: Record<string, unknown>): Promise<void> };
};
type User = { id(): Promise<string | null> };
type Host = { use(name: string): Promise<unknown> };

const host = (): Host | undefined => (typeof window !== "undefined" ? (window as unknown as { claude?: Host }).claude : undefined);
let dbP: Promise<Db | null> | null = null;
let meP: Promise<string | null> | null = null;
export const artifactDb = () => (dbP ??= (host()?.use("db") as Promise<Db | null> | undefined)?.catch(() => null) ?? Promise.resolve(null));
/** The viewer's opaque id on this page, the voter in the pulse. */
export const artifactMe = () =>
  (meP ??= (async () => {
    const u = (await (host()?.use("user") as Promise<User | null> | undefined)?.catch(() => null)) ?? null;
    return u ? await u.id().catch(() => null) : null;
  })());

type Stored = { days?: Record<string, Duel[]> };
const toDays = (voter: string, body: Stored | undefined): PulseDay[] =>
  Object.entries(body?.days ?? {}).map(([date, duels]) => ({ voter, date, duels: Array.isArray(duels) ? duels : [] }));

export async function artifactPulse(db: Db): Promise<PulseDay[]> {
  const snap = await db.collection("pulse").get();
  return snap.docs.flatMap((d) => (d.exists ? toDays(d.id, d.data() as Stored) : []));
}

/** one duel by the viewer: read their own document, add it, write it back */
export async function artifactDuel(db: Db, me: string, date: string, duel: Duel, undo = false): Promise<PulseDay[]> {
  const ref = db.doc(`pulse/${me}`);
  const mine = await ref.get();
  const days = toDays(me, mine.exists ? (mine.data() as Stored) : undefined);
  const next = addDuel(days.filter((d) => d.date === date), me, date, duel, undo)[0];
  const all: Record<string, Duel[]> = Object.fromEntries(days.filter((d) => d.date !== date).map((d) => [d.date, d.duels]));
  if (next?.duels.length) all[date] = next.duels.map((d) => (d.neither ? { win: d.win, over: d.over, neither: true } : { win: d.win, over: d.over }));
  await ref.set({ days: all });
  return artifactPulse(db);
}
