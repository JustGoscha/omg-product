<script lang="ts">
  // The session at a glance: one tick per step, colored by what the room answered.
  // Decisions are taller ticks; hover shows the question and its answer.
  import { store } from "../lib/store.svelte";
  import { slotOf, type TriageScale } from "../../../src/core/scales";
  import type { ChoiceStepT, LoadedStep } from "../lib/types";
  import type { FlatStep, SessionState } from "./state.svelte";

  let { ss, current, ongo }: { ss: SessionState; current: number; ongo: (i: number) => void } = $props();
  const t = $derived(store.t);

  const sections = $derived.by(() => {
    const out: { id: string; title: string; phase: string; steps: FlatStep[] }[] = [];
    for (const s of ss.steps) {
      const last = out[out.length - 1];
      if (last && last.id === s.section.id) last.steps.push(s);
      else out.push({ ...s.section, steps: [s] });
    }
    return out;
  });

  const slotColor: Record<string, string> = { up: "var(--must)", right: "var(--should)", down: "var(--nice)", left: "var(--no)" };

  /** color and short answer of a step */
  function answer(step: LoadedStep): { color: string; text: string } | null {
    const r = ss.result(step.id);
    if (!r) return null;
    if (r.status === "deferred" || r.status === "escalated") return { color: "parked", text: r.status === "deferred" ? t.defer : t.escalate };
    if (!r.value) return null;
    if (step.type === "triage") {
      const scale = (step.scale ?? "priority") as TriageScale;
      const slot = slotOf(scale, r.value);
      return { color: slot ? slotColor[slot] : "var(--ink-2)", text: t.scales[scale]?.[r.value]?.[0] ?? r.value };
    }
    if (step.type === "checkpoint") {
      const tone: Record<string, string> = { agreed: "var(--should)", concerns: "var(--must)", "not-yet": "var(--block)" };
      return { color: tone[r.value] ?? "var(--ink-2)", text: t.agree.values[r.value as keyof typeof t.agree.values]?.[0] ?? r.value };
    }
    if (step.type === "choice") {
      const o = (step as ChoiceStepT).options.find((o) => o.id === r.value);
      return { color: "var(--ink)", text: r.value === "other" ? `${t.ownOption}: ${r.other?.text ?? ""}` : (o?.label ?? r.value) };
    }
    return { color: "var(--ink-2)", text: r.value.length > 80 ? r.value.slice(0, 79) + "…" : r.value };
  }

  let tip = $state<{ x: number; title: string; answer?: string; kind: string } | null>(null);
  let nav = $state<HTMLElement>();
  function show(e: PointerEvent, s: FlatStep) {
    const box = nav!.getBoundingClientRect();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    tip = { x: r.left + r.width / 2 - box.left, title: s.step.title, answer: answer(s.step)?.text, kind: s.step.type };
  }
</script>

<nav class="arc" aria-label="Session progress" bind:this={nav} onpointerleave={() => (tip = null)}>
  {#each sections as sec}
    <div class="sec" style="flex:{sec.steps.length}">
      {#each sec.steps as s}
        {@const a = s.step.type === "slide" ? null : answer(s.step)}
        <button
          class="tick t-{s.step.type}"
          class:answered={!!a}
          class:parked={a?.color === "parked"}
          class:now={s.index === current}
          style={a && a.color !== "parked" ? `--fill:${a.color}` : ""}
          onclick={() => ongo(s.index)}
          onpointerenter={(e) => show(e, s)}
          aria-label="{s.step.title}{a ? `: ${a.text}` : ''}"
        ></button>
      {/each}
    </div>
  {/each}
  {#if tip}
    <div class="tip" style="left:{tip.x}px">
      <span class="q">{tip.title}</span>
      {#if tip.answer}<span class="a">→ {tip.answer}</span>{:else if tip.kind !== "slide"}<span class="open">{t.openTitle}</span>{/if}
    </div>
  {/if}
</nav>

<style>
  .arc {
    position: relative;
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
    height: 22px;
  }
  .sec {
    display: flex;
    gap: 3px;
    min-width: 0;
    align-items: center;
  }
  .tick {
    flex: 1;
    min-width: 6px;
    height: 8px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: var(--line);
    transition: background 0.2s, transform 0.15s;
  }
  .tick:hover {
    transform: scaleY(1.5);
  }
  /* decisions stand out: taller, with a frame until answered */
  .tick.t-choice {
    height: 16px;
    border-radius: 4px;
    background: var(--card);
    box-shadow: inset 0 0 0 2px var(--ink-3);
  }
  /* a checkpoint closes a part: a round marker the size of a decision */
  .tick.t-checkpoint {
    flex: 0 0 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--card);
    box-shadow: inset 0 0 0 2.5px var(--ink-2);
  }
  .tick.t-slide {
    height: 4px;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .tick.answered {
    background: var(--fill);
    box-shadow: none;
  }
  .tick.parked {
    background: repeating-linear-gradient(45deg, var(--fog), var(--fog) 3px, transparent 3px, transparent 6px);
    box-shadow: inset 0 0 0 1.5px var(--fog);
  }
  .tick.t-broken {
    background: var(--block);
  }
  .tick.now {
    outline: 2.5px solid var(--beacon);
    outline-offset: 2px;
    transform: scaleY(1.25);
  }
  .tip {
    position: absolute;
    top: calc(100% + 8px);
    transform: translateX(-50%);
    z-index: 40;
    display: grid;
    gap: 0.15rem;
    width: max-content;
    max-width: 22rem;
    padding: 0.45rem 0.7rem;
    border-radius: 8px;
    background: var(--ink);
    color: #fff;
    font-size: 0.8rem;
    pointer-events: none;
    box-shadow: 0 10px 24px -10px rgba(27, 36, 48, 0.6);
  }
  .q {
    font-weight: 650;
  }
  .a {
    color: var(--beacon);
    font-weight: 750;
  }
  .open {
    color: rgba(255, 255, 255, 0.55);
  }
</style>
