<script lang="ts">
  // Always visible: is an agent connected, and what is it doing right now.
  import { agent } from "../lib/agent.svelte";
  import { store } from "../lib/store.svelte";
  import RequestStatus from "./RequestStatus.svelte";

  const t = $derived(store.t);
  let open = $state(false);
  let copied = $state(false);
  const current = $derived(agent.active[0] ?? agent.queued[0] ?? null);
  const latest = $derived(current?.log.filter((e) => e.kind !== "status").at(-1)?.text);
  const history = $derived(agent.requests.filter((r) => r.status !== "working" && r.status !== "open").slice(-8).reverse());
  const label = $derived(agent.heartbeat?.mode === "listen" ? t.ag.chat : agent.heartbeat?.agent ?? agent.configured ?? "");
</script>

<div class="dock" class:busy={!!current} class:off={!agent.connected}>
  {#if open}
    <div class="panel">
      <header>
        <strong>{t.ag.agent}</strong>
        <span class="muted">{agent.connected ? `${label} · ${current ? t.ag.working : t.ag.ready}` : t.ag.offline}</span>
        <button class="x" onclick={() => (open = false)} aria-label="close">×</button>
      </header>
      {#if !agent.connected}
        <div class="howto">
          <p>{t.ag.offlineHint}</p>
          <button class="cmd" onclick={() => (navigator.clipboard.writeText("omgp work"), (copied = true))}><code>omgp work</code><span>{copied ? t.copied : "⧉"}</span></button>
          <p class="muted">{t.ag.orConfigure}</p>
        </div>
      {/if}
      {#each [...agent.active, ...agent.queued] as r (r.id)}
        <RequestStatus request={r} lines={8} />
      {/each}
      {#if history.length}
        <h3>{t.ag.history}</h3>
        {#each history as r (r.id)}
          <RequestStatus request={r} lines={2} />
        {/each}
      {:else if !current}
        <p class="muted">{t.ag.empty}</p>
      {/if}
    </div>
  {/if}
  <button class="pill" onclick={() => (open = !open)} aria-expanded={open}>
    {#if current && current.status === "working" && !agent.orphaned(current)}
      <span class="spin"></span>
      <span class="what"><b>{t.ag.kinds[current.kind]}</b>{#if latest} · {latest}{/if}</span>
      <span class="time">{agent.elapsed(current)}</span>
    {:else if current}
      <span class="dot warn"></span><span class="what"><b>{t.ag.kinds[current.kind]}</b> · {agent.orphaned(current) ? t.ag.nobody : t.ag.queued}</span>
    {:else}
      <span class="dot" class:on={agent.connected}></span>
      <span class="what">{agent.connected ? `${t.ag.agent} ${t.ag.ready}` : t.ag.offline}</span>
    {/if}
  </button>
</div>

<style>
  .dock {
    position: fixed;
    left: 50%;
    bottom: 0.85rem;
    translate: -50% 0;
    z-index: 35;
    display: grid;
    justify-items: center;
    gap: 0.5rem;
    pointer-events: none;
  }
  .dock > * {
    pointer-events: auto;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    max-width: min(34rem, 80vw);
    height: 2.1rem;
    padding: 0 0.9rem;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: var(--card);
    box-shadow: 0 8px 24px -14px rgba(27, 36, 48, 0.45);
    font-size: 0.82rem;
    color: var(--ink-2);
    opacity: 0.75;
    transition: opacity 0.15s;
  }
  .pill:hover,
  .busy .pill {
    opacity: 1;
  }
  .busy .pill {
    border-color: var(--ai);
    background: var(--ai-soft);
    color: var(--ink);
  }
  .what {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .what b {
    color: var(--ai);
  }
  .time {
    font-variant-numeric: tabular-nums;
    color: var(--ink-3);
  }
  .dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--fog);
    flex: none;
  }
  .dot.on {
    background: var(--should);
  }
  .dot.warn {
    background: var(--block);
  }
  .spin {
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
  .panel {
    width: min(30rem, 92vw);
    max-height: 60vh;
    overflow: auto;
    display: grid;
    gap: 0.6rem;
    padding: 0.9rem;
    background: var(--paper);
    border-radius: var(--r-panel);
    box-shadow: 0 24px 60px -24px rgba(27, 36, 48, 0.55), 0 0 0 1px var(--line);
    animation: up 0.18s var(--ease);
  }
  @keyframes up {
    from {
      transform: translateY(8px);
      opacity: 0;
    }
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  header .muted {
    flex: 1;
    font-size: 0.85rem;
  }
  .x {
    border: 0;
    background: none;
    font-size: 1.2rem;
    color: var(--ink-3);
  }
  h3 {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--ink-3);
    margin-top: 0.3rem;
  }
  .howto {
    display: grid;
    gap: 0.4rem;
    font-size: 0.88rem;
  }
  .cmd {
    justify-self: start;
    display: inline-flex;
    gap: 0.8rem;
    align-items: center;
    border: 0;
    background: var(--ink);
    color: #fff;
    padding: 0.45rem 0.8rem;
    border-radius: 8px;
  }
  .cmd code {
    font-size: 0.9rem;
  }
</style>
