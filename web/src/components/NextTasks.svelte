<script lang="ts">
  // A project's next tasks as a todo list: tick one off, click to edit, add up to three.
  // Saved as `next` in project.md.
  import { store } from "../lib/store.svelte";
  import { api } from "../lib/api";
  import { isStatic } from "../lib/static";
  import type { ProjectInfo } from "../lib/types";

  const MAX = 3;
  let { project: p }: { project: ProjectInfo } = $props();
  const t = $derived(store.t);
  const tasks = $derived(p.next ?? []);
  let ticking = $state<number | null>(null);
  let editing = $state<number | null>(null);
  let draft = $state("");
  let adding = $state("");
  let error = $state<string | null>(null);

  async function save(next: string[]) {
    try {
      error = null;
      await api.patchProject(p.id, { next: next.map((s) => s.trim()).filter(Boolean).slice(0, MAX) });
      await store.load();
    } catch (e) {
      error = (e as Error).message;
    }
  }
  async function tick(i: number) {
    if (ticking !== null) return;
    ticking = i;
    await new Promise((r) => setTimeout(r, 380));
    await save(tasks.filter((_, j) => j !== i));
    ticking = null;
  }
  function edit(i: number) {
    if (isStatic) return;
    editing = i;
    draft = tasks[i];
  }
  async function commit() {
    if (editing === null) return;
    const i = editing;
    editing = null;
    if (draft.trim() !== tasks[i]) await save(tasks.map((x, j) => (j === i ? draft : x)));
  }
  async function add() {
    if (!adding.trim()) return;
    const v = adding;
    adding = "";
    await save([...tasks, v]);
  }
  const focusOnMount = (el: HTMLInputElement) => el.focus();
</script>

<section class="next">
  <h2>{t.todo.next} <span class="count">{tasks.length}/{MAX}</span></h2>
  <ul>
    {#each tasks as task, i (task + i)}
      <li class:first={i === 0} class:going={ticking === i}>
        <button class="box" disabled={isStatic} title={t.todo.done} aria-label={t.todo.done} onclick={() => tick(i)}></button>
        {#if editing === i}
          <input
            class="edit"
            bind:value={draft}
            use:focusOnMount
            onkeydown={(e) => (e.key === "Enter" ? commit() : e.key === "Escape" ? (editing = null) : null)}
            onblur={commit}
          />
        {:else}
          <button class="text" disabled={isStatic} title={t.todo.edit} onclick={() => edit(i)}>{task}</button>
        {/if}
      </li>
    {/each}
    {#if tasks.length < MAX && !isStatic}
      <li class="add">
        <span class="plus" aria-hidden="true">+</span>
        <input
          bind:value={adding}
          placeholder={tasks.length ? t.todo.addMore : t.todo.addFirst}
          onkeydown={(e) => e.key === "Enter" && add()}
          onblur={add}
        />
      </li>
    {/if}
  </ul>
  {#if error}<p class="err">{error}</p>{/if}
</section>

<style>
  .next {
    max-width: 44rem;
    padding: 0.9rem 1rem 0.7rem;
    border-radius: 16px;
    background: linear-gradient(160deg, #ffffff 0%, #f3f6f4 100%);
    border: 1.5px solid var(--should-soft);
    box-shadow: 0 10px 28px -18px rgba(27, 36, 48, 0.35);
  }
  h2 {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--should);
    margin: 0 0 0.35rem 0.2rem;
  }
  .count {
    color: var(--ink-3);
    font-weight: 600;
    margin-left: 0.3rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.1rem;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.3rem 0.2rem;
    border-radius: 10px;
  }
  li:hover {
    background: rgba(27, 36, 48, 0.03);
  }
  .box {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border-radius: 6px;
    border: 1.5px solid var(--ink-3);
    background: var(--card);
    box-shadow: inset 1px 1px 2px rgba(27, 36, 48, 0.12);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.15s, border-color 0.15s;
  }
  .box:hover {
    border-color: var(--should);
  }
  .going .box {
    background: var(--should);
    border-color: var(--should);
  }
  .going .box::after {
    content: "✓";
    color: #fff;
    font-size: 0.8rem;
    font-weight: 800;
    line-height: 1;
  }
  .text {
    flex: 1;
    min-width: 0;
    padding: 0.15rem 0.2rem;
    border: 0;
    background: none;
    font: inherit;
    font-size: 1rem;
    text-align: left;
    color: var(--ink-2);
    cursor: text;
    border-radius: 6px;
    transition: opacity 0.3s;
  }
  .first .text {
    font-size: 1.12rem;
    font-weight: 700;
    color: var(--ink);
  }
  .going .text {
    text-decoration: line-through;
    opacity: 0.45;
  }
  .edit,
  .add input {
    flex: 1;
    min-width: 0;
    font: inherit;
    font-size: 1rem;
    padding: 0.25rem 0.45rem;
    border-radius: 8px;
    border: 1.5px solid var(--line);
    background: var(--card);
    color: var(--ink);
  }
  .edit:focus,
  .add input:focus {
    outline: none;
    border-color: var(--should);
  }
  .add input {
    border-color: transparent;
    background: transparent;
  }
  .add input:hover {
    border-color: var(--line);
  }
  .plus {
    width: 1.25rem;
    text-align: center;
    color: var(--ink-3);
    font-weight: 700;
    font-size: 1.1rem;
  }
  .err {
    color: #b3261e;
    font-size: 0.8rem;
  }
</style>
