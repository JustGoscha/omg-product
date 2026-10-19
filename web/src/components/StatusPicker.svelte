<script lang="ts">
  // Stage and reach of a project as two chips you can change in place; saved into project.md.
  import { store } from "../lib/store.svelte";
  import { api } from "../lib/api";
  import { isStatic } from "../lib/static";
  import { stageColor, stageSoft } from "../lib/stages";
  import { reaches } from "../../../src/core/pulse";
  import { stages } from "../../../src/core/schema";
  import type { ProjectInfo } from "../lib/types";

  let { project: p, small = false, onshelve }: { project: ProjectInfo; small?: boolean; onshelve?: () => void } = $props();
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
  // snooze for a while, or shelve as a zombie that comes up rarely; "" brings it back
  const today = new Date();
  const until = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const snoozedNow = $derived(!!p.snoozed && p.snoozed >= until(0));
  const cfg = $derived(store.ws?.config);
  const canKill = $derived(cfg?.pulse?.kill ?? cfg?.profile?.kind !== "company");
  const out = $derived(p.shelved || snoozedNow || p.stage === "dropped");
  async function shelf(v: string) {
    if (v === "shelve") await set({ shelved: true, snoozed: null });
    else if (v === "kill") await set({ stage: "dropped", shelved: null, snoozed: null });
    else if (v === "back") await set({ shelved: null, snoozed: null, ...(p.stage === "dropped" ? { stage: "paused" } : {}) });
    else await set({ snoozed: until(Number(v)), shelved: null });
    onshelve?.();
  }
  // the chip must not choose the card it sits on
  const stop = (e: Event) => e.stopPropagation();
</script>

<span class="picker" class:small onclick={stop} onkeydown={stop} onpointerdown={stop} role="presentation">
  <label class="chip" style="color:{stageColor(p.stage)};background:{stageSoft(p.stage)}" title={t.status.builtHint}>
    <select value={p.stage} disabled={isStatic} onchange={(e) => set({ stage: (e.target as HTMLSelectElement).value })}>
      {#each stages as s}<option value={s}>{t.rm.stages[s] ?? s}</option>{/each}
    </select>
    <span><b>{t.status.built}</b> {t.rm.stages[p.stage] ?? p.stage} ▾</span>
  </label>
  <label class="chip reach" class:unset={!p.reach} title={t.status.outHint}>
    <select value={p.reach ?? ""} disabled={isStatic} onchange={(e) => set({ reach: (e.target as HTMLSelectElement).value || null })}>
      <option value="">—</option>
      {#each reaches as r}<option value={r}>{t.reach[r]}</option>{/each}
    </select>
    <span><b>{t.status.out}</b> {p.reach ? t.reach[p.reach] : "?"} ▾</span>
  </label>
  <label class="chip shelf" class:on={out} class:dead={p.stage === "dropped"} title={t.shelf.hint}>
    <select value="" disabled={isStatic} onchange={(e) => shelf((e.target as HTMLSelectElement).value)}>
      <option value="" disabled selected>{t.shelf.title}</option>
      <option value="7">{t.shelf.snooze(t.shelf.week)}</option>
      <option value="30">{t.shelf.snooze(t.shelf.month)}</option>
      <option value="90">{t.shelf.snooze(t.shelf.months3)}</option>
      <option value="shelve">{t.shelf.shelve}</option>
      {#if canKill && p.stage !== "dropped"}<option value="kill">{t.shelf.kill}</option>{/if}
      {#if out}<option value="back">{t.shelf.back}</option>{/if}
    </select>
    <span>{p.stage === "dropped" ? t.shelf.killed : p.shelved ? t.shelf.zombie : snoozedNow ? t.shelf.until(p.snoozed!) : "💤"} ▾</span>
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
  .shelf {
    background: var(--paper-2);
    color: var(--ink-3);
  }
  .shelf.on {
    background: var(--no-soft);
    color: var(--ink-2);
  }
  .shelf.dead {
    background: #f6dcdc;
    color: #8f2a2a;
  }
  .reach.unset {
    background: var(--paper-2);
    color: var(--ink-3);
  }
  b {
    font-weight: 600;
    opacity: 0.7;
    margin-right: 0.25rem;
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
