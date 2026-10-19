<script lang="ts">
  // Pulse: "what is more important?", two projects at a time, in rounds of a few duels.
  // Phone first: people open #/pulse with their coffee, decide five duels, see the ranking.
  import { store } from "../lib/store.svelte";
  import { href, router } from "../lib/router.svelte";
  import { api } from "../lib/api";
  import { md } from "../lib/md";
  import { inPulse, localDate, mayDuel, nextPair, rank, DAILY, type PulseDay } from "../../../src/core/pulse";
  import type { ProjectInfo } from "../lib/types";
  import { isStatic } from "../lib/static";
  import StatusPicker from "../components/StatusPicker.svelte";

  let { results }: { results: boolean } = $props();

  const t = $derived(store.t);
  const ws = $derived(store.ws);
  const today = localDate();
  let days = $state<PulseDay[] | null>(null);
  let error = $state<string | null>(null);
  let name = $state("");
  let who = $state<"everyone" | "me">("everyone");

  // anonymous workspaces vote with a random id per device instead of a name
  const anonymous = $derived(!!ws?.config.pulse?.anonymous);
  function deviceId() {
    const k = "omgp:pulse-device";
    try {
      const id = localStorage.getItem(k) ?? `anon-${crypto.randomUUID().slice(0, 8)}`;
      localStorage.setItem(k, id);
      return id;
    } catch {
      return `anon-${crypto.randomUUID().slice(0, 8)}`;
    }
  }
  const voter = $derived(anonymous ? deviceId() : store.author);

  async function load() {
    try {
      days = (await api.pulse()).days;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  load();
  $effect(() => store.on((e) => (e.type === "change" && e.paths?.some((p) => p.startsWith("pulse/")) ? load() : undefined)));

  const ids = $derived(ws?.projects.filter((p) => inPulse(p, ws.config.profile?.doneMeans)).map((p) => p.id) ?? []);
  const cfg = $derived(ws?.config.pulse ?? {});
  const daily = $derived(cfg.daily ?? DAILY);

  // ---- the round: `pair` stays put while it animates; the next one is drawn after
  let pair = $state<[string, string] | null>(null);
  let inRound = $state(0);
  let started = $state(false);
  let picked = $state<string | null>(null);
  let history = $state<{ win: string; over: string; neither?: boolean }[]>([]);
  const draw = () => (pair = days && voter ? nextPair(days, ids, voter, today) : null);
  $effect(() => {
    if (!started && days && ws && voter) {
      started = true;
      draw();
    }
  });
  const canMore = $derived(!!days && mayDuel(days, voter, today, cfg));
  const roundOver = $derived(inRound >= daily || !pair || !canMore);
  // stopping the session: the top 3 are asked for their next tasks one by one, then the ranking
  let stopped = $state(false);
  let walk = $state(0);
  $effect(() => {
    // nothing left to compare ends the session by itself
    if (started && days && !pair && !stopped) stopped = true;
  });
  const a = $derived(pair ? store.project(pair[0]) : null);
  const b = $derived(pair ? store.project(pair[1]) : null);

  // win: the one that matters more; null: neither matters right now, both drop
  function choose(win: string | null) {
    if (!pair || picked) return;
    const neither = win === null;
    const over = neither ? pair[1] : pair[0] === win ? pair[1] : pair[0];
    if (neither) win = pair[0];
    picked = neither ? "neither" : win;
    const saved = api.pulseDuel({ voter, date: today, win: win!, over, neither });
    setTimeout(async () => {
      try {
        days = (await saved).days;
      } catch (e) {
        error = (e as Error).message;
      }
      history = [...history, { win: win!, over, neither }];
      inRound++;
      picked = null;
      draw();
    }, 260);
  }
  const skip = () => choose(null);
  async function undo() {
    const last = history.at(-1);
    if (!last) return;
    history = history.slice(0, -1);
    inRound = Math.max(0, inRound - 1);
    days = (await api.pulseDuel({ voter, date: today, win: last.win, over: last.over, undo: true })).days;
    pair = Math.random() < 0.5 ? [last.win, last.over] : [last.over, last.win];
  }
  function more() {
    inRound = 0;
    draw();
  }

  $effect(() => {
    if (results) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]") || !pair || roundOver) return;
      if (e.key === "z" && (e.metaKey || e.ctrlKey)) return (e.preventDefault(), undo());
      if (e.metaKey || e.altKey || e.ctrlKey) return;
      const k = ({ ArrowLeft: 0, ArrowUp: 0, ArrowRight: 1, ArrowDown: 1 } as Record<string, number>)[e.key];
      if (k !== undefined) {
        e.preventDefault();
        choose(pair[k]);
      } else if (e.key === "n" || e.key === "s") skip();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const section = (p: ProjectInfo, name: string) => Object.entries(p.sections).find(([k]) => k.startsWith(name))?.[1]?.trim();
  const initiativeNames = (p: ProjectInfo) => p.initiatives.map((i) => ws?.initiatives.find((x) => x.id === i)?.name ?? i);

  const ranked = $derived(days && ws ? rank(days, ids, { today, voter: who === "me" ? voter : undefined, k: cfg.k }) : []);
  const people = $derived(new Set((days ?? []).map((d) => d.voter.toLowerCase())).size);
  const anyDuels = $derived(ranked.some((r) => r.wins + r.losses > 0));

  // the top 3 always get asked for their 3 most important next steps; saved into project.md
  const TOP = 3;
  const tops = $derived(
    isStatic
      ? []
      : ranked
          .slice(0, TOP)
          .filter((r) => r.wins + r.losses > 0)
          .map((r, i) => ({ r, p: store.project(r.id)!, rank: i + 1 }))
          .filter((x) => x.p),
  );
  let drafts = $state<Record<string, string[]>>({});
  let editing = $state<Set<string>>(new Set());
  const draft = (p: ProjectInfo) => drafts[p.id] ?? [0, 1, 2].map((i) => p.next?.[i] ?? "");
  const setDraft = (p: ProjectInfo, i: number, v: string) => (drafts[p.id] = draft(p).map((x, j) => (j === i ? v : x)));
  async function saveSteps(id: string) {
    const p = store.project(id);
    if (!p) return;
    try {
      await api.patchProject(id, { next: draft(p).map((s) => s.trim()).filter(Boolean) });
      delete drafts[id];
      editing = new Set([...editing].filter((x) => x !== id));
      await store.load();
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<div class="pulse">
  <header class="bar">
    <a class="back" href={href("/")}>← {t.roadmap}</a>
    <strong class="title">{ws?.config.name ?? "…"} · {t.pulse.title}</strong>
    <div class="seg" role="group">
      <button class:on={!results} onclick={() => router.go("/pulse")}>{t.pulse.swipe}</button>
      <button class:on={results} onclick={() => router.go("/pulse/results")}>{t.pulse.results}</button>
    </div>
  </header>

  {#if error}<p class="err">{error}</p>{/if}

  {#if ws && !anonymous && !store.author}
    <form class="who" onsubmit={(e) => (e.preventDefault(), name.trim() && store.setAuthor(name.trim()))}>
      <h1>{t.pulse.who}</h1>
      <p class="muted">{t.pulse.hint}</p>
      <input class="field" bind:value={name} placeholder="Name" autocomplete="name" />
      <button class="btn primary" type="submit">OK</button>
    </form>
  {:else if !results}
    {#if !ws || !days}
      <p class="muted center">…</p>
    {:else if ids.length < 2}
      <p class="muted center">{t.pulse.nothing}</p>
    {:else if stopped && walk < tops.length}
      {@const { p, rank: n } = tops[walk]}
      <div class="progress" aria-label="{walk + 1} / {tops.length}">
        {#each tops as _, i}<span class:on={i < walk} class:cur={i === walk}></span>{/each}
      </div>
      <section class="ask open walk">
        <small class="muted">{t.steps.top(n)}</small>
        <h1>{p.name}</h1>
        <h3>{p.next?.length ? t.steps.check : t.steps.ask}</h3>
        <form onsubmit={(e) => (e.preventDefault(), saveSteps(p.id).then(() => walk++))}>
          {#each [0, 1, 2] as i}
            <input class="field" placeholder={t.steps.placeholder[i]} value={draft(p)[i]} oninput={(e) => setDraft(p, i, (e.target as HTMLInputElement).value)} />
          {/each}
          <div class="row">
            <button class="btn small ghost" type="button" onclick={() => walk++}>{t.pulse.skip}</button>
            <button class="btn primary" type="submit">{walk + 1 < tops.length ? t.steps.saveNext : t.steps.save}</button>
          </div>
        </form>
      </section>
    {:else if stopped}
      <section class="done">
        <h1>{t.steps.thanks}</h1>
        <p class="muted">{!pair ? t.pulse.allDone : t.steps.thanksBody}</p>
      </section>
      {@render ranking(Infinity)}
    {:else if roundOver}
      <section class="done">
        <h1>{t.pulse.roundDone}</h1>
        <p class="muted">{canMore ? t.pulse.roundBody : t.pulse.limitBody}</p>
        <div class="row">
          {#if history.length}<button class="btn small ghost" onclick={undo}>↶ {t.pulse.undo}</button>{/if}
          <button class="btn" class:primary={!canMore} onclick={() => (stopped = true)}>{t.steps.stop}</button>
          {#if canMore}<button class="btn primary" onclick={more}>{t.pulse.more(daily)}</button>{/if}
        </div>
      </section>
      {@render ranking(5)}
    {:else if a && b && pair}
      <div class="progress" aria-label={t.pulse.round(inRound + 1, daily)}>
        {#each Array(daily) as _, i}<span class:on={i < inRound} class:cur={i === inRound}></span>{/each}
      </div>
      <h1 class="q">{t.pulse.question}</h1>
      {#key pair.join("|")}
        <div class="duel">
          {@render card(a, "←")}
          <div class="vs" aria-hidden="true">{t.pulse.vs}</div>
          {@render card(b, "→")}
        </div>
      {/key}
      <div class="foot">
        {#if history.length}<button class="btn small ghost" onclick={undo}>↶ {t.pulse.undo}</button>{:else}<span></span>{/if}
        <span class="muted small">{t.pulse.pick}{anonymous ? ` · ${t.pulse.anonymous}` : ""}</span>
        <button class="btn small ghost" onclick={skip} title={t.pulse.neitherHint}>{t.pulse.neither} ↓</button>
      </div>
      <p class="muted small center">{t.pulse.inPulse(ids.length, ws.projects.length - ids.length)}</p>
    {/if}
  {:else}
    <section class="head">
      <div class="seg" role="group">
        <button class:on={who === "everyone"} onclick={() => (who = "everyone")}>{t.pulse.everyone} <small>{t.pulse.people(people)}</small></button>
        <button class:on={who === "me"} onclick={() => (who = "me")}>{t.pulse.justMe}</button>
      </div>
    </section>
    {@render nextSteps()}
    {@render ranking(Infinity)}
  {/if}
</div>

{#snippet card(p: ProjectInfo, key: string)}
  {@const problem = section(p, "problem")}
  {@const solution = section(p, "solution")}
  <div
    class="card"
    class:win={picked === p.id}
    class:lose={!!picked && picked !== p.id}
    role="button"
    tabindex="0"
    onclick={() => choose(p.id)}
    onkeydown={(e) => e.key === "Enter" && choose(p.id)}
  >
    <span class="meta">
      <StatusPicker project={p} small />
      {#each initiativeNames(p) as n}<span class="ini">{n}</span>{/each}
      <kbd>{key}</kbd>
    </span>
    <span class="name">{p.name}</span>
    {#if p.next?.length}
      <span class="next"><b>{t.nextMove}</b>{#each p.next as s, i}<span class="step" class:first={i === 0}>{i + 1}. {s}</span>{/each}</span>
    {/if}
    {#if p.summary}<span class="summary">{p.summary}</span>{/if}
    {#if problem}<span class="sec"><b>{t.phases.problem}</b><span class="md">{@html md(problem)}</span></span>{/if}
    {#if solution}<span class="sec"><b>{t.phases.solution}</b><span class="md">{@html md(solution)}</span></span>{/if}
    {#if !p.summary && !problem && !solution && Object.values(p.sections)[0]}
      <span class="sec"><span class="md">{@html md(Object.values(p.sections)[0])}</span></span>
    {/if}
  </div>
{/snippet}

{#snippet nextSteps()}
  {#if tops.length}
    <section class="tops">
      {#each tops as { r, p, rank: n } (r.id)}
        {@const missing = (p.next?.length ?? 0) < 3}
        {@const open = missing || editing.has(p.id)}
        <div class="ask" class:open>
          <h3><small class="muted">{t.steps.top(n)}</small> {p.name}: {missing ? t.steps.ask : t.steps.check}</h3>
          {#if open}
            <form onsubmit={(e) => (e.preventDefault(), saveSteps(p.id))}>
              {#each [0, 1, 2] as i}
                <input class="field" placeholder={t.steps.placeholder[i]} value={draft(p)[i]} oninput={(e) => setDraft(p, i, (e.target as HTMLInputElement).value)} />
              {/each}
              <div class="row"><button class="btn primary small" type="submit">{t.steps.save}</button></div>
            </form>
          {:else}
            <ol>{#each p.next ?? [] as s}<li>{s}</li>{/each}</ol>
            <div class="row"><button class="btn small ghost" onclick={() => (editing = new Set([...editing, p.id]))}>{t.steps.edit}</button></div>
          {/if}
        </div>
      {/each}
    </section>
  {/if}
{/snippet}

{#snippet ranking(max: number)}
  {#if !anyDuels}
    <p class="muted center">{t.pulse.noVotes}</p>
  {:else}
    <ol class="rank">
      {#each ranked.slice(0, max) as r, i (r.id)}
        {@const p = store.project(r.id)}
        <li class:quiet={!(r.wins + r.losses)}>
          <span class="n">{i + 1}</span>
          <div class="who-row">
            <a href={href(`/p/${r.id}`)}>{p?.name ?? r.id}</a>
            <span class="sub">
              {t.pulse.record(r.wins, r.losses)}
              {#if p}· {p.priority} {t.pulse.declared}{/if}
              {#if r.split}<b class="split" title={t.pulse.splitHint}>⚡ {t.pulse.split}</b>{/if}
            </span>
          </div>
          <span class="elo">{r.rating}</span>
          <span class="delta" class:upd={r.delta > 0} class:dn={r.delta < 0} title={t.pulse.week}>
            {r.delta > 0 ? `▲${r.delta}` : r.delta < 0 ? `▼${-r.delta}` : "·"}
          </span>
        </li>
      {/each}
    </ol>
  {/if}
{/snippet}

<style>
  .pulse {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem 1.5rem;
    max-width: 64rem;
    margin: 0 auto;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.8rem 0;
  }
  .back {
    color: var(--ink-3);
    text-decoration: none;
    font-weight: 650;
  }
  .title {
    flex: 1;
    font-family: var(--font-display);
  }
  .seg {
    display: inline-flex;
    background: var(--paper-2);
    border-radius: 999px;
    padding: 0.2rem;
  }
  .seg button {
    border: 0;
    background: none;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .seg button.on {
    background: var(--card);
    color: var(--ink);
    box-shadow: 0 1px 3px rgba(27, 36, 48, 0.15);
  }
  .seg small {
    color: var(--ink-3);
    font-weight: 600;
  }
  .center {
    text-align: center;
  }
  .small {
    font-size: 0.85rem;
  }
  .err {
    color: #b3261e;
  }
  .who {
    display: grid;
    gap: 0.8rem;
    max-width: 22rem;
    margin: 12vh auto 0;
    text-align: center;
  }

  /* ---- duel */
  .progress {
    display: flex;
    gap: 4px;
  }
  .progress span {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--line);
  }
  .progress span.on {
    background: var(--ink-2);
  }
  .progress span.cur {
    background: var(--ink-3);
  }
  .q {
    text-align: center;
    font-size: clamp(1.3rem, 1rem + 1.5vw, 1.9rem);
  }
  .duel {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.9rem;
    align-items: stretch;
    animation: in 0.25s var(--ease);
  }
  @keyframes in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  .vs {
    align-self: center;
    font-family: var(--font-display);
    font-weight: 800;
    color: var(--ink-3);
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    text-align: left;
    font: inherit;
    color: inherit;
    background: var(--card);
    border-radius: 22px;
    padding: 1.3rem;
    border: 3px solid transparent;
    box-shadow: 0 24px 50px -30px rgba(27, 36, 48, 0.45), 0 0 0 1px rgba(27, 36, 48, 0.06);
    cursor: pointer;
    transition: transform 0.2s var(--ease), border-color 0.15s, opacity 0.2s;
    min-height: 16rem;
    max-height: 62dvh;
    overflow: hidden;
  }
  .card:hover {
    border-color: var(--should);
    transform: translateY(-3px);
  }
  .card:active {
    transform: scale(0.98);
  }
  .card.win {
    border-color: var(--should);
    transform: scale(1.03);
  }
  .card.lose {
    opacity: 0.3;
    transform: scale(0.96);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .ini {
    font-size: 0.75rem;
    font-weight: 750;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
  }
  .ini {
    background: var(--paper-2);
    color: var(--ink-2);
  }
  kbd {
    margin-left: auto;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--ink-3);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0 0.35rem;
  }
  .name {
    font-family: var(--font-display);
    font-weight: 750;
    font-size: clamp(1.35rem, 1rem + 1.4vw, 1.9rem);
    line-height: 1.1;
  }
  .next {
    font-weight: 650;
    font-size: 1.05rem;
    padding: 0.5rem 0.7rem;
    border-radius: 12px;
    background: var(--should-soft);
  }
  .next {
    display: grid;
    gap: 0.15rem;
  }
  .next b {
    color: var(--should);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .step {
    font-weight: 500;
    font-size: 0.95rem;
  }
  .step.first {
    font-weight: 700;
    font-size: 1.02rem;
  }

  /* ---- next steps for the top projects */
  .tops {
    display: grid;
    gap: 0.7rem;
  }
  .ask {
    display: grid;
    gap: 0.5rem;
    background: var(--card);
    border-radius: 16px;
    padding: 1rem;
    border: 2px solid var(--should-soft);
  }
  .ask.open {
    border-color: var(--should);
  }
  .ask h3 {
    font-size: 1.02rem;
  }
  .ask ol {
    margin: 0;
    padding-left: 1.3rem;
    color: var(--ink-2);
  }
  .ask .field {
    width: 100%;
  }
  .ask .row {
    justify-content: flex-end;
  }
  .ask form {
    display: grid;
    gap: 0.5rem;
  }
  .walk {
    max-width: 34rem;
    width: 100%;
    margin: 4vh auto 0;
    padding: 1.4rem;
  }
  .walk h1 {
    font-size: clamp(1.5rem, 1rem + 2vw, 2.2rem);
  }
  .summary {
    font-size: 1.05rem;
    color: var(--ink-2);
  }
  .sec {
    display: grid;
    gap: 0.15rem;
    font-size: 0.95rem;
    color: var(--ink-2);
  }
  .sec b {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-3);
  }
  .sec .md {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  .done {
    text-align: center;
    display: grid;
    gap: 0.6rem;
    justify-items: center;
    padding-top: 5vh;
  }
  .row {
    display: flex;
    gap: 0.6rem;
    align-items: center;
  }

  /* ---- ranking */
  .head {
    display: flex;
    justify-content: space-between;
  }
  .rank {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.4rem;
  }
  .rank li {
    display: grid;
    grid-template-columns: 2rem 1fr auto 3.4rem;
    gap: 0.75rem;
    align-items: center;
    background: var(--card);
    border-radius: 14px;
    padding: 0.7rem 0.9rem;
    box-shadow: 0 0 0 1px rgba(27, 36, 48, 0.06);
  }
  .rank li.quiet {
    opacity: 0.55;
  }
  .n {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.15rem;
    color: var(--ink-3);
    text-align: right;
  }
  .who-row {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }
  .who-row a {
    font-weight: 750;
    color: var(--ink);
    text-decoration: none;
  }
  .sub {
    font-size: 0.8rem;
    color: var(--ink-3);
  }
  .split {
    color: var(--must);
    margin-left: 0.3rem;
  }
  .elo {
    font-family: var(--font-code);
    font-weight: 700;
  }
  .delta {
    font-family: var(--font-code);
    font-size: 0.82rem;
    color: var(--ink-3);
    text-align: right;
  }
  .delta.upd {
    color: var(--should);
  }
  .delta.dn {
    color: #b3261e;
  }
  @media (max-width: 680px) {
    .duel {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    .card {
      min-height: 0;
      max-height: 34dvh;
      padding: 1rem;
    }
    kbd {
      display: none;
    }
    .foot .small {
      display: none;
    }
  }
</style>
