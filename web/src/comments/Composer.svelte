<script lang="ts">
  // Write a new comment. Asks once for a name, then remembers it on this device.
  import { store } from "../lib/store.svelte";

  let {
    quote,
    onsubmit,
    onagent,
    oncancel,
    autofocus = true,
  }: { quote?: string; onsubmit: (text: string) => void; onagent?: (text: string) => void; oncancel?: () => void; autofocus?: boolean } = $props();
  const t = $derived(store.t);
  let text = $state("");
  let name = $state(store.author);
  let area = $state<HTMLTextAreaElement>();

  $effect(() => {
    if (autofocus) area?.focus();
  });

  function submit(agent = false) {
    if (!text.trim()) return;
    if (!store.author && name.trim()) store.setAuthor(name);
    (agent && onagent ? onagent : onsubmit)(text.trim());
    text = "";
  }
</script>

<form class="composer" onsubmit={(e) => (e.preventDefault(), submit())}>
  {#if quote}<blockquote>{quote.length > 160 ? quote.slice(0, 159) + "…" : quote}</blockquote>{/if}
  {#if !store.author}
    <input class="field name" bind:value={name} placeholder={t.cm.yourName} />
  {/if}
  <textarea
    class="field"
    rows="3"
    bind:this={area}
    bind:value={text}
    placeholder={t.cm.placeholder}
    onkeydown={(e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.preventDefault(), submit());
      if (e.key === "Escape") oncancel?.();
    }}
  ></textarea>
  <div class="row">
    <span class="kbd">⌘↵</span>
    <span class="grow"></span>
    {#if oncancel}<button type="button" class="btn small ghost" onclick={oncancel}>{t.cm.cancel}</button>{/if}
    {#if onagent}
      <button type="button" class="btn small ai" disabled={!text.trim() || (!store.author && !name.trim())} onclick={() => submit(true)}>✦ {t.cm.sendToAgent}</button>
    {/if}
    <button type="submit" class="btn small primary" disabled={!text.trim() || (!store.author && !name.trim())}>{t.cm.comment}</button>
  </div>
</form>

<style>
  .composer {
    display: grid;
    gap: 0.5rem;
  }
  blockquote {
    margin: 0;
    padding: 0.3rem 0.6rem;
    border-left: 3px solid var(--beacon);
    background: var(--beacon-soft);
    border-radius: 0 6px 6px 0;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .name {
    padding: 0.4rem 0.6rem;
  }
  textarea {
    font-size: 0.95rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .grow {
    flex: 1;
  }
  .btn.ai {
    border-color: var(--ai);
    color: var(--ai);
  }
</style>
