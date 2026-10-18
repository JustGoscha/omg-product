<script lang="ts">
  import { store } from "../lib/store.svelte";
  import ThreadCard from "./ThreadCard.svelte";
  import Composer from "./Composer.svelte";
  import type { AnchoredThread, CommentTargetT } from "../lib/types";
  import type { Comments } from "../lib/comments.svelte";

  let {
    comments,
    filter,
    filterLabel,
    active = null,
    draft = null,
    onclose,
    ondraftdone,
    onfocus,
  }: {
    comments: Comments;
    filter?: (t: AnchoredThread) => boolean;
    filterLabel?: string;
    active?: string | null;
    draft?: { target: CommentTargetT; quote?: string } | null;
    onclose: () => void;
    ondraftdone?: (threadId: string | null) => void;
    onfocus?: (t: AnchoredThread) => void;
  } = $props();

  const t = $derived(store.t);
  let showResolved = $state(false);
  let onlyFiltered = $state(true);
  const list = $derived(
    comments.threads
      .filter((x) => !filter || !onlyFiltered || filter(x))
      .filter((x) => showResolved || x.status === "open" || x.id === active)
      .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "open" ? -1 : 1)),
  );
  const open = $derived(comments.threads.filter((x) => x.status === "open").length);
</script>

<aside class="panel">
  <header>
    <h2>{t.cm.comments} <span>{open}</span></h2>
    <button class="btn small ghost" onclick={onclose} aria-label="close">×</button>
  </header>
  <div class="filters">
    {#if filter}
      <div class="seg">
        <button class:on={onlyFiltered} onclick={() => (onlyFiltered = true)}>{filterLabel ?? t.cm.thisStep}</button>
        <button class:on={!onlyFiltered} onclick={() => (onlyFiltered = false)}>{t.cm.all}</button>
      </div>
    {/if}
    <label><input type="checkbox" bind:checked={showResolved} /> {t.cm.showResolved}</label>
  </div>

  {#if draft && !comments.readOnly}
    <div class="draft">
      <Composer
        quote={draft.quote}
        onsubmit={(text) => ondraftdone?.(comments.add(draft!.target, text))}
        onagent={(text) => comments.addForAgent(draft!.target, text).then((id) => ondraftdone?.(id))}
        oncancel={() => ondraftdone?.(null)}
      />
    </div>
  {/if}

  <div class="list">
    {#each list as th (th.id)}
      <ThreadCard thread={th} {comments} active={th.id === active} onfocus={() => onfocus?.(th)} />
    {:else}
      {#if !draft}<p class="muted empty">{filter && onlyFiltered ? t.cm.noneHere : t.cm.none}</p>{/if}
    {/each}
  </div>
</aside>

<style>
  .panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(25rem, 94vw);
    z-index: 25;
    display: grid;
    grid-template-rows: auto auto auto 1fr;
    gap: 0.7rem;
    padding: 1rem;
    background: var(--paper);
    border-left: 1.5px solid var(--line);
    box-shadow: -20px 0 40px -24px rgba(27, 36, 48, 0.4);
    animation: slide 0.2s var(--ease);
  }
  @keyframes slide {
    from {
      transform: translateX(20px);
      opacity: 0;
    }
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    font-size: 1.3rem;
  }
  h2 span {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--ink-3);
  }
  .filters {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .filters label {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
  }
  .seg {
    display: inline-flex;
    background: var(--paper-2);
    border-radius: 999px;
    padding: 3px;
  }
  .seg button {
    border: 0;
    background: transparent;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-weight: 650;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .seg button.on {
    background: var(--card);
    color: var(--ink);
    box-shadow: 0 1px 3px rgba(27, 36, 48, 0.15);
  }
  .draft {
    padding: 0.8rem;
    background: var(--card);
    border-radius: var(--r-card);
    box-shadow: 0 0 0 2px var(--beacon);
  }
  .list {
    display: grid;
    gap: 0.7rem;
    align-content: start;
    overflow: auto;
    min-height: 0;
    padding: 2px;
  }
  .empty {
    font-size: 0.9rem;
  }
</style>
