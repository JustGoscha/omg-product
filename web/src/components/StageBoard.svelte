<script lang="ts">
  // Where everything stands: one column per phase, one calm card per project with the
  // one thing that comes next. At most 5 cards per column; the rest behind "+N".
  import { store } from "../lib/store.svelte";
  import { api } from "../lib/api";
  import { isStatic } from "../lib/static";
  import { nextTasks } from "../../../src/core/pulse";
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
    focus = 0,
    dates = true,
  }: {
    projects: ProjectInfo[];
    today: string;
    perColumn: number;
    spanOf: (p: ProjectInfo) => Span | null;
    order: (a: ProjectInfo, b: ProjectInfo) => number; // how cards are listed
    pick: (a: ProjectInfo, b: ProjectInfo) => number; // which cards make the cut when not all fit
    rankOf?: (id: string) => number | undefined; // place in the Pulse ranking
    focus?: number; // the top this many in the Pulse are what we work on; the rest is greyed out
    dates?: boolean; // false: no dates on the cards (personal workspaces), only live sessions and conflicts
  } = $props();
  const inFocus = (id: string) => !focus || (rankOf?.(id) ?? Infinity) <= focus;
  const t = $derived(store.t);
  const ws = $derived(store.ws);

  const PHASES: { id: Phase; stages: string[] }[] = [
    { id: "discover", stages: ["idea", "exploring", "prototyping"] },
    { id: "align", stages: ["kickoff", "scoped"] },
    { id: "deliver", stages: ["building", "rollout"] },
    { id: "learn", stages: ["measuring", "done"] },
  ];
  let open = $state<Set<Phase>>(new Set());

  // what to do now: the first task of the most important projects (Pulse ranking), from every
  // project in focus, also those the board's filter hides (a paused project can be in the top 5)
  const all = $derived(ws?.projects ?? projects);
  const doNext = $derived.by(() => {
    if (!rankOf) return [];
    const ranking = all.filter((p) => rankOf(p.id) && inFocus(p.id)).sort((a, b) => rankOf(a.id)! - rankOf(b.id)!).map((p) => p.id);
    return nextTasks(ranking, all, 3).map((x) => ({ ...x, place: rankOf(x.id)! }));
  });

  // the next tasks as a todo list: ticking one marks it done and takes it off the list
  let ticking = $state<string | null>(null);
  async function tick(p: ProjectInfo, k: number) {
    if (ticking) return;
    ticking = `${p.id}:${k}`;
    await new Promise((r) => setTimeout(r, 380));
    try {
      await api.patchProject(p.id, { next: (p.next ?? []).filter((_, j) => j !== k) });
      await store.load();
    } finally {
      ticking = null;
    }
  }
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
  {#if doNext.length}
    <section class="donext" aria-label={t.todo.title}>
      <h2>{t.todo.title}</h2>
      {#each doNext as x, k (x.id + x.task)}
        {@const p = all.find((q) => q.id === x.id)!}
        <div class="row" class:main={k === 0}>
          <button class="tick" class:main={k === 0} class:going={ticking === `${p.id}:0`} disabled={isStatic} title={t.todo.done} onclick={() => tick(p, 0)}>
            <span class="box-ico" aria-hidden="true"></span>
            <span class="task">{x.task}</span>
          </button>
          <a class="from" href={href(`/p/${p.id}`)}>#{x.place} {p.name}</a>
        </div>
      {/each}
    </section>
  {/if}
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
            <li class="box" class:waits={!inFocus(p.id)} class:focus={focus && inFocus(p.id)}>
              <a class="card" href={href(`/p/${p.id}`)}>
                <span class="top">
                  <span class="stage" style="--s:{stageColor(p.stage)};--sb:{stageSoft(p.stage)}">{t.rm.stages[p.stage] ?? p.stage}</span>
                  {#if p.priority === "urgent"}<span class="prio" title={p.priority}>!!</span>{/if}
                  {#if rankOf?.(p.id)}<span class="rank" title={t.pulse.title}>{focus && inFocus(p.id) ? "🎯 " : ""}#{rankOf(p.id)}</span>{/if}
                </span>
                <span class="name">{p.name}</span>
                {#if n && (n.tone === "live" || n.tone === "bad" || (dates && (n.tone || !p.next?.length)))}<span class="next {n.tone ?? ''}">{n.text}</span>{/if}
                {#if i}<span class="init"><i style="background:{i.color ?? 'var(--ink-3)'}"></i>{i.name}</span>{/if}
              </a>
              {#if p.next?.length && inFocus(p.id)}
                <ul class="todo" aria-label={t.nextMove}>
                  {#each p.next as task, k (task)}
                    <li>
                      <button class="tick" class:going={ticking === `${p.id}:${k}`} disabled={isStatic} title={t.todo.done} onclick={() => tick(p, k)}>
                        <span class="box-ico" aria-hidden="true"></span>
                        <span class="task" class:first={k === 0}>{task}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
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
  .box {
    border-radius: var(--r-card);
    background: var(--card);
    border: 1.5px solid var(--line);
    transition: border-color 0.15s;
    overflow: hidden;
  }
  .box:hover {
    border-color: var(--ink-3);
  }
  /* focus: the top projects in full colour, everything else waits in grey */
  .box.focus {
    border-color: var(--should-soft);
    box-shadow: 0 8px 22px -14px rgba(47, 138, 91, 0.45);
  }
  .box.waits {
    opacity: 0.38;
    filter: grayscale(1);
    transition: opacity 0.2s, filter 0.2s, border-color 0.15s;
  }
  .box.waits:hover {
    opacity: 0.85;
    filter: none;
  }
  .card {
    display: grid;
    gap: 0.3rem;
    padding: 0.8rem 0.9rem 0.85rem;
    text-decoration: none;
    color: var(--ink);
    transition: transform 0.1s;
  }
  .card:active {
    transform: translateY(1px);
  }
  /* do next: the first tasks of the most important projects, across the board */
  .donext {
    grid-column: 1 / -1;
    display: grid;
    gap: 0.15rem;
    padding: 0.9rem 1rem 0.8rem;
    border-radius: var(--r-card);
    background: linear-gradient(160deg, #ffffff 0%, #f1f5f2 100%);
    border: 1.5px solid var(--should-soft);
    box-shadow: 0 10px 30px -18px rgba(27, 36, 48, 0.35);
  }
  .donext h2 {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--should);
    margin: 0 0 0.2rem 0.4rem;
  }
  .donext .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .donext .tick {
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .donext .tick.main .task {
    font-size: 1.15rem;
    font-weight: 750;
    color: var(--ink);
  }
  .donext .tick.main .box-ico {
    width: 1.3rem;
    height: 1.3rem;
    margin-top: 0;
  }
  .from {
    flex-shrink: 0;
    padding-right: 0.4rem;
    font-size: 0.8rem;
    font-weight: 650;
    color: var(--ink-3);
    text-decoration: none;
  }
  .from:hover {
    color: var(--ink);
    text-decoration: underline;
  }
  /* next tasks: a todo list under the card */
  .todo {
    list-style: none;
    margin: 0;
    padding: 0.15rem 0.5rem 0.55rem;
    border-top: 1px dashed var(--line);
    display: grid;
  }
  .tick {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    width: 100%;
    padding: 0.35rem 0.4rem;
    border: 0;
    border-radius: 8px;
    background: none;
    font: inherit;
    text-align: left;
    color: var(--ink-2);
    cursor: pointer;
  }
  .tick:hover {
    background: var(--paper);
  }
  .box-ico {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    margin-top: 0.1rem;
    border-radius: 5px;
    border: 1.5px solid var(--ink-3);
    background: var(--card);
    box-shadow: inset 1px 1px 2px rgba(27, 36, 48, 0.12);
    display: grid;
    place-items: center;
    transition: background 0.15s, border-color 0.15s;
  }
  .tick:hover .box-ico {
    border-color: var(--should);
  }
  .tick.going .box-ico {
    background: var(--should);
    border-color: var(--should);
  }
  .tick.going .box-ico::after {
    content: "✓";
    color: #fff;
    font-size: 0.7rem;
    font-weight: 800;
    line-height: 1;
  }
  .task {
    font-size: 0.86rem;
    line-height: 1.35;
    transition: color 0.2s, opacity 0.3s;
  }
  .task.first {
    color: var(--ink);
    font-weight: 650;
  }
  .tick.going .task {
    text-decoration: line-through;
    opacity: 0.45;
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
