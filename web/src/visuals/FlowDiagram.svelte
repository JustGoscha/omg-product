<script lang="ts">
  import { curve, layoutGraph, measure } from "../lib/graph";
  import { fonts, FONT_LABEL, FONT_SMALL } from "../lib/fonts.svelte";
  import type { FlowDiffT } from "../lib/diff";
  import { store } from "../lib/store.svelte";

  let { visual, compact = false }: { visual: FlowDiffT; compact?: boolean } = $props();
  const uid = Math.random().toString(36).slice(2, 8);

  const kindStyle: Record<string, string> = {
    system: "fill:var(--card);stroke:var(--ink)",
    external: "fill:var(--paper-2);stroke:var(--ink-3);stroke-dasharray:5 4",
    ai: "fill:var(--ai-soft);stroke:var(--ai)",
    human: "fill:var(--beacon-soft);stroke:var(--must)",
    store: "fill:var(--card);stroke:var(--ink)",
  };

  const laid = $derived.by(() => {
    void fonts.ready;
    const boxes = visual.nodes.map((n) => {
      const label = n.label ?? n.id;
      const w = Math.max(90, Math.min(240, Math.max(measure(label, FONT_LABEL), n.sub ? measure(n.sub, FONT_SMALL) : 0) + 32));
      const h = n.sub ? 54 : 40;
      return { n, label, w, h: n.kind === "store" ? h + 12 : h };
    });
    const edges = visual.edges.map((e, i) => ({ e, key: `e${i}`, lw: e.label ? measure(e.label, "600 12px system-ui") + 16 : 0 }));
    const run = (rankdir: "LR" | "TB") =>
      layoutGraph(
      boxes.map((b) => ({ id: b.n.id, width: b.w, height: b.h })),
      edges.map((x) => ({ key: x.key, from: x.e.from, to: x.e.to, labelWidth: x.lw, labelHeight: x.e.label ? 22 : 0 })),
      { rankdir, ranksep: 56, nodesep: 22 },
      );
    let g = run(visual.direction ?? "LR");
    // wide chains become unreadable when fit to width; stack them instead
    if (!visual.direction && g.width > g.height * 2.4 && boxes.length > 4) g = run("TB");
    return { boxes, edges, g };
  });

  const cylinder = (w: number, h: number) => {
    const ry = 7;
    return `M0,${ry} A${w / 2},${ry} 0 0 1 ${w},${ry} L${w},${h - ry} A${w / 2},${ry} 0 0 1 0,${h - ry} Z M0,${ry} A${w / 2},${ry} 0 0 0 ${w},${ry}`;
  };
  const tag = (d?: string) => (d === "added" ? store.t.diffAdded : d === "removed" ? store.t.diffRemoved : d === "changed" ? store.t.diffChanged : "");
</script>

<svg class="diagram" viewBox="-12 -14 {laid.g.width + 24} {laid.g.height + 28}" style="max-width:{(laid.g.width + 24) * 1.6}px;{compact ? "" : `min-width:${Math.round((laid.g.width + 24) * 0.8)}px`}" role="img" aria-label={visual.caption ?? "Flow diagram"}>
  <defs>
    {#each ["ink", "added", "removed", "changed"] as m}
      <marker id="farr-{m}-{uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={m === "ink" ? "var(--ink-2)" : `var(--${m})`} />
      </marker>
    {/each}
  </defs>

  {#each laid.edges as x (x.key)}
    {@const p = laid.g.edges.get(x.key)}
    {#if p}
      <path class="edge {x.e.dashed ? 'dashed' : ''} {x.e.diff ?? ''}" d={curve(p.points)} marker-end="url(#farr-{x.e.diff && x.e.diff !== 'same' ? x.e.diff : 'ink'}-{uid})" />
    {/if}
  {/each}

  {#each laid.boxes as b (b.n.id)}
    {@const p = laid.g.nodes.get(b.n.id)}
    {#if p}
      <g class="node {b.n.diff ?? ''}" transform="translate({p.x - b.w / 2},{p.y - b.h / 2})" data-el="node:{b.n.id}" data-label={b.label}>
        {#if b.n.kind === "store"}
          <path class="shape" d={cylinder(b.w, b.h)} style={b.n.diff && b.n.diff !== "same" ? "" : kindStyle.store} stroke-width="1.6" />
        {:else}
          <rect width={b.w} height={b.h} rx={b.n.kind === "human" ? b.h / 2 : 10} style={b.n.diff && b.n.diff !== "same" ? "" : kindStyle[b.n.kind ?? "system"]} stroke-width="1.6" />
        {/if}
        <text class="label" x={b.w / 2} y={b.n.sub ? (b.n.kind === "store" ? 30 : 23) : b.n.kind === "store" ? 33 : 25} text-anchor="middle">{b.label}</text>
        {#if b.n.sub}
          <text class="small" x={b.w / 2} y={b.n.kind === "store" ? 47 : 41} text-anchor="middle">{b.n.sub}</text>
        {/if}
        {#if b.n.kind === "ai"}
          <text x={b.w - 8} y="14" text-anchor="end" style="font-size:11px;font-weight:700;fill:var(--ai)">AI</text>
        {/if}
        {#if b.n.diff && b.n.diff !== "same"}
          <text x="8" y="-5" style="font-size:11px;font-weight:700;fill:var(--{b.n.diff})">{tag(b.n.diff)}</text>
        {/if}
      </g>
    {/if}
  {/each}

  {#each laid.edges as x (x.key)}
    {@const p = laid.g.edges.get(x.key)}
    {#if p?.label && x.e.label}
      <g class="edge-label" transform="translate({p.label.x},{p.label.y})" data-el="edge:{x.e.from}>{x.e.to}" data-label={x.e.label}>
        <rect x={-x.lw / 2} y="-11" width={x.lw} height="22" rx="11" style={x.e.diff && x.e.diff !== "same" ? `stroke:var(--${x.e.diff})` : ""} />
        <text y="4" text-anchor="middle">{x.e.label}</text>
      </g>
    {/if}
  {/each}
</svg>
