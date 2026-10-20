<script lang="ts">
  // Built (stage), Out (reach) and the pulse shelf of a project as chip menus; saved into project.md.
  import { store } from "../lib/store.svelte";
  import { api } from "../lib/api";
  import { isStatic } from "../lib/static";
  import { stageColor, stageSoft } from "../lib/stages";
  import { reaches } from "../../../src/core/pulse";
  import { stages } from "../../../src/core/schema";
  import type { ProjectInfo } from "../lib/types";
  import ChipMenu, { type ChipOption } from "./ChipMenu.svelte";

  let { project: p, small = false, onshelve }: { project: ProjectInfo; small?: boolean; onshelve?: () => void } = $props();
  const t = $derived(store.t);
  let error = $state<string | null>(null);

  const STAGE_EMOJI: Record<string, string> = {
    idea: "💡", exploring: "🔍", prototyping: "🧪", kickoff: "🤝", scoped: "📐", building: "🔨",
    rollout: "🚢", measuring: "📊", done: "✅", paused: "⏸️", dropped: "☠️",
  };
  const REACH_EMOJI: Record<string, string> = {
    unreleased: "🔒", ready: "📦", released: "🌐", launched: "📣", marketing: "📈", customers: "💶", improving: "🔁",
  };

  async function set(patch: Record<string, unknown>) {
    try {
      error = null;
      await api.patchProject(p.id, patch);
      await store.load();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  // shelve: out of the duels for a month, then back; kill: never comes back
  const until = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const snoozedNow = $derived(!!p.snoozed && p.snoozed >= until(0));
  const cfg = $derived(store.ws?.config);
  const canKill = $derived(cfg?.pulse?.kill ?? cfg?.profile?.kind !== "company");
  const shelfState = $derived(p.stage === "dropped" ? "kill" : snoozedNow ? "shelve" : "in");
  async function shelf(v: string) {
    if (v === "shelve") await set({ snoozed: until(30) });
    else if (v === "kill") await set({ stage: "dropped", snoozed: null });
    else await set({ snoozed: null, ...(p.stage === "dropped" ? { stage: "paused" } : {}) });
    onshelve?.();
  }

  const stageOptions = $derived<ChipOption[]>(
    stages.map((s) => ({ value: s, emoji: STAGE_EMOJI[s] ?? "•", label: t.rm.stages[s] ?? s, tone: s === "dropped" ? "danger" : undefined })),
  );
  const reachOptions = $derived<ChipOption[]>(reaches.map((r) => ({ value: r, emoji: REACH_EMOJI[r], label: t.reach[r], hint: t.status.reachHint[r] })));
  const shelfOptions = $derived<ChipOption[]>([
    { value: "in", emoji: "🎯", label: t.shelf.in, hint: t.shelf.inHint },
    { value: "shelve", emoji: "💤", label: snoozedNow ? t.shelf.until(p.snoozed!) : t.shelf.shelve, hint: t.shelf.shelveHint },
    ...(canKill || p.stage === "dropped" ? [{ value: "kill", emoji: "☠️", label: t.shelf.kill, hint: t.shelf.killHint, tone: "danger" as const }] : []),
  ]);
</script>

<span class="picker" role="presentation">
  <ChipMenu
    {small}
    options={stageOptions}
    value={p.stage}
    prefix={t.status.built}
    title={t.status.builtHint}
    heading={t.status.builtHint}
    color={stageColor(p.stage)}
    background={stageSoft(p.stage)}
    disabled={isStatic}
    onselect={(v) => set({ stage: v })}
  />
  <ChipMenu
    {small}
    options={reachOptions}
    value={p.reach ?? null}
    suffix={p.openSource ? `· ${t.status.openSource}` : ""}
    toggles={[{ value: "openSource", emoji: "🧑‍💻", label: t.status.openSource, hint: t.status.openSourceHint, on: !!p.openSource }]}
    ontoggle={() => set({ openSource: p.openSource ? null : true })}
    prefix={t.status.out}
    title={t.status.outHint}
    heading={t.status.outHint}
    color={p.reach ? "var(--nice)" : "var(--ink-3)"}
    background={p.reach ? "var(--nice-soft)" : "var(--paper-2)"}
    disabled={isStatic}
    onselect={(v) => set({ reach: v })}
  />
  <ChipMenu
    {small}
    options={shelfOptions}
    value={shelfState}
    iconOnly={shelfState === "in"}
    title={t.shelf.hint}
    heading={t.shelf.title}
    color={shelfState === "kill" ? "#8f2a2a" : "var(--ink-3)"}
    background={shelfState === "kill" ? "#f6dcdc" : shelfState === "shelve" ? "var(--no-soft)" : "var(--paper-2)"}
    disabled={isStatic}
    onselect={shelf}
  />
  {#if error}<span class="err">{error}</span>{/if}
</span>

<style>
  .picker {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .err {
    color: #b3261e;
    font-size: 0.75rem;
  }
</style>
