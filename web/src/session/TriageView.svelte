<script lang="ts">
  import { md } from "../lib/md";
  import { store } from "../lib/store.svelte";
  import Visual from "../visuals/Visual.svelte";
  import type { StepT } from "../lib/types";
  import type { SessionState } from "./state.svelte";

  import { scaleValues, slotOf, type Slot, type TriageScale } from "../../../src/core/scales";
  let { step, section, ss, onnext }: { step: StepT & { type: "triage" }; section: string; ss: SessionState; onnext: () => void } = $props();

  const t = $derived(store.t);
  const result = $derived(ss.result(step.id));
  const visuals = $derived([...(step.visual ? [step.visual] : []), ...(step.visuals ?? [])]);
  const scale = $derived((step.scale ?? "priority") as TriageScale);
  // directions of the swipe; what they mean depends on the scale of the card
  const dirs: { slot: Slot; key: string; arrow: string; x: number; y: number }[] = [
    { slot: "left", key: "ArrowLeft", arrow: "←", x: -1, y: 0 },
    { slot: "down", key: "ArrowDown", arrow: "↓", x: 0, y: 1 },
    { slot: "right", key: "ArrowRight", arrow: "→", x: 1, y: 0 },
    { slot: "up", key: "ArrowUp", arrow: "↑", x: 0, y: -1 },
  ];
  const order: Slot[] = ["up", "right", "down", "left"];
  const valueOf = (slot: Slot) => scaleValues[scale][order.indexOf(slot)];
  const label = (slot: Slot) => t.scales[scale]?.[valueOf(slot)] ?? [valueOf(slot), ""];
  const chosen = $derived(slotOf(scale, result?.value));
  type Verdict = Slot;
  // the colors stay with the direction: up gold, right green, down blue, left grey
  const cls: Record<Slot, string> = { up: "must", right: "should", down: "nice", left: "no" };

  let dx = $state(0);
  let dy = $state(0);
  let dragging = $state(false);
  let flying = $state<Verdict | null>(null);
  let start: { x: number; y: number } | null = null;

  const leaning = $derived.by((): Verdict | null => {
    if (flying) return flying;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 40) return null;
    if (ax > ay) return dx > 0 ? "right" : "left";
    return dy < 0 ? "up" : "down";
  });

  function decide(v: Verdict) {
    const d = dirs.find((d) => d.slot === v)!;
    flying = v;
    dx = d.x * 900;
    dy = d.y * 700;
    ss.act({ op: "step", step: step.id, patch: { status: "decided", value: valueOf(v) } });
    setTimeout(() => {
      onnext();
      flying = null;
      dx = dy = 0;
    }, 360);
  }

  function down(e: PointerEvent) {
    if ((e.target as HTMLElement).closest("button, a, textarea, input")) return;
    start = { x: e.clientX, y: e.clientY };
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!start) return;
    dx = e.clientX - start.x;
    dy = e.clientY - start.y;
  }
  function up() {
    if (!start) return;
    start = null;
    dragging = false;
    const v = leaning;
    if (v && Math.max(Math.abs(dx), Math.abs(dy)) > 120) decide(v);
    else dx = dy = 0;
  }

  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      const d = dirs.find((d) => d.key === e.key);
      if (d && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        decide(d.slot);
      }
    };
    addEventListener("keydown", onKey, true);
    return () => removeEventListener("keydown", onKey, true);
  });

  const tilt = $derived(dx / 22);
</script>

