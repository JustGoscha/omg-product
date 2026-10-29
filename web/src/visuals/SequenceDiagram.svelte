<script lang="ts">
  import { measure } from "../lib/graph";
  import { fonts, FONT_LABEL } from "../lib/fonts.svelte";
  import type { SequenceDiffT } from "../lib/diff";

  let { visual, compact = false }: { visual: SequenceDiffT; compact?: boolean } = $props();
  const uid = Math.random().toString(36).slice(2, 8);
  const TOP = 48;
  const STEP = 46;

  const laid = $derived.by(() => {
    void fonts.ready;
    const labelW = Math.max(120, ...visual.messages.map((m) => measure(m.label ?? "", "600 12.5px system-ui") + 24));
    const actorW = visual.actors.map((a) => Math.max(90, measure(a, FONT_LABEL) + 28));
    const gap = Math.min(300, Math.max(150, labelW));
    const xs: number[] = [];
    let x = actorW[0] / 2;
    visual.actors.forEach((_, i) => {
      if (i) x += gap;
      xs.push(x);
    });
    const width = xs[xs.length - 1] + actorW[actorW.length - 1] / 2;
    const height = TOP + 24 + visual.messages.length * STEP;
    return { xs, actorW, width, height };
  });
  const xOf = (a: string) => laid.xs[visual.actors.indexOf(a)] ?? 0;
  const color = (d?: string) => (d && d !== "same" ? `var(--${d})` : "var(--ink-2)");
</script>

<svg class="diagram" viewBox="-6 -6 {laid.width + 12} {laid.height + 12}" style="max-width:{(laid.width + 12) * 1.6}px;{compact ? "" : `min-width:${Math.round((laid.width + 12) * 0.8)}px`}" role="img" aria-label={visual.caption ?? "Sequence diagram"}>
  <defs>
    {#each ["ink-2", "added", "removed", "changed"] as m}
      <marker id="sarr-{m}-{uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--{m})" />
      </marker>
    {/each}
  </defs>
  {#each visual.actors as a, i}
    <line x1={laid.xs[i]} y1={TOP - 8} x2={laid.xs[i]} y2={laid.height} stroke="var(--fog)" stroke-width="1.5" stroke-dasharray="4 4" />
    <g class="node" transform="translate({laid.xs[i] - laid.actorW[i] / 2},0)" data-el="actor:{a}" data-label={a}>
      <rect width={laid.actorW[i]} height="36" rx="18" style="fill:var(--ink);stroke:var(--ink)" />
      <text class="label" x={laid.actorW[i] / 2} y="23" text-anchor="middle" style="fill:#fff">{a}</text>
    </g>
  {/each}
  {#each visual.messages as m, i}
    {@const y = TOP + 30 + i * STEP}
    {@const x1 = xOf(m.from)}
    {@const x2 = xOf(m.to)}
    {@const mk = m.diff && m.diff !== "same" ? m.diff : "ink-2"}
    <g data-el="message:{i}" data-label={m.label ?? `${m.from} → ${m.to}`}>
    {#if m.diff && m.diff !== "same"}
      <rect x="-6" y={y - 26} width={laid.width + 12} height={STEP - 4} rx="6" fill="var(--{m.diff}-soft)" opacity="0.7" />
    {/if}
    {#if m.from === m.to}
      <path d="M{x1},{y - 6} h40 v14 h-38" fill="none" stroke={color(m.diff)} stroke-width="1.6" stroke-dasharray={m.dashed || m.diff === "removed" ? "5 4" : ""} marker-end="url(#sarr-{mk}-{uid})" />
      <text x={x1 + 48} y={y + 2} style="font-size:12.5px;font-weight:600;fill:var(--ink-2)">{m.label ?? ""}</text>
    {:else}
      <line x1={x1} y1={y} x2={x2 + (x2 > x1 ? -2 : 2)} y2={y} stroke={color(m.diff)} stroke-width="1.6" stroke-dasharray={m.dashed || m.diff === "removed" ? "5 4" : ""} marker-end="url(#sarr-{mk}-{uid})" />
      <text x={(x1 + x2) / 2} y={y - 8} text-anchor="middle" style="font-size:12.5px;font-weight:600;fill:var(--ink-2);{m.diff === 'removed' ? 'text-decoration:line-through' : ''}">{m.label ?? ""}</text>
    {/if}
    <rect class="hit" x={Math.min(x1, x2) - 8} y={y - 24} width={Math.abs(x2 - x1) + 56} height="34" fill="transparent" />
    </g>
  {/each}
</svg>
