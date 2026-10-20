<script lang="ts">
  // Phone view: follows the facilitator's current step and lets one person vote.
  import { store } from "../lib/store.svelte";
  import { SessionState } from "../session/state.svelte";
  import type { ChoiceStepT, PollStepT } from "../lib/types";
  import { scaleValues, type TriageScale } from "../../../src/core/scales";
  import { checkpointValues } from "../../../src/core/scales";

  let { project, session }: { project: string; session: string } = $props();
  const ss = $derived(new SessionState(project, session));
  $effect(() => {
    const s = ss;
    s.start();
    return () => s.stop();
  });
  const t = $derived(store.t);
  let name = $state("");
  $effect(() => {
    name = ss.author;
  });

  const flat = $derived(ss.steps.find((s) => s.step.id === ss.results.current) ?? ss.steps[0]);
  const step = $derived(flat?.step);
  const mine = $derived(step ? ss.result(step.id)?.votes?.[ss.author] : undefined);
  const choices = $derived.by((): { id: string; label: string }[] => {
    if (!step) return [];
    if (step.type === "choice") return (step as ChoiceStepT).options.filter((o) => !o.baseline).map((o) => ({ id: o.id, label: o.label }));
    if (step.type === "poll") return (step as PollStepT).answers.map((a) => ({ id: a, label: a }));
    if (step.type === "triage") {
      const sc = (step.scale ?? "priority") as TriageScale;
      return scaleValues[sc].map((v) => ({ id: v, label: t.scales[sc][v]?.[0] ?? v }));
    }
    if (step.type === "checkpoint") return checkpointValues.map((v) => ({ id: v, label: t.agree.values[v][0] }));
    return [];
  });
  const vote = (v: string) => ss.act({ op: "vote", step: step!.id, voter: ss.author, value: mine === v ? null : v });
</script>

<div class="join">
  {#if !ss.author}
    <form class="who" onsubmit={(e) => (e.preventDefault(), name.trim() && ss.setAuthor(name.trim()))}>
      <h1>{t.joinAs}</h1>
      <div class="people">
        {#each ss.session?.participants ?? [] as p}
          <button type="button" class="btn" onclick={() => ss.setAuthor(p.name)}>{p.name}</button>
        {/each}
      </div>
      <input class="field" bind:value={name} placeholder="Name" />
      <button class="btn primary" type="submit">OK</button>
    </form>
  {:else if !step}
    <p class="muted">{t.waiting}</p>
  {:else}
    <div class="cur">
      <small>{flat.section.title}</small>
      <h1>{step.title}</h1>
      {#if choices.length}
        <div class="choices">
          {#each choices as c}
            <button class="choice" class:on={mine === c.id} onclick={() => vote(c.id)}>{c.label}</button>
          {/each}
        </div>
        {#if mine}<p class="muted">{t.yourVote}: {choices.find((c) => c.id === mine)?.label}</p>{/if}
      {:else}
        <p class="muted">{t.waiting}</p>
      {/if}
    </div>
    <button class="btn small ghost me" onclick={() => ss.setAuthor("")}>{ss.author} ×</button>
  {/if}
</div>

<style>
  .join {
    min-height: 100dvh;
    padding: 1.5rem 1rem;
    display: grid;
    align-content: center;
    gap: 1rem;
    max-width: 30rem;
    margin: 0 auto;
  }
  .who,
  .cur {
    display: grid;
    gap: 1rem;
  }
  .people {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  h1 {
    font-size: 1.8rem;
  }
  small {
    font-weight: 700;
    color: var(--ink-3);
  }
  .choices {
    display: grid;
    gap: 0.7rem;
  }
  .choice {
    padding: 1.1rem;
    border-radius: 16px;
    border: 2px solid var(--line);
    background: var(--card);
    font-size: 1.2rem;
    font-weight: 700;
    text-align: left;
  }
  .choice.on {
    border-color: var(--ink);
    background: var(--beacon-soft);
  }
  .me {
    justify-self: center;
  }
</style>