<div class="triage">
  <div class="where">{section}</div>
  <div class="deck">
    {#each dirs as d}
      <div class="target t-{cls[d.slot]}" class:lit={leaning === d.slot}>{label(d.slot)[0]}</div>
    {/each}

    <div
      class="card v-{leaning ? cls[leaning] : chosen ? cls[chosen] : 'none'}"
      class:dragging
      class:flying={!!flying}
      style="transform: translate({dx}px, {dy}px) rotate({tilt}deg)"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      role="group"
      aria-label={step.title}
    >
      {#if chosen && !leaning}
        <div class="stamp s-{cls[chosen]}">{label(chosen)[0]}</div>
      {/if}
      <h1>{step.title}</h1>
      {#if step.body}<div class="body md">{@html md(step.body)}</div>{/if}
      {#each visuals as v}
        <div class="vis"><Visual visual={v} project={ss.project} compact annotations={ss.results.annotations} /></div>
      {/each}
    </div>
  </div>

  <div class="buttons">
    {#each dirs as d}
      <button class="verdict b-{cls[d.slot]}" class:on={chosen === d.slot} onclick={() => decide(d.slot)}>
        <span class="arrow">{d.arrow}</span>
        <span class="lbl">{label(d.slot)[0]}</span>
        {#if label(d.slot)[1]}<span class="hint">{label(d.slot)[1]}</span>{/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .triage {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 1rem;
    height: 100%;
    min-height: 0;
  }
  .where {
    text-align: center;
    font-weight: 700;
    color: var(--ink-3);
  }
  .deck {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 0;
    padding: 2.5rem 7rem;
  }
  .target {
    position: absolute;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--fog);
    transition: color 0.15s, transform 0.15s;
    pointer-events: none;
  }
  .target.lit {
    transform: scale(1.18);
  }
  .t-must {
    top: 0;
    left: 50%;
    translate: -50% 0;
  }
  .t-must.lit {
    color: var(--must);
  }
  .t-nice {
    bottom: 0;
    left: 50%;
    translate: -50% 0;
  }
  .t-nice.lit {
    color: var(--nice);
  }
  .t-no {
    left: 0;
    top: 50%;
    translate: 0 -50%;
  }
  .t-no.lit {
    color: var(--no);
  }
  .t-should {
    right: 0;
    top: 50%;
    translate: 0 -50%;
  }
  .t-should.lit {
    color: var(--should);
  }
  .card {
    position: relative;
    width: min(46rem, 100%);
    max-height: 100%;
    overflow: hidden;
    background: var(--card);
    border-radius: 22px;
    padding: clamp(1.4rem, 3vw, 2.4rem);
    box-shadow: 0 30px 60px -30px rgba(27, 36, 48, 0.45), 0 0 0 1px rgba(27, 36, 48, 0.06);
    border: 3px solid transparent;
    display: grid;
    gap: 1rem;
    cursor: grab;
    touch-action: none;
    user-select: none;
    transition: transform 0.35s var(--ease), border-color 0.15s, opacity 0.35s;
  }
  .card.dragging {
    transition: border-color 0.15s;
    cursor: grabbing;
  }
  .card.flying {
    opacity: 0;
  }
  .v-must {
    border-color: var(--must);
  }
  .v-should {
    border-color: var(--should);
  }
  .v-nice {
    border-color: var(--nice);
  }
  .v-no {
    border-color: var(--no);
  }
  h1 {
    font-size: clamp(1.6rem, 1rem + 1.8vw, 2.4rem);
  }
  .body {
    font-size: 1.15rem;
    color: var(--ink-2);
  }
  /* the whole card fits on screen: the picture takes what is left */
  .vis {
    pointer-events: none;
    min-height: 0;
    max-height: 36vh;
    display: flex;
    justify-content: center;
  }
  .vis :global(.visual) {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .vis :global(svg.diagram) {
    width: auto !important;
    max-width: 100% !important;
    min-width: 0 !important;
    max-height: 36vh;
  }
  .body {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .stamp {
    justify-self: start;
    padding: 0.25rem 0.8rem;
    border-radius: 999px;
    font-weight: 800;
    font-size: 0.85rem;
  }
  .s-must {
    background: var(--must-soft);
    color: var(--must);
  }
  .s-should {
    background: var(--should-soft);
    color: var(--should);
  }
  .s-nice {
    background: var(--nice-soft);
    color: var(--nice);
  }
  .s-no {
    background: var(--no-soft);
    color: var(--no);
  }
  .buttons {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    max-width: 56rem;
    width: 100%;
    margin: 0 auto;
  }
  .verdict {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    column-gap: 0.7rem;
    align-items: center;
    text-align: left;
    padding: 0.8rem 1rem;
    border-radius: 16px;
    border: 2px solid var(--line);
    background: var(--card);
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
  }
  .verdict:active {
    transform: scale(0.98);
  }
  .arrow {
    grid-row: span 2;
    font-size: 1.4rem;
    font-weight: 800;
  }
  .lbl {
    font-weight: 750;
    font-size: 1.02rem;
  }
  .hint {
    font-size: 0.82rem;
    color: var(--ink-3);
  }
  .b-must .arrow {
    color: var(--must);
  }
  .b-should .arrow {
    color: var(--should);
  }
  .b-nice .arrow {
    color: var(--nice);
  }
  .b-no .arrow {
    color: var(--no);
  }
  .b-must:hover,
  .b-must.on {
    border-color: var(--must);
    background: var(--must-soft);
  }
  .b-should:hover,
  .b-should.on {
    border-color: var(--should);
    background: var(--should-soft);
  }
  .b-nice:hover,
  .b-nice.on {
    border-color: var(--nice);
    background: var(--nice-soft);
  }
  .b-no:hover,
  .b-no.on {
    border-color: var(--no);
    background: var(--no-soft);
  }
  @media (max-width: 760px) {
    .deck {
      padding: 2.5rem 0.5rem;
    }
    .target.t-no,
    .target.t-should {
      display: none;
    }
    .buttons {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
