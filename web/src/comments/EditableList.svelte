<script lang="ts">
  // A list of short lines (pros, cons, …): edit, remove, add, or comment on a line.
  import { mdInline } from "../lib/md";
  import { store } from "../lib/store.svelte";
  import { ApiError } from "../lib/api";

  let {
    items,
    onsave,
    oncomment,
    commented = new Set<number>(),
  }: {
    items: string[];
    onsave: (next: string[], prev: string[]) => Promise<unknown>;
    oncomment?: (index: number, text: string) => void;
    commented?: Set<number>;
  } = $props();

  const t = $derived(store.t);
  let editing = $state<number | null>(null);
  let draft = $state("");
  let error = $state<string | null>(null);
  let input = $state<HTMLInputElement>();

  function start(i: number) {
    editing = i;
    draft = i < items.length ? items[i] : "";
    error = null;
    requestAnimationFrame(() => input?.focus());
  }
  async function commit(next: string[]) {
    try {
      await onsave(next, items);
      editing = null;
    } catch (e) {
      error = e instanceof ApiError && e.conflict ? t.cm.conflict : (e as Error).message;
    }
  }
  function save() {
    if (editing === null) return;
    const i = editing;
    const text = draft.trim();
    if (i >= items.length) return text ? commit([...items, text]) : (editing = null);
    if (!text) return commit(items.filter((_, j) => j !== i));
    if (text === items[i]) return (editing = null);
    commit(items.map((x, j) => (j === i ? text : x)));
  }
  const keys = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") (e.preventDefault(), save());
    if (e.key === "Escape") editing = null;
  };
</script>

<ul class="elist">
  {#each items as item, i}
    <li class:commented={commented.has(i)} class:editing={editing === i}>
      {#if editing === i}
        <input class="field" bind:this={input} bind:value={draft} onkeydown={keys} onblur={save} />
      {:else}
        <span class="txt" role="button" tabindex="0" onclick={() => start(i)} onkeydown={(e) => e.key === "Enter" && (e.stopPropagation(), start(i))}>{@html mdInline(item)}</span>
        <span class="acts">
          {#if oncomment}<button title={t.cm.comment} onclick={(e) => (e.stopPropagation(), oncomment(i, item))}>💬</button>{/if}
          <button title={t.cm.remove} onclick={(e) => (e.stopPropagation(), commit(items.filter((_, j) => j !== i)))}>×</button>
        </span>
      {/if}
    </li>
  {/each}
  {#if editing === items.length}
    <li><input class="field" bind:this={input} bind:value={draft} onkeydown={keys} onblur={save} /></li>
  {:else}
    <li class="add"><button onclick={() => start(items.length)}>+ {t.cm.add}</button></li>
  {/if}
</ul>
{#if error}<p class="err">{error}</p>{/if}

<style>
  .elist {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.2rem;
  }
  li {
    position: relative;
  }
  li.commented .txt {
    background: var(--beacon-soft);
    box-shadow: 0 0 0 3px var(--beacon-soft);
  }
  .txt {
    display: inline;
    border-radius: 4px;
    cursor: text;
    padding: 0.05rem 0.1rem;
  }
  .txt:hover {
    background: rgba(27, 36, 48, 0.05);
  }
  .acts {
    display: inline-flex;
    gap: 0.1rem;
    margin-left: 0.25rem;
    opacity: 0;
    vertical-align: middle;
  }
  li:hover .acts {
    opacity: 1;
  }
  .acts button,
  .add button {
    border: 0;
    background: transparent;
    padding: 0 0.25rem;
    border-radius: 4px;
    font-size: 0.8rem;
    color: var(--ink-3);
  }
  .acts button:hover,
  .add button:hover {
    background: var(--paper-2);
    color: var(--ink);
  }
  .add {
    list-style: none;
    margin-left: -1.1rem;
  }
  .add button {
    opacity: 0.6;
  }
  .elist:hover .add button {
    opacity: 1;
  }
  .field {
    padding: 0.15rem 0.4rem;
    font-size: inherit;
    border-color: var(--beacon);
  }
  .err {
    color: var(--block);
    font-size: 0.8rem;
  }
</style>
