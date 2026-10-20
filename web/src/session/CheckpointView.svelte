<script lang="ts">
  // The end of a part of the meeting: everything the room said in it on one screen,
  // then one question: do we agree? Click an item to go back and change it.
  import { store } from "../lib/store.svelte";
  import StepHeader from "./StepHeader.svelte";
  import { scaleValues, slotOf, type TriageScale } from "../../../src/core/scales";
  import { checkpointValues } from "../../../src/core/scales";
  import type { CheckpointStepT, ChoiceStepT, LoadedStep } from "../lib/types";
  import type { FlatStep, SessionState } from "./state.svelte";

  let { step, section, ss, index, ongo }: { step: CheckpointStepT; section: string; ss: SessionState; index: number; ongo: (i: number) => void } = $props();
  const t = $derived(store.t);
  const result = $derived(ss.result(step.id));
  const covered = $derived(ss.covered(index));

  const slotColor: Record<string, string> = { up: "var(--must)", right: "var(--should)", down: "var(--nice)", left: "var(--no)" };

  // triage cards grouped by scale, in scale order; the rest as answered or open rows
  const said = $derived.by(() => {
    const scales = new Map<TriageScale, { value: string; items: FlatStep[] }[]>();
    const unrated: FlatStep[] = [];
    const rows: { s: FlatStep; answer: string; open: boolean; parked: boolean }[] = [];
    for (const s of covered) {
      const r = ss.result(s.step.id);
      const parked = r?.status === "deferred" || r?.status === "escalated";
      if (s.step.type === "triage" && !parked) {
        const scale = (s.step.scale ?? "priority") as TriageScale;
        if (!scales.has(scale)) scales.set(scale, scaleValues[scale].map((value) => ({ value, items: [] })));
        const bucket = scales.get(scale)!.find((b) => b.value === r?.value);
        if (bucket) bucket.items.push(s);
        else unrated.push(s);
      } else rows.push({ s, answer: parked ? (r!.status === "deferred" ? t.defer : t.escalate) : answerOf(s.step), open: !r?.value && !parked, parked });
    }
    return { scales: [...scales].map(([scale, buckets]) => ({ scale, buckets: buckets.filter((b) => b.items.length) })), unrated, rows };
  });

  function answerOf(step: LoadedStep) {
    const r = ss.result(step.id);
    if (!r?.value) return "";
    if (step.type === "choice") {
      if (r.value === "other") return `${t.ownOption}: ${r.other?.text ?? ""}`;
      return (step as ChoiceStepT).options.find((o) => o.id === r.value)?.label ?? r.value;
    }
    return r.value.length > 140 ? r.value.slice(0, 139) + "…" : r.value;
  }

  // phones vote; the facilitator sets the room's answer
  const votes = $derived(result?.votes ?? {});
  const voters = (v: string) => Object.entries(votes).filter(([, x]) => x === v).map(([who]) => who);
  const tone: Record<string, string> = { agreed: "var(--should)", concerns: "var(--must)", "not-yet": "var(--block)" };

  function set(v: string) {
    ss.act({ op: "step", step: step.id, patch: { status: "decided", value: result?.value === v ? undefined : v } });
  }
  let note = $state("");
  $effect(() => {
    note = result?.note ?? "";
  });
  const saveNote = () => {
    if ((result?.note ?? "") !== note.trim()) ss.act({ op: "step", step: step.id, patch: { note: note.trim() || undefined } });
  };
</script>

