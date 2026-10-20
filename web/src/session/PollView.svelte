<script lang="ts">
  import { store } from "../lib/store.svelte";
  import StepHeader from "./StepHeader.svelte";
  import Visual from "../visuals/Visual.svelte";
  import type { PollStepT } from "../lib/types";
  import type { SessionState } from "./state.svelte";

  let { step, section, ss }: { step: PollStepT; section: string; ss: SessionState } = $props();
  const result = $derived(ss.result(step.id));
  const votes = $derived(result?.votes ?? {});
  const people = $derived([
    ...(ss.session?.participants.map((p) => p.name) ?? []),
    ...Object.keys(votes).filter((n) => !ss.session?.participants.some((p) => p.name === n)),
  ]);
  const count = (a: string) => Object.values(votes).filter((v) => v === a).length;
  const total = $derived(Object.keys(votes).length);
  const tone = (i: number, n: number) => (i === 0 ? "should" : i === n - 1 ? "no" : n === 3 && i === 1 ? "must" : "nice");

  function group(a: string) {
    ss.act({ op: "step", step: step.id, patch: { status: "decided", value: result?.value === a ? undefined : a } });
  }
  function vote(who: string, a: string) {
    const next = votes[who] === a ? null : a;
    ss.act({ op: "vote", step: step.id, voter: who, value: next });
    // the room's answer follows the majority unless someone set it by hand
    const after = { ...votes };
    if (next) after[who] = next;
    else delete after[who];
    const tally = step.answers.map((x) => [x, Object.values(after).filter((v) => v === x).length] as const).sort((p, q) => q[1] - p[1]);
    if (tally[0][1] > 0 && tally[0][1] !== tally[1]?.[1]) ss.act({ op: "step", step: step.id, patch: { status: "decided", value: tally[0][0] } });
  }
  const visuals = $derived([...(step.visual ? [step.visual] : []), ...(step.visuals ?? [])]);
</script>

<div class="poll">
  <StepHeader {step} {section} center />
  {#each visuals as v}<div class="vis"><Visual visual={v} project={ss.project} compact={v.type === "prototype"} /></div>{/each}

  <div class="answers" style="--n:{step.answers.length}">
    {#each step.answers as a, i}
      {@const c = count(a)}
      <button class="answer tone-{tone(i, step.answers.length)}" class:on={result?.value === a} onclick={() => group(a)}>
        <span class="a">{a}</span>
        {#if total}<span class="bar"><span style="width:{(c / total) * 100}%"></span></span><span class="n">{c}</span>{/if}
      </button>
    {/each}
  </div>

  {#if people.length}
    <div class="grid" style="--n:{step.answers.length}">
      {#each people as who}
        <div class="who">{who}</div>
        {#each step.answers as a, i}
          <button class="cell tone-{tone(i, step.answers.length)}" class:on={votes[who] === a} onclick={() => vote(who, a)} aria-label="{who}: {a}">
            {votes[who] === a ? "●" : ""}
          </button>
        {/each}
      {/each}
    </div>
  {/if}
</div>

<style>
  .poll {
    display: grid;
    gap: 2rem;
    align-content: center;
    justify-items: center;
    min-height: 100%;
  }
  .vis {
    width: min(40rem, 100%);
  }
  .answers {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(9rem, 14rem));
    gap: 1rem;
  }
  .answer {
    display: grid;
    gap: 0.5rem;
    padding: 1.2rem 1rem;
    border-radius: 20px;
    border: 2.5px solid var(--line);
    background: var(--card);
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 700;
    text-transform: capitalize;
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
  }
  .answer:active {
    transform: scale(0.98);
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--paper-2);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: currentColor;
    transition: width 0.3s var(--ease);
  }
  .n {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--ink-3);
  }
  .tone-should {
    color: var(--should);
  }
  .tone-must {
    color: var(--must);
  }
  .tone-nice {
    color: var(--nice);
  }
  .tone-no {
    color: var(--no);
  }
  .answer .a {
    color: var(--ink);
  }
  .answer.on.tone-should {
    border-color: var(--should);
    background: var(--should-soft);
  }
  .answer.on.tone-must {
    border-color: var(--must);
    background: var(--must-soft);
  }
  .answer.on.tone-nice {
    border-color: var(--nice);
    background: var(--nice-soft);
  }
  .answer.on.tone-no {
    border-color: var(--no);
    background: var(--no-soft);
  }
  .grid {
    display: grid;
    grid-template-columns: auto repeat(var(--n), 3rem);
    gap: 0.35rem 0.6rem;
    align-items: center;
  }
  .who {
    font-weight: 650;
    text-align: right;
    padding-right: 0.4rem;
  }
  .cell {
    width: 3rem;
    height: 2.2rem;
    border-radius: 10px;
    border: 1.5px solid var(--line);
    background: var(--card);
    font-size: 1rem;
  }
  .cell.on {
    border-color: currentColor;
    background: currentColor;
  }
  .cell.on {
    color: #fff;
  }
  .cell.on.tone-should {
    background: var(--should);
    border-color: var(--should);
  }
  .cell.on.tone-must {
    background: var(--must);
    border-color: var(--must);
  }
  .cell.on.tone-nice {
    background: var(--nice);
    border-color: var(--nice);
  }
  .cell.on.tone-no {
    background: var(--no);
    border-color: var(--no);
  }
  @media (max-width: 700px) {
    .answers {
      grid-template-columns: 1fr;
      width: 100%;
    }
  }
</style>
