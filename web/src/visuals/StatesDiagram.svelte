<script lang="ts">
  import { curve, layoutGraph, measure, wrap } from "../lib/graph";
  import { fonts, FONT_LABEL, FONT_SMALL } from "../lib/fonts.svelte";
  import type { StatesDiffT } from "../lib/diff";
  import { store } from "../lib/store.svelte";

  let { visual, compact = false }: { visual: StatesDiffT; compact?: boolean } = $props();
  const uid = Math.random().toString(36).slice(2, 8);

  const laid = $derived.by(() => {
    void fonts.ready;
    const boxes = visual.states.map((s) => {
      const label = s.label ?? s.id;
      const noteLines = s.note ? wrap(s.note, 170, FONT_SMALL).slice(0, 3) : [];
      const w = Math.max(96, Math.min(220, Math.max(measure(label, FONT_LABEL), ...noteLines.map((l) => measure(l, FONT_SMALL))) + 36));
      const h = 44 + noteLines.length * 15;
      return { s, label, noteLines, w, h };
    });
    const edges = visual.transitions.map((t, i) => {
      const text = [t.label, t.by ? `· ${t.by}` : ""].filter(Boolean).join(" ");
      return { t, key: `e${i}`, text, lw: text ? measure(text, "600 12px system-ui") + 16 : 0 };
    });
    const run = (rankdir: "LR" | "TB") =>
      layoutGraph(
      boxes.map((b) => ({ id: b.s.id, width: b.w, height: b.h })),
      edges.map((e) => ({ key: e.key, from: e.t.from, to: e.t.to, labelWidth: e.lw, labelHeight: e.text ? 22 : 0 })),
      { rankdir, ranksep: 70, nodesep: 30 },
      );
    let g = run(visual.direction ?? "LR");
    // wide chains become unreadable when fit to width; stack them instead
    if (!visual.direction && g.width > g.height * 2.4 && boxes.length > 4) g = run("TB");
    return { boxes, edges, g };
  });
  const tag = (d?: string) => (d === "added" ? store.t.diffAdded : d === "removed" ? store.t.diffRemoved : d === "changed" ? store.t.diffChanged : "");
  const tagColor = (d?: string) => (d === "added" ? "var(--added)" : d === "removed" ? "var(--removed)" : "var(--changed)");
</script>

<svg class="diagram" viewBox="-24 -14 {laid.g.width + 48} {laid.g.height + 28}" style="max-width:{(laid.g.width + 48) * 1.6}px;{compact ? "" : `min-width:${Math.round((laid.g.width + 48) * 0.8)}px`}" role="img" aria-label={visual.caption ?? "State diagram"}>
  <defs>
    {#each ["ink", "added", "removed", "changed"] as m}
      <marker id="arr-{m}-{uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={m === "ink" ? "var(--ink-2)" : `var(--${m})`} />
      </marker>
    {/each}
  </defs>

  {#each laid.edges as e (e.key)}
    {@const p = laid.g.edges.get(e.key)}
    {#if p}
      <path class="edge {e.t.diff ?? ''}" d={curve(p.points)} marker-end="url(#arr-{e.t.diff && e.t.diff !== 'same' ? e.t.diff : 'ink'}-{uid})" />
    {/if}
  {/each}

  {#each laid.boxes as b (b.s.id)}
    {@const p = laid.g.nodes.get(b.s.id)}
    {#if p}
      <g class="node {b.s.diff ?? ''}" transform="translate({p.x - b.w / 2},{p.y - b.h / 2})" data-el="state:{b.s.id}" data-label={b.label}>
        <rect width={b.w} height={b.h} rx="14" />
        {#if b.s.kind === "final"}
          <rect x="4" y="4" width={b.w - 8} height={b.h - 8} rx="11" style="fill:none" />
        {/if}
        {#if b.s.kind === "initial"}
          <circle cx="-14" cy={b.h / 2} r="6" fill="var(--ink)" />
          <line x1="-8" y1={b.h / 2} x2="0" y2={b.h / 2} stroke="var(--ink)" stroke-width="1.6" />
        {/if}
        <text class="label" x={b.w / 2} y="27" text-anchor="middle">{b.label}</text>
        {#each b.noteLines as line, i}
          <text class="small" x={b.w / 2} y={44 + i * 15} text-anchor="middle">{line}</text>
        {/each}
        {#if b.s.diff && b.s.diff !== "same"}
          <g class="tag" transform="translate({b.w - 10},-9)">
            <rect x={-measure(tag(b.s.diff), "700 10.5px system-ui") - 12} width={measure(tag(b.s.diff), "700 10.5px system-ui") + 12} height="18" rx="9" fill={tagColor(b.s.diff)} />
            <text x={-6} y="13" text-anchor="end">{tag(b.s.diff)}</text>
          </g>
        {/if}
      </g>
    {/if}
  {/each}

  {#each laid.edges as e (e.key)}
    {@const p = laid.g.edges.get(e.key)}
    {#if p?.label && e.text}
      <g class="edge-label" transform="translate({p.label.x},{p.label.y})" data-el="transition:{e.t.from}>{e.t.to}" data-label={e.text}>
        <rect x={-e.lw / 2} y="-11" width={e.lw} height="22" rx="11" style={e.t.diff === "added" ? "stroke:var(--added);fill:var(--added-soft)" : e.t.diff === "removed" ? "stroke:var(--removed);fill:var(--removed-soft)" : e.t.diff === "changed" ? "stroke:var(--changed);fill:var(--changed-soft)" : ""} />
        <text y="4" text-anchor="middle" style={e.t.diff === "removed" ? "text-decoration:line-through" : ""}>{e.text}</text>
      </g>
    {/if}
  {/each}
</svg>
