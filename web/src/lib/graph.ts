import { Graph, layout } from "@dagrejs/dagre";

export interface GNode {
  id: string;
  width: number;
  height: number;
}
export interface GEdge {
  key: string;
  from: string;
  to: string;
  labelWidth?: number;
  labelHeight?: number;
}
export interface Placed {
  nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  edges: Map<string, { points: { x: number; y: number }[]; label?: { x: number; y: number } }>;
  width: number;
  height: number;
}

export function layoutGraph(
  nodes: GNode[],
  edges: GEdge[],
  opts: { rankdir?: "LR" | "TB"; nodesep?: number; ranksep?: number; edgesep?: number } = {},
): Placed {
  const g = new Graph({ multigraph: true, directed: true });
  g.setGraph({
    rankdir: opts.rankdir ?? "LR",
    nodesep: opts.nodesep ?? 36,
    ranksep: opts.ranksep ?? 64,
    edgesep: opts.edgesep ?? 18,
    marginx: 16,
    marginy: 16,
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: n.width, height: n.height });
  const ids = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) continue;
    g.setEdge(e.from, e.to, { width: e.labelWidth ?? 0, height: e.labelHeight ?? 0, labelpos: "c" }, e.key);
  }
  layout(g);
  const out: Placed = { nodes: new Map(), edges: new Map(), width: 0, height: 0 };
  for (const n of nodes) {
    const p = g.node(n.id) as { x: number; y: number; width: number; height: number };
    out.nodes.set(n.id, { x: p.x, y: p.y, width: n.width, height: n.height });
  }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) continue;
    const ed = g.edge(e.from, e.to, e.key) as { points: { x: number; y: number }[]; x?: number; y?: number };
    if (!ed) continue;
    out.edges.set(e.key, { points: ed.points, label: ed.x != null && ed.y != null ? { x: ed.x, y: ed.y } : undefined });
  }
  const gl = g.graph() as { width?: number; height?: number };
  out.width = gl.width ?? 0;
  out.height = gl.height ?? 0;
  return out;
}

/** Smooth path through dagre's points. */
export function curve(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length < 3) return `M${points[0].x},${points[0].y} L${points[points.length - 1].x},${points[points.length - 1].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q${points[i].x},${points[i].y} ${i === points.length - 2 ? points[i + 1].x : mx},${i === points.length - 2 ? points[i + 1].y : my}`;
  }
  return d;
}

let ctx: CanvasRenderingContext2D | null = null;
/** Text width in px for layout. */
export function measure(text: string, font = "600 14px 'Atkinson Hyperlegible Next Variable', system-ui") {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 7.5;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** Break text into lines that fit a width. */
export function wrap(text: string, maxWidth: number, font?: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (measure(next, font) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
