import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addVote, deck, elo, rank, START, type PulseDay } from "./pulse.ts";
import { loadPulse, savePulseVote } from "./pulse-files.ts";

const ids = ["a", "b", "c", "d"];
const day = (voter: string, date: string, votes: PulseDay["votes"]): PulseDay => ({ voter, date, votes });

describe("pulse", () => {
  test("a higher tier beats a lower one, the same tier is a draw", () => {
    const r = elo([day("Anna", "2026-10-01", { a: "top", b: "high", c: "high", d: "drop" })], ids);
    expect(r.get("a")!).toBeGreaterThan(r.get("b")!);
    expect(r.get("b")).toBe(r.get("c"));
    expect(r.get("d")!).toBeLessThan(START);
    // zero-sum
    expect([...r.values()].reduce((x, y) => x + y, 0)).toBeCloseTo(START * 4);
  });

  test("one day moves a project by at most about K, however many cards it had", () => {
    const r = elo([day("Anna", "2026-10-01", { a: "top", b: "drop", c: "drop", d: "drop" })], ids);
    expect(r.get("a")! - START).toBeLessThanOrEqual(16.01);
  });

  test("recent days count more than old ones", () => {
    const old = Array.from({ length: 5 }, (_, i) => day("Anna", `2026-09-0${i + 1}`, { a: "top", b: "drop" }));
    const now = Array.from({ length: 5 }, (_, i) => day("Anna", `2026-10-0${i + 1}`, { a: "drop", b: "top" }));
    const r = elo([...now, ...old], ["a", "b"]);
    expect(r.get("b")!).toBeGreaterThan(r.get("a")!);
  });

  test("ranking: tally, trend, split, just me", () => {
    const days = [
      day("Anna", "2026-10-01", { a: "top", b: "drop" }),
      day("Ben", "2026-10-18", { a: "drop", b: "top", c: "high" }),
      day("Cleo", "2026-10-18", { a: "top", c: "low" }),
    ];
    const r = rank(days, ids, { today: "2026-10-19" });
    const a = r.find((x) => x.id === "a")!;
    expect(a.tally).toEqual({ top: 2, high: 0, low: 0, drop: 1 });
    expect(a.split).toBe(true);
    expect(r.find((x) => x.id === "d")!.votes).toBe(0);
    // Anna voted more than a week ago, the others this week
    expect(r.find((x) => x.id === "b")!.delta).toBeGreaterThan(0);
    expect(rank(days, ids, { today: "2026-10-19", voter: "anna" })[0].id).toBe("a");
  });

  test("the daily deck: the least rated first, done when the day is full", () => {
    const days = [day("Anna", "2026-10-18", { a: "top", b: "high" })];
    expect(deck(days, ids, "Anna", "2026-10-19", 2).cards).toEqual(expect.arrayContaining(["c", "d"]));
    const after = addVote(addVote(days, "Anna", "2026-10-19", "c", "low"), "Anna", "2026-10-19", "d", "top");
    expect(deck(after, ids, "anna", "2026-10-19", 2)).toEqual({ cards: [], done: ["c", "d"] });
    // the same deck all day
    expect(deck(days, ids, "Ben", "2026-10-19", 3)).toEqual(deck(days, ids, "Ben", "2026-10-19", 3));
  });

  test("one yaml file per person and day", () => {
    const root = mkdtempSync(join(tmpdir(), "omgp-pulse-"));
    savePulseVote(root, "Anna Ö", "2026-10-19", "a", "top");
    savePulseVote(root, "Anna Ö", "2026-10-19", "b", "low");
    savePulseVote(root, "Anna Ö", "2026-10-19", "a", null);
    expect(readFileSync(join(root, "pulse/2026-10-19/anna-o.yaml"), "utf8")).toContain("b: low");
    expect(loadPulse(root)).toEqual([{ voter: "Anna Ö", date: "2026-10-19", votes: { b: "low" } }]);
  });
});
