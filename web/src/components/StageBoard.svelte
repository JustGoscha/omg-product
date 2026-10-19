<script lang="ts">
  // Where everything stands: one column per phase, one calm card per project with the
  // one thing that comes next. At most 5 cards per column; the rest behind "+N".
  import { store } from "../lib/store.svelte";
  import { href } from "../lib/router.svelte";
  import { stageColor, stageSoft } from "../lib/stages";
  import { addDays, toDate } from "../../../src/core/time";
  import type { ProjectInfo, Span } from "../lib/types";

  type Phase = "discover" | "align" | "deliver" | "learn";
  let {
    projects,
    today,
    perColumn,
    spanOf,
    order,
    pick,
    rankOf,
  }: {
    projects: ProjectInfo[];
    today: string;
    perColumn: number;
    spanOf: (p: ProjectInfo) => Span | null;
    order: (a: ProjectInfo, b: ProjectInfo) => number; // how cards are listed
    pick: (a: ProjectInfo, b: ProjectInfo) => number; // which cards make the cut when not all fit
    rankOf?: (id: string) => number | undefined; // place in the Pulse ranking
  } = $props();
  const t = $derived(store.t);
  const ws = $derived(store.ws);

  const PHASES: { id: Phase; stages: string[] }[] = [
    { id: "discover", stages: ["idea", "exploring", "prototyping"] },
    { id: "align", stages: ["kickoff", "scoped"] },
    { id: "deliver", stages: ["building", "rollout"] },
    { id: "learn", stages: ["measuring", "done"] },
  ];
  let open = $state<Set<Phase>>(new Set());
  const columns = $derived(
    PHASES.map((ph) => {
      const all = projects.filter((p) => ph.stages.includes(p.stage)).sort(order);
      const top = new Set([...all].sort(pick).slice(0, perColumn));
      const shown = open.has(ph.id) ? all : all.filter((p) => top.has(p));
      return { ...ph, all, shown, hidden: all.length - shown.length };
    }),
  );
  const paused = $derived(projects.filter((p) => p.stage === "paused"));
  const toggle = (id: Phase) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    open = next;
  };

  const locale = $derived(ws?.config.locale === "de" ? "de-DE" : "en-GB");
  const dm = (d: string) => toDate(d).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const initiative = (p: ProjectInfo) => ws?.initiatives.find((i) => p.initiatives.includes(i.id));

  /** the one thing that comes next for a project, and whether it needs attention */
  function next(p: ProjectInfo): { text: string; tone?: "warn" | "bad" | "live" } | null {
    const live = p.sessions.find((s) => s.status === "live");
    if (live) return { text: `${t.rm.sessionKinds[live.kind] ?? live.title} ${t.rm.live}`, tone: "live" };
    const meeting = p.sessions.filter((s) => s.date && s.date >= today && s.status !== "done").sort((a, b) => a.date!.localeCompare(b.date!))[0];
    if (meeting) return { text: `${t.rm.sessionKinds[meeting.kind] ?? meeting.title} ${t.rm.on} ${dm(meeting.date!)}`, tone: meeting.date! <= addDays(today, 7) ? "warn" : undefined };
    const conflict = ws?.analysis.conflicts.find((c) => c.project === p.id);
    if (conflict) return { text: conflict.message, tone: "bad" };
    const sp = spanOf(p);
    if (sp && sp.start > today) return { text: `${t.rm.starts} ${dm(sp.start)}` };
    if (sp && (p.stage === "building" || p.stage === "rollout")) {
      if (sp.end < today && !sp.derived) return { text: `${t.rm.overdue} ${dm(sp.end)}`, tone: "bad" };
      if (!sp.derived || sp.derivedSide === "start") return { text: `${t.rm.until} ${dm(sp.end)}` };
    }
    if (["idea", "exploring"].includes(p.stage) && !Object.keys(p.sections).some((k) => k.startsWith("problem"))) return { text: t.rm.noProblem };
    if (!sp && !["done", "measuring"].includes(p.stage)) return { text: t.rm.noDateYet };
    return null;
  }
</script>

