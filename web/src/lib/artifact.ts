// Hosted as a claude.ai Artifact, the page's own shared database replaces the server for the
// pulse: one document per person, pulse/<user id> = { days: { "<date>": Duel[] } }. Everyone
// reads all of them, each person writes only their own (see ARTIFACT_CAPABILITIES).
// Anywhere else (the GitHub Pages demo, a saved file) `claude.use` is missing or resolves null,
// and the static export keeps working as before.
import { addDuel, markUnclear, type Duel, type PulseDay } from "../../../src/core/pulse";

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

type Stored = { days?: Record<string, Duel[]>; unclear?: Record<string, string[]> };
const toDays = (voter: string, body: Stored | undefined): PulseDay[] => {
  const dates = new Set([...Object.keys(body?.days ?? {}), ...Object.keys(body?.unclear ?? {})]);
  return [...dates].map((date) => {
    const duels = body?.days?.[date];
    const unclear = body?.unclear?.[date];
    return { voter, date, duels: Array.isArray(duels) ? duels : [], ...(Array.isArray(unclear) && unclear.length ? { unclear } : {}) };
  });
};
const toStored = (days: PulseDay[]): Stored => ({
  days: Object.fromEntries(days.filter((d) => d.duels.length).map((d) => [d.date, d.duels.map((x) => (x.neither ? { win: x.win, over: x.over, neither: true } : { win: x.win, over: x.over }))])),
  unclear: Object.fromEntries(days.filter((d) => d.unclear?.length).map((d) => [d.date, d.unclear!])),
});

export async function artifactPulse(db: Db): Promise<PulseDay[]> {
  const snap = await db.collection("pulse").get();
  return snap.docs.flatMap((d) => (d.exists ? toDays(d.id, d.data() as Stored) : []));
}

/** one duel by the viewer: read their own document, add it, write it back */
export async function artifactDuel(db: Db, me: string, date: string, duel: Duel, undo = false): Promise<PulseDay[]> {
  return changeMine(db, me, (days) => addDuel(days, me, date, duel, undo));
}

/** "I don't get it" on one project, by the viewer */
export function artifactUnclear(db: Db, me: string, date: string, project: string, undo = false) {
  return changeMine(db, me, (days) => markUnclear(days, me, date, project, undo));
}

async function changeMine(db: Db, me: string, change: (days: PulseDay[]) => PulseDay[]) {
  const ref = db.doc(`pulse/${me}`);
  const mine = await ref.get();
  await ref.set(toStored(change(toDays(me, mine.exists ? (mine.data() as Stored) : undefined))));
  return artifactPulse(db);
}
