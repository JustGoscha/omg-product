<script lang="ts">
  // Where the agent dock sits when a server runs: says this is a static demo, links to the repo.
  import { store } from "../lib/store.svelte";
  import { REPO_URL } from "../lib/static";

  const t = $derived(store.t);
</script>

<a class="demo" href={REPO_URL} target="_blank" rel="noreferrer" title={t.demo.hint}>
  <b>{t.demo.badge}</b>
  <span>{t.demo.source} ↗</span>
</a>

<style>
  .demo {
    position: fixed;
    left: 50%;
    bottom: 0.85rem;
    translate: -50% 0;
    z-index: 35;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    height: 2.1rem;
    padding: 0 0.9rem 0 0.35rem;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: var(--card);
    box-shadow: 0 8px 24px -14px rgba(27, 36, 48, 0.45);
    font-size: 0.82rem;
    color: var(--ink-2);
    text-decoration: none;
    white-space: nowrap;
    opacity: 0.75;
    transition: opacity 0.15s;
  }
  .demo:hover {
    opacity: 1;
  }
  b {
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    background: var(--beacon);
    color: var(--ink);
    font-weight: 800;
  }
</style>
