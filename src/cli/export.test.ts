import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportStatic, writeSnapshots } from "./export.ts";

const acme = join(import.meta.dir, "..", "..", "examples", "acme");
const tmp = mkdtempSync(join(tmpdir(), "omgp-export-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));

test("static export: a snapshot per GET endpoint, no agent", () => {
  const out = join(tmp, "snap");
  const r = writeSnapshots(acme, out);
  expect(r.workspace).toBe("Acme Field");
  expect(r.sessions).toBe(1);

  const ws = json(join(out, "api/workspace.json"));
  expect(ws.root).toBe("acme");
  expect(ws.projects.find((p: { id: string }) => p.id === "recurring-jobs").sessions[0].id).toBe("kickoff");

  const s = json(join(out, "api/session/recurring-jobs/kickoff.json"));
  expect(s.session.id).toBe("kickoff");
  expect(s.results.steps).toEqual({});
  expect(s.requests).toEqual([]);

  expect(json(join(out, "api/comments/_root.json"))).toEqual({ threads: [] });
  expect(json(join(out, "api/comments/recurring-jobs.json"))).toEqual({ threads: [] });
  expect(json(join(out, "api/agent.json"))).toEqual({ configured: null, heartbeat: null, requests: [] });
});

test("static export: prototypes get the annotate layer with a relative path", () => {
  const out = join(tmp, "snap");
  const html = readFileSync(join(out, "files/projects/recurring-jobs/prototypes/series.html"), "utf8");
  expect(html).toContain(`<script src="../../../../omgp-layer/annotate.js"></script></body>`);
  expect(html.match(/annotate\.js/g)?.length).toBe(1);
  expect(existsSync(join(out, "omgp-layer/annotate.js"))).toBe(true);
  // other files as they are, so prototypes find their brand css
  expect(readFileSync(join(out, "files/brand/tokens.css"), "utf8")).toBe(readFileSync(join(acme, "brand/tokens.css"), "utf8"));
});

test("static export never replaces a folder it did not write", () => {
  const out = join(tmp, "mine");
  mkdirSync(out);
  writeFileSync(join(out, "notes.txt"), "keep me");
  expect(() => exportStatic(acme, out)).toThrow(/not empty/);
  expect(readFileSync(join(out, "notes.txt"), "utf8")).toBe("keep me");
  expect(() => exportStatic(acme, join(acme, ".."))).toThrow(/would replace the workspace/);
});
