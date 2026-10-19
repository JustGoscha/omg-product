<script lang="ts">
  // Stage and reach of a project as two chips you can change in place; saved into project.md.
  import { store } from "../lib/store.svelte";
  import { api } from "../lib/api";
  import { isStatic } from "../lib/static";
  import { stageColor, stageSoft } from "../lib/stages";
  import { reaches } from "../../../src/core/pulse";
  import { stages } from "../../../src/core/schema";
  import type { ProjectInfo } from "../lib/types";

  let { project: p, small = false }: { project: ProjectInfo; small?: boolean } = $props();
  const t = $derived(store.t);
  let error = $state<string | null>(null);

  async function set(patch: Record<string, unknown>) {
    try {
      error = null;
      await api.patchProject(p.id, patch);
      await store.load();
    } catch (e) {
      error = (e as Error).message;
    }
  }
  // the chip must not choose the card it sits on
  const stop = (e: Event) => e.stopPropagation();
</script>

<span class="picker" class:small onclick={stop} onkeydown={stop} onpointerdown={stop} role="presentation">
  <label class="chip" style="color:{stageColor(p.stage)};background:{stageSoft(p.stage)}" title={t.facts.stage}>
    <select value={p.stage} disabled={isStatic} onchange={(e) => set({ stage: (e.target as HTMLSelectElement).value })}>
      {#each stages as s}<option value={s}>{t.rm.stages[s] ?? s}</option>{/each}
    </select>
    <span>{t.rm.stages[p.stage] ?? p.stage} ▾</span>
  </label>
  <label class="chip reach" title={t.facts.reach}>
    <select value={p.reach ?? ""} disabled={isStatic} onchange={(e) => set({ reach: (e.target as HTMLSelectElement).value || null })}>
      <option value="">—</option>
      {#each reaches as r}<option value={r}>{t.reach[r]}</option>{/each}
    </select>
    <span>{p.reach ? t.reach[p.reach] : t.facts.reach} ▾</span>
  </label>
  {#if error}<span class="err">{error}</span>{/if}
</span>

<style>
  .picker {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    font-size: 0.8rem;
    font-weight: 750;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    cursor: pointer;
  }
  .small .chip {
    font-size: 0.75rem;
    padding: 0.15rem 0.6rem;
  }
  .chip:hover {
    box-shadow: 0 0 0 1.5px currentColor;
  }
  .reach {
    background: var(--nice-soft);
    color: var(--nice);
  }
  /* the native select sits invisibly on top: real dropdown, chip look */
  select {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    font-size: 16px;
  }
  .err {
    color: #b3261e;
    font-size: 0.75rem;
  }
</style>
