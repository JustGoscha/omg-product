<script lang="ts">
  // The problem space of a decision: what it is about, why it matters, what is fixed.
  // Shown before the options so the room understands the question before judging answers.
  import { md, mdInline } from "../lib/md";
  import { store } from "../lib/store.svelte";
  import EditableText from "../comments/EditableText.svelte";
  import EditableList from "../comments/EditableList.svelte";
  import { useReview } from "./review";
  import type { StepT } from "../lib/types";

  let { step }: { step: StepT } = $props();
  const t = $derived(store.t);
  const review = useReview();
  const save = (field: string) => (n: unknown, p: unknown) => review!.edit(step.id, [field], n, p);
  const has = $derived(!!(step.problem || step.why || step.facts?.length));
  let adding = $state(false);
</script>

{#if !has && review && !adding}
  <button class="add" onclick={() => (adding = true)}>+ {t.ctx.problem} · {t.ctx.why} · {t.ctx.facts}</button>
{:else if has || adding}
  <section class="problem">
    <div class="col">
      <h3 class="c1">{t.ctx.problem}</h3>
      <EditableText value={step.problem} multiline markdown disabled={!review} placeholder="+" onsave={save("problem")}><div class="md">{@html md(step.problem)}</div></EditableText>
    </div>
    <div class="col">
      <h3 class="c2">{t.ctx.why}</h3>
      <EditableText value={step.why} multiline markdown disabled={!review} placeholder="+" onsave={save("why")}><div class="md">{@html md(step.why)}</div></EditableText>
    </div>
    <div class="col">
      <h3 class="c3">{t.ctx.facts}</h3>
      {#if review}
        <EditableList items={step.facts ?? []} onsave={save("facts")} />
      {:else}
        <ul>{#each step.facts ?? [] as f}<li>{@html mdInline(f)}</li>{/each}</ul>
      {/if}
    </div>
  </section>
{/if}

<style>
  .problem {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 1.2rem;
    padding: 1rem 1.2rem;
    background: var(--card);
    border-radius: var(--r-panel);
    box-shadow: 0 0 0 1px var(--line);
    font-size: 1rem;
    line-height: 1.45;
    color: var(--ink-2);
  }
  .add {
    justify-self: start;
    border: 1.5px dashed var(--fog);
    background: transparent;
    border-radius: 999px;
    padding: 0.3rem 0.8rem;
    font-size: 0.82rem;
    font-weight: 650;
    color: var(--ink-3);
  }
  .add:hover {
    color: var(--ink);
    border-color: var(--ink-3);
  }
  .col {
    display: grid;
    align-content: start;
    gap: 0.3rem;
    min-width: 0;
  }
  h3 {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 800;
  }
  .c1 {
    color: var(--nice);
  }
  .c2 {
    color: var(--block);
  }
  .c3 {
    color: var(--ink-3);
  }
  ul {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.2rem;
  }
  @media (max-width: 900px) {
    .problem {
      grid-template-columns: 1fr;
    }
  }
</style>
