import { join } from "node:path";
import { writeText } from "./files.ts";
import { loadResults } from "./workspace.ts";
import type { ResultsT } from "./schema.ts";
import { applyOp, type ResultOp } from "./ops.ts";

export type { ResultOp };

export function resultsPath(root: string, project: string, session: string) {
  return join(root, `projects/${project}/sessions/${session}.results.json`);
}

export function updateResults(root: string, project: string, session: string, op: ResultOp): ResultsT {
  const next = applyOp(loadResults(root, project, session), op);
  writeText(resultsPath(root, project, session), JSON.stringify(next, null, 2) + "\n");
  return next;
}
