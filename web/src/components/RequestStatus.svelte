<script lang="ts">
  // One live request: what kind, how long, what the agent is doing right now.
  import { api } from "../lib/api";
  import { agent } from "../lib/agent.svelte";
  import { store } from "../lib/store.svelte";
  import type { RequestT } from "../lib/types";

  let { request: r, lines = 4 }: { request: RequestT; lines?: number } = $props();
  const t = $derived(store.t);
  const orphan = $derived(agent.orphaned(r));
  const log = $derived(r.log.filter((e) => e.kind !== "status" || r.status !== "working").slice(-lines));
  const position = $derived(r.status === "open" ? agent.queued.findIndex((q) => q.id === r.id) + 1 : 0);
</script>

<div class="rs s-{r.status}" class:orphan>
  <div class="head">
    {#if r.status === "working" && !orphan}<span class="spinner"></span>{/if}
    {#if r.status === "done"}<span class="ok">✓</span>{/if}
    <strong>{t.ag.kinds[r.kind]}</strong>
    <span class="meta">
      {#if r.status === "open"}{t.ag.queued}{position > 1 ? ` · #${position}` : ""}{:else}{t.ag.status[r.status]} · {agent.elapsed(r)}{/if}
    </span>
    <span class="grow"></span>
    {#if r.status === "working" || r.status === "open"}
      <button class="mini" onclick={() => api.cancelRequest(r.id)}>{t.ag.cancel}</button>
    {/if}
    {#if r.status === "failed" || r.status === "cancelled" || orphan}
      <button class="mini" onclick={() => api.retryRequest(r.id)}>{t.ag.retry}</button>
    {/if}
  </div>
  {#if orphan}
    <p class="warn">{t.ag.nobody}</p>
  {:else if r.status === "open" && !agent.connected}
    <p class="warn">{t.ag.offline}. <code>omgp work</code></p>
  {/if}
  {#if log.length}
    <ol class="log">
      {#each log as e, i (e.at + i)}
        <li class="k-{e.kind}" class:last={i === log.length - 1 && r.status === "working"}>{e.text}</li>
      {/each}
    </ol>
  {/if}
  {#if r.status === "failed" && r.message}<p class="err">{r.message}</p>{/if}
</div>

<style>
  .rs {
    display: grid;
    gap: 0.45rem;
    padding: 0.7rem 0.85rem;
    border-radius: var(--r-card);
    background: var(--ai-soft);
    color: var(--ink);
    font-size: 0.88rem;
  }
  .rs.s-failed,
  .rs.orphan {
    background: var(--block-soft);
  }
  .rs.s-done {
    background: var(--should-soft);
  }
  .rs.s-cancelled {
    background: var(--paper-2);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }
  .head strong {
    color: var(--ai);
  }
  .s-done .head strong {
    color: var(--should);
  }
  .s-failed .head strong,
  .orphan .head strong {
    color: var(--block);
  }
  .meta {
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }
  .grow {
    flex: 1;
  }
  .ok {
    color: var(--should);
    font-weight: 900;
  }
  .mini {
    border: 1.5px solid currentColor;
    background: transparent;
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--ink-2);
  }
  .spinner {
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 50%;
    border: 2.5px solid var(--ai);
    border-right-color: transparent;
    animation: spin 0.8s linear infinite;
    flex: none;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .log {
    list-style: none;
    margin: 0;
    padding: 0 0 0 0.6rem;
    border-left: 2px solid color-mix(in srgb, var(--ai) 35%, transparent);
    display: grid;
    gap: 0.2rem;
  }
  .log li {
    color: var(--ink-2);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .log .k-tool {
    font-family: var(--font-code);
    font-size: 0.78rem;
    color: var(--ink-3);
  }
  .log .k-error {
    color: var(--block);
  }
  .log .k-status {
    color: var(--ink-3);
    font-style: italic;
  }
  .log li.last {
    color: var(--ink);
    font-weight: 650;
  }
  .log li.last::after {
    content: " …";
    animation: blink 1.2s infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.2;
    }
  }
  .warn,
  .err {
    margin: 0;
    font-weight: 650;
    color: var(--block);
  }
</style>
