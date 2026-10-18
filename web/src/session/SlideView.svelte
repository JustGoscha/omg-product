<script lang="ts">
  import StepHeader from "./StepHeader.svelte";
  import Visual from "../visuals/Visual.svelte";
  import type { StepT } from "../lib/types";
  import type { SessionState } from "./state.svelte";

  let { step, section, ss }: { step: StepT; section: string; ss: SessionState } = $props();
  const visuals = $derived([...(step.visual ? [step.visual] : []), ...(step.visuals ?? [])]);
  const comment = (a: any) => ss.act({ op: "annotate", annotation: { ...a, id: `a-${Date.now().toString(36)}`, step: step.id } });
</script>

<div class="slide" class:solo={!visuals.length}>
  <div class="text">
    <StepHeader {step} {section} />
  </div>
  {#if visuals.length}
    <div class="visuals">
      {#each visuals as v}
        <div class="vis"><Visual visual={v} project={ss.project} annotations={ss.results.annotations} oncomment={comment} ondelete={(id) => ss.act({ op: "unannotate", id })} author={ss.author} /></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .slide {
    display: grid;
    grid-template-columns: minmax(18rem, 2fr) 3fr;
    gap: clamp(1.5rem, 4vw, 4rem);
    align-items: center;
    min-height: 100%;
  }
  .slide.solo {
    grid-template-columns: 1fr;
    justify-items: center;
    align-content: center;
  }
  .slide.solo .text {
    max-width: 50rem;
  }
  .visuals {
    display: grid;
    gap: 1.25rem;
    min-width: 0;
  }
  .vis {
    background: var(--card);
    border-radius: var(--r-panel);
    padding: clamp(0.75rem, 2vw, 1.5rem);
    box-shadow: var(--shadow-lift);
    max-height: calc(100dvh - 15rem);
    overflow: hidden;
    display: flex;
    justify-content: center;
  }
  /* diagrams shrink to fit the slide instead of making it scroll */
  .vis :global(.visual) {
    width: 100%;
    overflow: visible;
  }
  .vis :global(svg.diagram) {
    width: auto !important;
    max-width: 100% !important;
    min-width: 0 !important;
    max-height: calc(100dvh - 18rem);
    margin: 0 auto;
    display: block;
  }
  @media (max-width: 900px) {
    .slide {
      grid-template-columns: 1fr;
    }
  }
</style>
