import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addDuel, elo, inPulse, mayDuel, nextPair, rank, START, type Duel, type PulseDay } from "./pulse.ts";
import { loadPulse, savePulseDuel } from "./pulse-files.ts";

const ids = ["a", "b", "c", "d"];
const day = (voter: string, date: string, duels: [string, string][]): PulseDay => ({ voter, date, duels: duels.map(([win, over]) => ({ win, over })) });

describe("pulse", () => {
  test("a duel is an Elo match", () => {
    const r = elo([day("Anna", "2026-10-01", [["a", "b"]])], ids);
    expect(r.get("a")).toBe(START + 16);
    expect(r.get("b")).toBe(START - 16);
    expect(r.get("c")).toBe(START);
  });

  test("beating the top from the bottom is a big jump, beating the bottom is a small one", () => {
    // a wins everything, d loses everything: top and bottom of the barrel
    const climb = Array.from({ length: 40 }, (_, i): [string, string] => (i % 2 ? ["a", "c"] : ["b", "d"]));
    const base = day("Anna", "2026-10-01", climb);
    const before = elo([base], ids);
    const upset = elo([base, day("Ben", "2026-10-02", [["d", "a"]])], ids);
    const expected = elo([base, day("Ben", "2026-10-02", [["a", "d"]])], ids);
    const jump = upset.get("d")! - before.get("d")!;
    const step = expected.get("a")! - before.get("a")!;
    expect(jump).toBeGreaterThan(20);
    expect(jump).toBeGreaterThan(step * 3);
  });

  test("recent days count more than old ones", () => {
    const old = Array.from({ length: 5 }, (_, i) => day("Anna", `2026-09-0${i + 1}`, [["a", "b"]]));
    const now = Array.from({ length: 5 }, (_, i) => day("Anna", `2026-10-0${i + 1}`, [["b", "a"]]));
    const r = elo([...now, ...old], ["a", "b"]);
    expect(r.get("b")!).toBeGreaterThan(r.get("a")!);
  });

  test("ranking: wins, trend, split, just me", () => {
    const days = [
      day("Anna", "2026-10-01", [["a", "b"], ["a", "c"]]),
      day("Ben", "2026-10-18", [["b", "a"], ["c", "a"]]),
      day("Cleo", "2026-10-18", [["a", "b"], ["a", "c"]]),
    ];
    const r = rank(days, ids, { today: "2026-10-19" });
    const a = r.find((x) => x.id === "a")!;
    expect([a.wins, a.losses]).toEqual([4, 2]);
    expect(a.split).toBe(true);
    expect(r.find((x) => x.id === "d")!.wins + r.find((x) => x.id === "d")!.losses).toBe(0);
    expect(r.find((x) => x.id === "d")!.delta).toBe(0);
    expect(rank(days, ids, { today: "2026-10-19", voter: "ben" })[0].id).not.toBe("a");
  });

  test("next pair: the least compared first, no pair twice, stable within the day", () => {
    const days = [day("Anna", "2026-10-19", [["a", "b"]])];
    const p = nextPair(days, ids, "Anna", "2026-10-19")!;
    expect(p.some((x) => x === "c" || x === "d")).toBe(true);
    expect(nextPair(days, ids, "anna", "2026-10-19")).toEqual(p);
    // all pairs decided: nothing left
    const all: [string, string][] = [["a", "b"], ["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"], ["c", "d"]];
    expect(nextPair([day("Anna", "2026-10-19", all)], ids, "Anna", "2026-10-19")).toBeNull();
    expect(nextPair([], ["a"], "Anna", "2026-10-19")).toBeNull();
  });

  test("a round is a mix: nobody comes back within ten duels", () => {
    const many = Array.from({ length: 40 }, (_, i) => `p${i}`);
    // five projects nobody compared yet must not take over the round
    let days = [day("Anna", "2026-10-18", many.slice(5).map((id, i): [string, string] => [id, many[5 + ((i + 1) % 35)]]))];
    const shown: string[] = [];
    for (let i = 0; i < 10; i++) {
      const p = nextPair(days, many, "Anna", "2026-10-19")!;
      shown.push(...p);
      days = addDuel(days, "Anna", "2026-10-19", { win: p[0], over: p[1] });
    }
    expect(new Set(shown).size).toBe(20);
  });

  test("keep going is on unless the workspace turns it off", () => {
    const days = [day("Anna", "2026-10-19", [["a", "b"], ["c", "d"]])];
    expect(mayDuel(days, "Anna", "2026-10-19", { daily: 2 })).toBe(true);
    expect(mayDuel(days, "Anna", "2026-10-19", { daily: 2, more: false })).toBe(false);
    expect(mayDuel(days, "Ben", "2026-10-19", { daily: 2, more: false })).toBe(true);
  });

  test("undo takes back the last call on that pair", () => {
    const d: Duel = { win: "a", over: "b" };
    const days = addDuel(addDuel([], "Anna", "2026-10-19", d), "Anna", "2026-10-19", { win: "c", over: "d" });
    expect(addDuel(days, "Anna", "2026-10-19", { win: "b", over: "a" }, true)[0].duels).toEqual([{ win: "c", over: "d" }]);
  });

  test("one yaml file per person and day", () => {
    const root = mkdtempSync(join(tmpdir(), "omgp-pulse-"));
    savePulseDuel(root, "Anna Ö", "2026-10-19", { win: "a", over: "b" });
    savePulseDuel(root, "Anna Ö", "2026-10-19", { win: "c", over: "a" });
    savePulseDuel(root, "Anna Ö", "2026-10-19", { win: "a", over: "b" }, true);
    expect(readFileSync(join(root, "pulse/2026-10-19/anna-o.yaml"), "utf8")).toContain("win: c");
    expect(loadPulse(root)).toEqual([{ voter: "Anna Ö", date: "2026-10-19", duels: [{ win: "c", over: "a" }] }]);
  });
});

describe("done means out in the world", () => {
  test("a built project stays in the pulse until it is as far out as done means", () => {
    expect(inPulse({ stage: "done" })).toBe(false);
    expect(inPulse({ stage: "done", reach: "released" }, "launched")).toBe(true);
    expect(inPulse({ stage: "done", reach: "customers" }, "launched")).toBe(false);
    // nothing is ever done: after the build come launch, marketing, customers, improving
    expect(inPulse({ stage: "done", reach: "improving" }, "never")).toBe(true);
    expect(inPulse({ stage: "paused" }, "launched")).toBe(true);
    expect(inPulse({ stage: "dropped" }, "released")).toBe(false);
  });
});