<div class="board">
  {#each columns as col}
    <section class="col" aria-label={t.rm.phases[col.id]}>
      <header>
        <h2>{t.rm.phases[col.id]} <span class="n">{col.all.length}</span></h2>
        <p>{col.stages.map((s) => t.rm.stages[s]).join(" · ")}</p>
      </header>
      {#if col.all.length}
        <ul>
          {#each col.shown as p (p.id)}
            {@const n = next(p)}
            {@const i = initiative(p)}
            <li>
              <a class="card" href={href(`/p/${p.id}`)}>
                <span class="top">
                  <span class="stage" style="--s:{stageColor(p.stage)};--sb:{stageSoft(p.stage)}">{t.rm.stages[p.stage] ?? p.stage}</span>
                  {#if p.priority === "urgent"}<span class="prio" title={p.priority}>!!</span>{/if}
                  {#if rankOf?.(p.id)}<span class="rank" title={t.pulse.title}>#{rankOf(p.id)}</span>{/if}
                </span>
                <span class="name">{p.name}</span>
                {#if n}<span class="next {n.tone ?? ''}">{n.text}</span>{/if}
                {#if i}<span class="init"><i style="background:{i.color ?? 'var(--ink-3)'}"></i>{i.name}</span>{/if}
              </a>
            </li>
          {/each}
        </ul>
        {#if col.hidden || (open.has(col.id) && col.all.length > perColumn)}
          <button class="more" onclick={() => toggle(col.id)}>{col.hidden ? `+${col.hidden} ${t.rm.more}` : t.rm.less}</button>
        {/if}
      {:else}
        <p class="empty">—</p>
      {/if}
    </section>
  {/each}
</div>
{#if paused.length}
  <p class="paused">{t.rm.stages.paused}: {paused.map((p) => p.name).join(" · ")}</p>
{/if}

<style>
  .rank {
    margin-left: auto;
    font-family: var(--font-code);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--should);
  }
  .board {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.25rem;
    padding: 1.5rem 1.6rem 1rem;
    max-width: 92rem;
    margin: 0 auto;
    align-items: start;
  }
  .col {
    display: grid;
    gap: 0.7rem;
    min-width: 0;
  }
  header {
    padding-bottom: 0.55rem;
    border-bottom: 2px solid var(--ink);
  }
  h2 {
    font-size: 1.3rem;
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
  }
  .n {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--ink-3);
  }
  header p {
    font-size: 0.8rem;
    color: var(--ink-3);
    margin-top: 0.15rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.6rem;
  }
  .card {
    display: grid;
    gap: 0.3rem;
    padding: 0.8rem 0.9rem 0.85rem;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1.5px solid var(--line);
    text-decoration: none;
    color: var(--ink);
    transition: border-color 0.15s, transform 0.1s;
  }
  .card:hover {
    border-color: var(--ink-3);
  }
  .card:active {
    transform: translateY(1px);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .stage {
    font-size: 0.72rem;
    font-weight: 750;
    color: var(--s);
    background: var(--sb);
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
  }
  .prio {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--block);
  }
  .name {
    font-family: var(--font-display);
    font-weight: 650;
    font-size: 1.05rem;
    line-height: 1.2;
    text-wrap: balance;
  }
  .next {
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .next.warn {
    color: #8a5d00;
    font-weight: 700;
  }
  .next.bad {
    color: var(--block);
    font-weight: 700;
  }
  .next.live {
    color: var(--should);
    font-weight: 750;
  }
  .init {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    color: var(--ink-3);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .init i {
    flex: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 2px;
  }
  .more {
    justify-self: start;
    border: 0;
    background: none;
    padding: 0.2rem 0;
    font-weight: 700;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .more:hover {
    color: var(--ink);
    text-decoration: underline;
  }
  .empty {
    color: var(--fog);
    font-size: 1.2rem;
    padding: 0.4rem 0;
  }
  .paused {
    max-width: 92rem;
    margin: 0 auto;
    padding: 0 1.6rem 2rem;
    font-size: 0.85rem;
    color: var(--ink-3);
  }
  @media (max-width: 900px) {
    .board {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 560px) {
    .board {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
  }
</style>
