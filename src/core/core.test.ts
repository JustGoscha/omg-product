import { describe, expect, test } from "bun:test";
import { checkpointScope } from "./checkpoint.ts";
import { markUnclear, unclearCounts } from "./pulse.ts";
import { problemSolution } from "../cli/linear.ts";
import { join } from "node:path";
import { parseTime, resolveSpan } from "./time.ts";
import { analyze } from "./analysis.ts";
import { applyOp } from "./ops.ts";
import { loadWorkspace } from "./workspace.ts";
import { compileHandoff } from "./handoff.ts";
import type { ProductConfigT, ResultsT } from "./schema.ts";

describe("time values", () => {
  test("sharp to fuzzy", () => {
    expect(parseTime("2026-10-26")).toEqual({ start: "2026-10-26", end: "2026-10-26", resolution: "day" });
    expect(parseTime("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28", resolution: "month" });
    expect(parseTime("2027-Q1")).toEqual({ start: "2027-01-01", end: "2027-03-31", resolution: "quarter" });
    expect(parseTime("2027-H2")).toEqual({ start: "2027-07-01", end: "2027-12-31", resolution: "half" });
    expect(parseTime(2028)).toEqual({ start: "2028-01-01", end: "2028-12-31", resolution: "year" });
    expect(parseTime("2026-02-30")).toBeNull();
    expect(parseTime("soon")).toBeNull();
  });

  test("end derived from size", () => {
    expect(resolveSpan({ start: "2026-10-05" }, "s")).toEqual({ start: "2026-10-05", end: "2026-10-11", resolution: "day", derived: true, derivedSide: "end" });
    expect(resolveSpan({ end: "2026-10-30", from: "linear" }, "s")).toMatchObject({ start: "2026-10-24", derivedSide: "start", from: "linear" });
    expect(resolveSpan({ start: "2026-10", end: "2026-Q4" })?.resolution).toBe("quarter");
  });
});

const config: ProductConfigT = { name: "t", locale: "en", roadmap: { streams: [{ id: "s", name: "S", capacity: 1 }] } };
const p = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  stage: "scoped",
  priority: "medium",
  size: "m",
  stream: "s",
  span: null,
  dependsOn: [] as { on: string; kind: string }[],
  ...extra,
});

describe("roadmap analysis", () => {
  test("hard dependency that ends after the dependent starts is a conflict", () => {
    const a = analyze({
      today: "2026-10-01",
      config,
      projects: [
        p("infra", { span: { start: "2026-10-01", end: "2026-10-20", resolution: "day" } }),
        p("inbox", { span: { start: "2026-10-10", end: "2026-10-30", resolution: "day" }, dependsOn: [{ on: "infra", kind: "hard" }] }),
      ],
    });
    expect(a.conflicts.map((c) => c.project)).toEqual(["inbox"]);
    expect(a.delegatable).toEqual([]);
  });

  test("bottlenecks, cycles, delegatable and overload", () => {
    const span = { start: "2026-10-05", end: "2026-10-18", resolution: "day" as const };
    const a = analyze({
      today: "2026-10-01",
      config,
      projects: [
        p("core", { span }),
        p("x", { span, dependsOn: [{ on: "core", kind: "hard" }] }),
        p("y", { dependsOn: [{ on: "core", kind: "tight" }] }),
        p("loop-a", { dependsOn: [{ on: "loop-b", kind: "hard" }] }),
        p("loop-b", { dependsOn: [{ on: "loop-a", kind: "hard" }] }),
        p("solo", { priority: "high" }),
      ],
    });
    expect(a.bottlenecks[0]).toEqual({ project: "core", dependents: ["x", "y"] });
    expect(a.cycles.length).toBe(1);
    expect(a.delegatable).toEqual(["solo"]);
    expect(a.unscheduled).toEqual(["solo"]);
    // core and x both run 2 weeks with 2 person-weeks each → load 2 on capacity 1
    expect(a.overload[0]).toMatchObject({ stream: "s", peak: 2, capacity: 1 });
  });
});

describe("results ops", () => {
  const empty: ResultsT = { session: "k", steps: {}, annotations: [] };
  test("patch merges and drops empty fields", () => {
    let r = applyOp(empty, { op: "step", step: "d1", patch: { status: "decided", value: "a", note: "hi" } }, "t1");
    r = applyOp(r, { op: "step", step: "d1", patch: { note: "" } }, "t2");
    expect(r.steps.d1).toEqual({ status: "decided", value: "a", at: "t2" });
    expect(r.startedAt).toBe("t1");
  });
  test("votes per person", () => {
    let r = applyOp(empty, { op: "vote", step: "p", voter: "Ana", value: "yes" });
    r = applyOp(r, { op: "vote", step: "p", voter: "Ben", value: "no" });
    r = applyOp(r, { op: "vote", step: "p", voter: "Ana", value: null });
    expect(r.steps.p.votes).toEqual({ Ben: "no" });
  });
  test("works on proxies (the studio passes reactive state)", () => {
    const proxied = new Proxy(structuredClone(empty), {});
    expect(() => applyOp(proxied, { op: "current", step: "x" })).not.toThrow();
  });
});

