import type { FlowVisualT, MatrixVisualT, SequenceVisualT, StatesVisualT, TablesVisualT, VisualT } from "./types";

// Visual diffs: merge a base visual into a target visual of the same type and mark
// every element as added / removed / changed / same. Removed elements are kept as
// ghosts so the reader sees what goes away.

export type Diff = "added" | "removed" | "changed" | "same";
type D<T> = T & { diff?: Diff };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function keyed<T>(items: T[], key: (t: T) => string) {
  const out = new Map<string, T>();
  const count = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    const n = count.get(k) ?? 0;
    count.set(k, n + 1);
    out.set(n ? `${k}#${n}` : k, it);
  }
  return out;
}

function mergeLists<T extends object>(base: T[], target: T[], key: (t: T) => string, eq: (a: T, b: T) => boolean): D<T>[] {
  const b = keyed(base, key);
  const t = keyed(target, key);
  const out: D<T>[] = [];
  for (const [k, item] of t) {
    const old = b.get(k);
    out.push({ ...item, diff: !old ? "added" : eq(old, item) ? "same" : "changed" });
  }
  for (const [k, item] of b) if (!t.has(k)) out.push({ ...item, diff: "removed" });
  return out;
}

export type StatesDiffT = Omit<StatesVisualT, "states" | "transitions"> & {
  states: D<StatesVisualT["states"][number]>[];
  transitions: D<StatesVisualT["transitions"][number]>[];
};
export type TablesDiffT = Omit<TablesVisualT, "tables"> & {
  tables: (D<Omit<TablesVisualT["tables"][number], "columns">> & { columns: D<TablesVisualT["tables"][number]["columns"][number]>[] })[];
};
export type FlowDiffT = Omit<FlowVisualT, "nodes" | "edges"> & {
  nodes: D<FlowVisualT["nodes"][number]>[];
  edges: D<FlowVisualT["edges"][number]>[];
};
export type SequenceDiffT = Omit<SequenceVisualT, "messages"> & { messages: D<SequenceVisualT["messages"][number]>[] };

export function diffStates(base: StatesVisualT, target: StatesVisualT): StatesDiffT {
  return {
    ...target,
    states: mergeLists(base.states, target.states, (s) => s.id, (a, b) => same([a.label, a.kind], [b.label, b.kind])),
    transitions: mergeLists(base.transitions, target.transitions, (t) => `${t.from}>${t.to}`, (a, b) => same([a.label, a.by], [b.label, b.by])),
  };
}

export function diffTables(base: TablesVisualT, target: TablesVisualT): TablesDiffT {
  const bt = new Map(base.tables.map((t) => [t.name, t]));
  const tt = new Map(target.tables.map((t) => [t.name, t]));
  const tables: TablesDiffT["tables"] = [];
  const colEq = (a: TablesVisualT["tables"][number]["columns"][number], b: typeof a) =>
    same([a.type, a.pk, a.fk, a.nullable], [b.type, b.pk, b.fk, b.nullable]);
  for (const t of target.tables) {
    const old = bt.get(t.name);
    if (!old) tables.push({ ...t, diff: "added", columns: t.columns.map((c) => ({ ...c, diff: "added" as Diff })) });
    else {
      const columns = mergeLists(old.columns, t.columns, (c) => c.name, colEq);
      tables.push({ ...t, diff: columns.some((c) => c.diff !== "same") ? "changed" : "same", columns });
    }
  }
  for (const t of base.tables)
    if (!tt.has(t.name)) tables.push({ ...t, diff: "removed", columns: t.columns.map((c) => ({ ...c, diff: "removed" as Diff })) });
  return { ...target, tables };
}

export function diffFlow(base: FlowVisualT, target: FlowVisualT): FlowDiffT {
  return {
    ...target,
    nodes: mergeLists(base.nodes, target.nodes, (n) => n.id, (a, b) => same([a.label, a.sub, a.kind], [b.label, b.sub, b.kind])),
    edges: mergeLists(base.edges, target.edges, (e) => `${e.from}>${e.to}`, (a, b) => same([a.label, a.dashed], [b.label, b.dashed])),
  };
}

export function diffSequence(base: SequenceVisualT, target: SequenceVisualT): SequenceDiffT {
  const key = (m: SequenceVisualT["messages"][number]) => `${m.from}>${m.to}:${m.label ?? ""}`;
  const baseKeys = new Set(base.messages.map(key));
  const targetKeys = new Set(target.messages.map(key));
  const messages: SequenceDiffT["messages"] = [];
  // walk both lists so removed messages stay near where they were
  let bi = 0;
  for (const m of target.messages) {
    while (bi < base.messages.length && !targetKeys.has(key(base.messages[bi]))) messages.push({ ...base.messages[bi++], diff: "removed" });
    if (bi < base.messages.length && key(base.messages[bi]) === key(m)) bi++;
    messages.push({ ...m, diff: baseKeys.has(key(m)) ? "same" : "added" });
  }
  while (bi < base.messages.length) {
    const m = base.messages[bi++];
    if (!targetKeys.has(key(m))) messages.push({ ...m, diff: "removed" });
  }
  const actors = [...target.actors, ...base.actors.filter((a) => !target.actors.includes(a))];
  return { ...target, actors, messages };
}

export function diffMatrix(base: MatrixVisualT, target: MatrixVisualT): MatrixVisualT & { changed: Set<string> } {
  const changed = new Set<string>();
  const baseRows = new Map(base.rows.map((r) => [String(r[0]), r]));
  for (const row of target.rows) {
    const old = baseRows.get(String(row[0]));
    target.columns.forEach((col, ci) => {
      const bci = base.columns.indexOf(col);
      if (!old || bci < 0 || !same(old[bci + 1], row[ci + 1])) changed.add(`${row[0]}|${col}`);
    });
  }
  return { ...target, changed };
}

/** True when two visuals can be diffed. */
export const diffable = (a?: VisualT, b?: VisualT) =>
  !!a && !!b && a.type === b.type && ["states", "tables", "flow", "sequence", "matrix"].includes(a.type);

export function diffVisual(base: VisualT, target: VisualT): VisualT {
  if (base.type === "states" && target.type === "states") return diffStates(base, target) as unknown as VisualT;
  if (base.type === "tables" && target.type === "tables") return diffTables(base, target) as unknown as VisualT;
  if (base.type === "flow" && target.type === "flow") return diffFlow(base, target) as unknown as VisualT;
  if (base.type === "sequence" && target.type === "sequence") return diffSequence(base, target) as unknown as VisualT;
  if (base.type === "matrix" && target.type === "matrix") return diffMatrix(base, target) as unknown as VisualT;
  return target;
}

export function diffCounts(v: VisualT): { added: number; removed: number; changed: number } {
  const c = { added: 0, removed: 0, changed: 0 };
  const tally = (items: { diff?: Diff }[]) => {
    for (const i of items) if (i.diff && i.diff !== "same") c[i.diff]++;
  };
  const x = v as unknown as Record<string, { diff?: Diff }[]>;
  if (v.type === "states") (tally(x.states), tally(x.transitions));
  if (v.type === "flow") (tally(x.nodes), tally(x.edges));
  if (v.type === "sequence") tally(x.messages);
  if (v.type === "tables")
    for (const t of (v as unknown as TablesDiffT).tables) {
      if (t.diff === "added" || t.diff === "removed") c[t.diff]++;
      else tally(t.columns);
    }
  return c;
}