<div class="cp">
  <StepHeader {step} {section} />

  <div class="said">
    {#if !covered.length}
      <p class="muted">{t.agree.nothing}</p>
    {/if}
    {#each said.scales as g}
      <section>
        <h2>{t.scaleTitles[g.scale]}</h2>
        <div class="buckets">
          {#each g.buckets as b}
            {@const slot = slotOf(g.scale, b.value)}
            <div class="bucket" style="--c:{slot ? slotColor[slot] : 'var(--ink-3)'}">
              <h3>{t.scales[g.scale][b.value]?.[0] ?? b.value} <span class="n">{b.items.length}</span></h3>
              <ul>
                {#each b.items as s}<li><button onclick={() => ongo(s.index)}>{s.step.title}</button></li>{/each}
              </ul>
            </div>
          {/each}
          {#if said.unrated.length}
            <div class="bucket unrated">
              <h3>{t.agree.unrated} <span class="n">{said.unrated.length}</span></h3>
              <ul>
                {#each said.unrated as s}<li><button onclick={() => ongo(s.index)}>{s.step.title}</button></li>{/each}
              </ul>
            </div>
          {/if}
        </div>
      </section>
    {/each}

    {#if said.rows.length}
      <section>
        {#if said.scales.length}<h2>{t.agree.decided}</h2>{/if}
        <ul class="rows">
          {#each said.rows as row}
            <li>
              <button class="row" class:open={row.open} class:parked={row.parked} onclick={() => ongo(row.s.index)}>
                <span class="q">{row.s.step.title}</span>
                <span class="a">{row.open ? t.agree.open : row.answer}</span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
    {#if covered.length}<p class="hint muted">{t.agree.revisit}</p>{/if}
  </div>

  <div class="agree">
    {#each checkpointValues as v}
      {@const [label, sub] = t.agree.values[v]}
      <button class="answer" class:on={result?.value === v} style="--c:{tone[v]}" onclick={() => set(v)}>
        <span class="label">{label}</span>
        <span class="sub">{sub}</span>
        {#if voters(v).length}<span class="who">{voters(v).join(", ")}</span>{/if}
      </button>
    {/each}
  </div>
  {#if result?.value === "concerns" || result?.value === "not-yet"}
    <textarea class="field concern" rows="2" placeholder={t.agree.concernPlaceholder} bind:value={note} onblur={saveNote}></textarea>
  {/if}
</div>

<style>
  .cp {
    display: grid;
    gap: 1.6rem;
    max-width: 64rem;
    margin: 0 auto;
    align-content: start;
  }
  .said {
    display: grid;
    gap: 1.4rem;
  }
  h2 {
    font-size: 1rem;
    font-family: var(--font-ui);
    font-weight: 700;
    color: var(--ink-3);
    margin-bottom: 0.6rem;
  }
  .buckets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 0.8rem;
  }
  .bucket {
    border-radius: var(--r-card);
    background: var(--card);
    border-top: 5px solid var(--c);
    padding: 0.8rem 0.9rem 0.9rem;
    box-shadow: var(--shadow-lift);
  }
  .bucket.unrated {
    --c: var(--fog);
    background: transparent;
    box-shadow: none;
    border: 1.5px dashed var(--fog);
  }
  h3 {
    font-size: 1.15rem;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
    color: var(--c);
  }
  .unrated h3 {
    color: var(--ink-3);
  }
  .n {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    color: var(--ink-3);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.35rem;
  }
  .bucket button {
    all: unset;
    cursor: pointer;
    display: block;
    font-size: 0.98rem;
    line-height: 1.35;
    color: var(--ink);
  }
  .bucket button:hover {
    text-decoration: underline;
    text-decoration-color: var(--c);
    text-underline-offset: 3px;
  }
  .rows {
    gap: 0.4rem;
  }
  .row {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1rem;
    text-align: left;
    padding: 0.65rem 0.9rem;
    border-radius: var(--r-small);
    border: 1.5px solid var(--line);
    background: var(--card);
  }
  .row:hover {
    border-color: var(--ink-3);
  }
  .row .q {
    color: var(--ink-2);
  }
  .row .a {
    font-weight: 700;
  }
  .row.open {
    border-style: dashed;
    background: transparent;
  }
  .row.open .a,
  .row.parked .a {
    color: var(--ink-3);
    font-weight: 600;
  }
  .hint {
    font-size: 0.85rem;
  }
  .agree {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
  }
  .answer {
    display: grid;
    gap: 0.25rem;
    justify-items: start;
    text-align: left;
    padding: 1rem 1.1rem;
    border-radius: 16px;
    border: 2.5px solid var(--line);
    background: var(--card);
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
  }
  .answer:hover {
    border-color: var(--c);
  }
  .answer:active {
    transform: scale(0.99);
  }
  .answer.on {
    border-color: var(--c);
    background: color-mix(in srgb, var(--c) 14%, var(--card));
  }
  .label {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--c);
  }
  .sub {
    font-size: 0.88rem;
    color: var(--ink-3);
  }
  .who {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--ink-2);
  }
  .concern {
    font-size: 1.05rem;
  }
  @media (max-width: 720px) {
    .agree {
      grid-template-columns: 1fr;
    }
    .row {
      grid-template-columns: 1fr;
      gap: 0.2rem;
    }
  }
</style>
