<script lang="ts">
  import { md } from "../lib/md";
  import { store } from "../lib/store.svelte";
  import EditableText from "../comments/EditableText.svelte";
  import { useReview } from "./review";
  import type { StepT } from "../lib/types";

  let { step, section, center = false }: { step: StepT; section: string; center?: boolean } = $props();
  const t = $derived(store.t);
  const review = useReview();
  const open = $derived(review?.threadsOf(step.id).filter((x) => x.status === "open").length ?? 0);
</script>

<header class:center>
  <div class="meta">
    <span class="section">{section}</span>
    {#if step.level}<span class="chip lvl-{step.level}">{t.levels[step.level]}</span>{/if}
    {#if step.timing}<span class="chip" class:later={step.timing === "later"}>{t.timing[step.timing]}</span>{/if}
    {#if step.reversibility}<span class="chip" class:oneway={step.reversibility === "one-way"}>{t.reversibility[step.reversibility]}</span>{/if}
    {#if review}
      <button class="bubble" class:on={open} title={t.cm.comment}
        onclick={() => review.discuss(step.id, open ? null : { target: { kind: "step", file: review.file, step: step.id }, quote: step.title })}>💬{open ? ` ${open}` : ""}</button>
    {/if}
  </div>
  <h1><EditableText value={step.title} disabled={!review} onsave={(n, p) => review!.edit(step.id, ["title"], n, p)} /></h1>
  {#if step.body || review}
    <div class="body">
      <EditableText value={step.body} multiline markdown disabled={!review} placeholder="+ text" onsave={(n, p) => review!.edit(step.id, ["body"], n, p)}>
        <div class="md">{@html md(step.body)}</div>
      </EditableText>
    </div>
  {/if}
</header>

<style>
  header {
    display: grid;
    gap: 0.9rem;
    max-width: 56rem;
  }
  header.center {
    margin: 0 auto;
    text-align: center;
    justify-items: center;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    min-height: 1.6rem;
  }
  .section {
    font-weight: 700;
    color: var(--ink-3);
    margin-right: 0.35rem;
  }
  h1 {
    font-size: clamp(1.9rem, 1.2rem + 2.4vw, 3.2rem);
    font-weight: 680;
  }
  .body {
    font-size: clamp(1.05rem, 0.95rem + 0.4vw, 1.3rem);
    color: var(--ink-2);
    max-width: 44rem;
  }
  .center .body {
    text-align: left;
  }
  .bubble {
    border: 1.5px solid var(--line);
    background: var(--card);
    border-radius: 999px;
    height: 1.6rem;
    padding: 0 0.55rem;
    font-size: 0.78rem;
    font-weight: 750;
    opacity: 0.5;
    transition: opacity 0.15s;
  }
  header:hover .bubble,
  .bubble.on {
    opacity: 1;
  }
  .bubble.on {
    background: var(--beacon);
    border-color: var(--beacon);
  }
  .lvl-tech {
    background: var(--ai-soft);
    color: var(--ai);
  }
  .lvl-product {
    background: var(--beacon-soft);
    color: #7a5600;
  }
  .lvl-ux {
    background: var(--nice-soft);
    color: var(--nice);
  }
  .lvl-business {
    background: var(--should-soft);
    color: var(--should);
  }
  .chip.later {
    background: transparent;
    border: 1.5px dashed var(--fog);
  }
  .chip.oneway {
    background: var(--block-soft);
    color: var(--block);
  }
</style>
