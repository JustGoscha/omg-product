<script lang="ts">
  import { curve, layoutGraph, measure } from "../lib/graph";
  import { fonts, FONT_CODE, FONT_LABEL } from "../lib/fonts.svelte";
  import type { TablesDiffT } from "../lib/diff";
  import { store } from "../lib/store.svelte";

  let { visual, compact = false }: { visual: TablesDiffT; compact?: boolean } = $props();
  const ROW = 24;
  const right = (c: { pk?: boolean; fk?: string; type?: string; nullable?: boolean }) =>
    `${c.pk ? "PK " : ""}${c.fk ? `→ ${c.fk} ` : ""}${c.type ?? ""}${c.nullable ? "?" : ""}`;
  const HEAD = 34;

  const laid = $derived.by(() => {
    void fonts.ready;
    const boxes = visual.tables.map((t) => {
      const nameW = measure(t.name, FONT_LABEL) + 28;
      const colW = Math.max(0, ...t.columns.map((c) => measure(c.name, FONT_CODE) + measure(right(c), "700 12px system-ui") + 44));
      const w = Math.max(170, Math.min(420, Math.max(nameW, colW)));
      const h = HEAD + t.columns.length * ROW + 8 + (t.note ? 18 : 0);
      return { t, w, h };
    });
    const names = new Set(visual.tables.map((t) => t.name));
    const edges: { key: string; from: string; to: string; col: string }[] = [];
    for (const t of visual.tables)
      for (const c of t.columns) {
        const target = c.fk?.split(".")[0];
        if (target && names.has(target) && target !== t.name) edges.push({ key: `${t.name}.${c.name}`, from: t.name, to: target, col: c.name });
      }
    const g = layoutGraph(
      boxes.map((b) => ({ id: b.t.name, width: b.w, height: b.h })),
      edges,
      { rankdir: "LR", ranksep: 60, nodesep: 26 },
    );
    return { boxes, edges, g };
  });

  const rowFill = (d?: string) =>
    d === "added" ? "var(--added-soft)" : d === "removed" ? "var(--removed-soft)" : d === "changed" ? "var(--changed-soft)" : "transparent";
  const tag = (d?: string) => (d === "added" ? store.t.diffAdded : d === "removed" ? store.t.diffRemoved : d === "changed" ? store.t.diffChanged : "");
</script>

<svg class="diagram" viewBox="-8 -16 {laid.g.width + 16} {laid.g.height + 30}" style="max-width:{(laid.g.width + 16) * 1.6}px;{compact ? "" : `min-width:${Math.round((laid.g.width + 16) * 0.8)}px`}" role="img" aria-label={visual.caption ?? "Database tables"}>
  {#each laid.edges as e (e.key)}
    {@const p = laid.g.edges.get(e.key)}
    {#if p}
      <path class="edge" d={curve(p.points)} style="stroke:var(--ink-3)" />
      <circle cx={p.points[p.points.length - 1].x} cy={p.points[p.points.length - 1].y} r="3.5" fill="var(--ink-3)" />
    {/if}
  {/each}

  {#each laid.boxes as b (b.t.name)}
    {@const p = laid.g.nodes.get(b.t.name)}
    {#if p}
      <g class="node {b.t.diff === 'added' || b.t.diff === 'removed' ? b.t.diff : ''}" transform="translate({p.x - b.w / 2},{p.y - b.h / 2})">
        <rect width={b.w} height={b.h} rx="10" />
        <g data-el="table:{b.t.name}" data-label={b.t.name}><path d="M0,10 a10,10 0 0 1 10,-10 h{b.w - 20} a10,10 0 0 1 10,10 v{HEAD - 10} h-{b.w} z" style="fill:{b.t.diff === 'added' ? 'var(--added)' : b.t.diff === 'removed' ? 'var(--removed)' : 'var(--ink)'};stroke:none" />
        <text class="label" x="14" y="22" style="fill:#fff;font-family:var(--font-code);font-size:13.5px">{b.t.name}</text></g>
        {#if b.t.diff && b.t.diff !== "same"}
          <text x={b.w - 12} y="21" text-anchor="end" style="font-size:11px;font-weight:700;fill:{b.t.diff === 'changed' ? 'var(--beacon)' : '#fff'}">{tag(b.t.diff)}</text>
        {/if}
        {#each b.t.columns as c, i}
          {@const y = HEAD + 4 + i * ROW}
          <g data-el="column:{b.t.name}.{c.name}" data-label="{b.t.name}.{c.name}">
          <rect class="rowbg" x="1.5" y={y} width={b.w - 3} height={ROW} rx="0" style="fill:{rowFill(c.diff)};stroke:none" />
          {#if c.diff && c.diff !== "same"}
            <rect x="1.5" y={y} width="3" height={ROW} style="fill:var(--{c.diff});stroke:none" />
          {/if}
          <text x="14" y={y + 16} class="code" style="font-weight:{c.pk ? 700 : 500};{c.diff === 'removed' ? 'text-decoration:line-through;' : ''}">{c.name}</text>
          <text x={b.w - 12} y={y + 16} text-anchor="end" class="small">
            {#if c.pk}<tspan style="fill:var(--must);font-weight:700">PK </tspan>{/if}{#if c.fk}<tspan style="fill:var(--nice);font-weight:700">→ {c.fk} </tspan>{/if}{c.type ?? ""}{c.nullable ? "?" : ""}
          </text>
          </g>
        {/each}
        {#if b.t.note}
          <text x="14" y={b.h - 8} class="small" style="font-style:italic">{b.t.note}</text>
        {/if}
      </g>
    {/if}
  {/each}
</svg>
