<script lang="ts">
  import { store } from "../lib/store.svelte";
  import StepHeader from "./StepHeader.svelte";
  import Dictate from "./Dictate.svelte";
  import Visual from "../visuals/Visual.svelte";
  import type { StepT } from "../lib/types";
  import type { SessionState } from "./state.svelte";

  let { step, section, ss }: { step: Extract<StepT, { type: "question" }>; section: string; ss: SessionState } = $props();
  let text = $state("");
  let dirty = false;
  let timer: ReturnType<typeof setTimeout>;

  $effect(() => {
    void step.id;
    text = ss.result(step.id)?.value ?? "";
    dirty = false;
  });
  // pick up answers typed elsewhere (another screen, an agent) when not editing
  $effect(() => {
    const remote = ss.result(step.id)?.value ?? "";
    if (!dirty) text = remote;
  });

  function save() {
    clearTimeout(timer);
    dirty = false;
    ss.act({ op: "step", step: step.id, patch: { value: text.trim() || undefined, status: text.trim() ? "decided" : undefined } });
  }
  function input() {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(save, 700);
  }
  const visuals = $derived([...(step.visual ? [step.visual] : []), ...(step.visuals ?? [])]);
</script>

<div class="q" class:withvis={visuals.length}>
  <div class="main">
    <StepHeader {step} {section} />
    <textarea class="field answer" rows="6" bind:value={text} oninput={input} onblur={save} placeholder={step.placeholder ?? store.t.answerPlaceholder}></textarea>
    <div class="tools"><Dictate ontext={(s) => ((text = text ? `${text} ${s}` : s), save())} /></div>
  </div>
  {#if visuals.length}
    <div class="vis">
      {#each visuals as v}<Visual visual={v} project={ss.project} />{/each}
    </div>
  {/if}
</div>

<style>
  .q {
    display: grid;
    gap: 2rem;
    align-content: center;
    max-width: 56rem;
    margin: 0 auto;
    min-height: 100%;
  }
  .q.withvis {
    grid-template-columns: 1fr 1fr;
    max-width: none;
    align-items: center;
  }
  .main {
    display: grid;
    gap: 1.2rem;
  }
  .answer {
    font-size: 1.25rem;
    line-height: 1.5;
    padding: 1rem 1.2rem;
    border-radius: var(--r-card);
  }
  .tools {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .vis {
    background: var(--card);
    border-radius: var(--r-panel);
    padding: 1.25rem;
    box-shadow: var(--shadow-lift);
  }
</style>