describe("example workspace", () => {
  const root = join(import.meta.dir, "../../examples/acme");
  test("loads without errors", () => {
    const ws = loadWorkspace(root);
    expect(ws.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(ws.projects.find((x) => x.id === "recurring-jobs")?.sessions[0].steps).toBeGreaterThan(10);
  });
  test("handoff lists open decisions with their recommendation", () => {
    const ws = loadWorkspace(root);
    const md = compileHandoff(ws, ws.projects.find((x) => x.id === "recurring-jobs")!);
    expect(md).toContain("# Handoff: Recurring maintenance jobs");
    expect(md).toContain("Can a dispatcher change a whole series later?");
  });
});

describe("editing files in place", () => {
  const { mkdtempSync, cpSync, readFileSync, writeFileSync } = require("node:fs") as typeof import("node:fs");
  const { tmpdir } = require("node:os") as typeof import("node:os");
  const copy = () => {
    const dir = mkdtempSync(join(tmpdir(), "omgp-"));
    cpSync(join(import.meta.dir, "../../examples/acme"), dir, { recursive: true });
    return dir;
  };
  const changed = (a: string, b: string) => {
    const x = a.split("\n"), y = b.split("\n");
    let n = 0;
    for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) n++;
    return n;
  };

  test("a step edit changes only that line, and stale edits are refused", async () => {
    const { patchStep } = await import("./session-edit.ts");
    const root = copy();
    const file = join(root, "projects/recurring-jobs/sessions/kickoff.yaml");
    const before = readFileSync(file, "utf8");
    patchStep(root, "recurring-jobs", "kickoff", "d-series-change", ["options", "@rule", "label"], "Store the rule, please", "Store the rule");
    expect(changed(before, readFileSync(file, "utf8"))).toBe(1);
    expect(() => patchStep(root, "recurring-jobs", "kickoff", "d-series-change", ["title"], "x", "not the title")).toThrow();
    expect(loadWorkspace(root).issues.filter((i) => i.level === "error")).toEqual([]);
  });

  test("a brief section can be replaced or added", async () => {
    const { replaceSection } = await import("./comments.ts");
    const root = copy();
    const file = join(root, "projects/csv-import/project.md");
    replaceSection(file, "Metric", "Onboarding time: 2 days → 1 hour.", "Onboarding time per customer: 2 days → 2 hours.");
    replaceSection(file, "Done when", "First customer imported without help.");
    const md = readFileSync(file, "utf8");
    expect(md).toContain("## Metric\nOnboarding time: 2 days → 1 hour.");
    expect(md).toContain("## Done when\nFirst customer imported without help.");
    expect(md.startsWith("---\nid: csv-import")).toBe(true);
    writeFileSync(file, md);
  });

  test("comment threads: add, reply, resolve", async () => {
    const { applyCommentOp } = await import("./comment-ops.ts");
    let doc = applyCommentOp({ threads: [] }, { op: "add", id: "t1", target: { kind: "file", file: "project.md" }, text: "Why?", author: "Ana" });
    doc = applyCommentOp(doc, { op: "reply", thread: "t1", id: "c2", text: "Because.", author: "agent", agent: true });
    doc = applyCommentOp(doc, { op: "resolve", thread: "t1", by: "agent" });
    expect(doc.threads[0].comments.length).toBe(2);
    expect(doc.threads[0].status).toBe("resolved");
  });
});

test("a checkpoint sums up its part of the meeting", () => {
  const steps = [
    { step: { type: "slide" }, section: "a" },
    { step: { type: "triage" }, section: "a" },
    { step: { type: "checkpoint" }, section: "a" },
    { step: { type: "choice" }, section: "b" },
    { step: { type: "triage" }, section: "b" },
    { step: { type: "checkpoint" }, section: "b" },
    { step: { type: "checkpoint", of: ["a", "b"] }, section: "c" },
  ];
  expect(checkpointScope(steps, 2)).toEqual([1]);
  expect(checkpointScope(steps, 5)).toEqual([3, 4]);
  expect(checkpointScope(steps, 6)).toEqual([1, 3, 4]);
  expect(checkpointScope(steps, 1)).toEqual([]);
});

test("'I don't get it' counts each person once and can be taken back", () => {
  let days = markUnclear([], "Ana", "2026-10-29", "a");
  days = markUnclear(days, "Ana", "2026-10-30", "a");
  days = markUnclear(days, "Ben", "2026-10-29", "a");
  days = markUnclear(days, "Ben", "2026-10-29", "b");
  expect(unclearCounts(days).get("a")).toBe(2);
  days = markUnclear(days, "Ben", "2026-10-29", "a", true);
  expect(unclearCounts(days).get("a")).toBe(1);
  expect(unclearCounts(days).get("b")).toBe(1);
});

test("Problem and Solution are taken from a Linear description", () => {
  const md = "Kurz worum es geht.\n\n## Problem\nPLs finden Mails nicht.\n\n**Lösung:**\nEine Adresse pro Projekt.\n\n### Scope\nNur Stufe 1.";
  expect(problemSolution(md)).toEqual({ problem: "PLs finden Mails nicht.", solution: "Eine Adresse pro Projekt." });
  expect(problemSolution("just text")).toEqual({});
});
