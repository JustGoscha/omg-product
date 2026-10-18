<script lang="ts">
  // Text that turns into an input on click. Saves on Enter (⌘Enter when multi-line).
  import { store } from "../lib/store.svelte";
  import { ApiError } from "../lib/api";
  import type { Snippet } from "svelte";
  import MarkdownEditor from "./MarkdownEditor.svelte";

  let {
    value,
    onsave,
    multiline = false,
    markdown = false,
    placeholder = "",
    disabled = false,
    children,
  }: {
    value: string | undefined;
    onsave: (next: string, prev: string) => Promise<unknown>;
    multiline?: boolean;
    /** edit as formatted text (WYSIWYG) instead of a plain field */
    markdown?: boolean;
    placeholder?: string;
    disabled?: boolean;
    children?: Snippet;
  } = $props();

  let editing = $state(false);
  let draft = $state("");
  let error = $state<string | null>(null);
  let busy = $state(false);
  let input = $state<HTMLInputElement | HTMLTextAreaElement>();

  function start(e?: Event) {
    if (disabled) return;
    e?.stopPropagation();
    draft = value ?? "";
    error = null;
    editing = true;
    requestAnimationFrame(() => {
      input?.focus();
      if (input instanceof HTMLTextAreaElement) fit();
    });
  }
  function fit() {
    if (!(input instanceof HTMLTextAreaElement)) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight + 2}px`;
  }
  async function save() {
    if (draft === (value ?? "")) return (editing = false);
    busy = true;
    try {
      await onsave(draft, value ?? "");
      editing = false;
    } catch (e) {
      error = e instanceof ApiError && e.conflict ? store.t.cm.conflict : (e as Error).message;
    } finally {
      busy = false;
    }
  }
  function keys(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Escape") editing = false;
    if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) (e.preventDefault(), save());
  }
</script>

{#if editing && markdown}
  <div class="mdedit">
    <MarkdownEditor value={value} compact {placeholder}
      oncancel={() => (editing = false)}
      onsave={async (md) => {
        try {
          await onsave(md, value ?? "");
          editing = false;
        } catch (e) {
          throw new Error(e instanceof ApiError && e.conflict ? store.t.cm.conflict : (e as Error).message);
        }
      }} />
  </div>
{:else if editing}
  <span class="edit" class:multi={multiline}>
    {#if multiline}
      <textarea class="field" bind:this={input} bind:value={draft} oninput={fit} onkeydown={keys} onblur={save} {placeholder} disabled={busy}></textarea>
    {:else}
      <input class="field" bind:this={input} bind:value={draft} onkeydown={keys} onblur={save} {placeholder} disabled={busy} />
    {/if}
    {#if error}<span class="err">{error}</span>{/if}
  </span>
{:else}
  <span class="view" class:empty={!value} class:disabled role="button" tabindex={disabled ? -1 : 0} onclick={start} onkeydown={(e) => e.key === "Enter" && start(e)}>
    {#if children && value}{@render children()}{:else}{value || (disabled ? "" : placeholder)}{/if}<span class="pen" aria-hidden="true">✎</span>
  </span>
{/if}

<style>
  .mdedit {
    font-size: 1rem;
    color: var(--ink);
    text-align: left;
  }
  .view {
    border-radius: 6px;
    cursor: text;
    transition: background 0.12s;
  }
  .view:not(.disabled):hover {
    background: rgba(27, 36, 48, 0.05);
    box-shadow: 0 0 0 4px rgba(27, 36, 48, 0.05);
  }
  .view.disabled {
    cursor: inherit;
  }
  .pen {
    font-size: 0.7em;
    margin-left: 0.3em;
    color: var(--ink-3);
    opacity: 0;
  }
  .view:not(.disabled):hover .pen {
    opacity: 1;
  }
  .empty {
    color: var(--fog);
  }
  .edit {
    display: grid;
    gap: 0.2rem;
  }
  .edit .field {
    font: inherit;
    color: inherit;
    padding: 0.15em 0.35em;
    margin: -0.2em -0.4em;
    border-color: var(--beacon);
    box-shadow: 0 0 0 3px var(--beacon-soft);
    resize: none;
    overflow: hidden;
    width: calc(100% + 0.8em);
  }
  .err {
    color: var(--block);
    font-size: 0.8rem;
    font-weight: 650;
  }
</style>
