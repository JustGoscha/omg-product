<script lang="ts">
  // Pulse: a short swipe deck a day, and the Elo ranking of what everyone swiped.
  // Phone first: people open #/pulse with their coffee, swipe ten cards, see the ranking.
  import { store } from "../lib/store.svelte";
  import { href, router } from "../lib/router.svelte";
  import { api } from "../lib/api";
  import { md } from "../lib/md";
  import { stageColor, stageSoft } from "../lib/stages";
  import { deck, localDate, rank, DAILY, OUT_OF_PULSE, type PulseDay, type Tier } from "../../../src/core/pulse";

  let { results }: { results: boolean } = $props();

  const t = $derived(store.t);
  const ws = $derived(store.ws);
  const today = localDate();
  let days = $state<PulseDay[] | null>(null);
  let error = $state<string | null>(null);
  let name = $state("");
  let who = $state<"everyone" | "me">("everyone");

  async function load() {
    try {
      days = (await api.pulse()).days;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  load();
  $effect(() => store.on((e) => (e.type === "change" && e.paths?.some((p) => p.startsWith("pulse/")) ? load() : undefined)));

  const ids = $derived(ws?.projects.filter((p) => !OUT_OF_PULSE.has(p.stage ?? "idea")).map((p) => p.id) ?? []);
  const daily = $derived(ws?.config.pulse?.daily ?? DAILY);
  const today$ = $derived(days && store.author ? deck(days, ids, store.author, today, daily) : null);
  // the deck is fixed when it opens, so a card doesn't change under the finger after a vote
  let cards = $state<string[] | null>(null);
  $effect(() => {
    if (today$ && cards === null) cards = today$.cards;
  });
  let pos = $state(0);
  let history = $state<string[]>([]);
  const current = $derived(cards?.[pos] ? store.project(cards[pos]) : null);
  const upNext = $derived(cards?.[pos + 1] ? store.project(cards[pos + 1]) : null);
  const finished = $derived(!!cards && pos >= cards.length);

  const ranked = $derived(days && ws ? rank(days, ids, { today, voter: who === "me" ? store.author : undefined, k: ws.config.pulse?.k }) : []);
  const people = $derived(new Set((days ?? []).map((d) => d.voter.toLowerCase())).size);
  const anyVotes = $derived(ranked.some((r) => r.votes > 0));

  // ---- swiping (same gestures as the triage deck)
  const dirs: { tier: Tier; key: string; arrow: string; x: number; y: number }[] = [
    { tier: "top", key: "ArrowUp", arrow: "↑", x: 0, y: -1 },
    { tier: "high", key: "ArrowRight", arrow: "→", x: 1, y: 0 },
    { tier: "low", key: "ArrowDown", arrow: "↓", x: 0, y: 1 },
    { tier: "drop", key: "ArrowLeft", arrow: "←", x: -1, y: 0 },
  ];
  let dx = $state(0);
  let dy = $state(0);
  let dragging = $state(false);
  let flying = $state<Tier | null>(null);
  let start: { x: number; y: number } | null = null;

  const leaning = $derived.by((): Tier | null => {
    if (flying) return flying;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 40) return null;
    if (ax > ay) return dx > 0 ? "high" : "drop";
    return dy < 0 ? "top" : "low";
  });

  function decide(tier: Tier) {
    if (!current || flying) return;
    const d = dirs.find((d) => d.tier === tier)!;
    const project = current.id;
    flying = tier;
    dx = d.x * 900;
    dy = d.y * 700;
    api
      .pulseVote({ voter: store.author, date: today, project, tier })
      .then((r) => (days = r.days))
      .catch((e) => (error = (e as Error).message));
    setTimeout(() => {
      history = [...history, project];
      pos++;
      flying = null;
      dx = dy = 0;
    }, 320);
  }

  function undo() {
    const project = history.at(-1);
    if (!project) return;
    history = history.slice(0, -1);
    pos = Math.max(0, pos - 1);
    api.pulseVote({ voter: store.author, date: today, project, tier: null }).then((r) => (days = r.days));
  }

  function down(e: PointerEvent) {
    start = { x: e.clientX, y: e.clientY };
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!start) return;
    dx = e.clientX - start.x;
    dy = e.clientY - start.y;
  }
  function up() {
    if (!start) return;
    start = null;
    dragging = false;
    const v = leaning;
    if (v && Math.max(Math.abs(dx), Math.abs(dy)) > 110) decide(v);
    else dx = dy = 0;
  }

  $effect(() => {
    if (results) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      const d = dirs.find((d) => d.key === e.key);
      if (d && !e.metaKey && !e.altKey) {
        e.preventDefault();
        decide(d.tier);
      } else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const excerpt = (p: NonNullable<typeof current>) => p.summary ?? Object.values(p.sections)[0] ?? "";
  const initiativeNames = (p: NonNullable<typeof current>) =>
    p.initiatives.map((i) => ws?.initiatives.find((x) => x.id === i)?.name ?? i);
  const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);
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

  {#if !store.author}
    <form class="who" onsubmit={(e) => (e.preventDefault(), name.trim() && store.setAuthor(name.trim()))}>
      <h1>{t.pulse.who}</h1>
      <p class="muted">{t.pulse.hint}</p>
      <input class="field" bind:value={name} placeholder="Name" autocomplete="name" />
      <button class="btn primary" type="submit">OK</button>
    </form>
  {:else if !results}
    {#if !ws || !cards}
      <p class="muted center">…</p>
    {:else if !ids.length}
      <p class="muted center">{t.pulse.nothing}</p>
    {:else if finished}
      <section class="done">
        <h1>{t.pulse.doneTitle}</h1>
        <p class="muted">{t.pulse.doneBody}</p>
        <p class="muted small">{t.pulse.inPulse(ids.length, (ws?.projects.length ?? 0) - ids.length)}</p>
        {#if history.length}<button class="btn small ghost" onclick={undo}>↶ {t.pulse.undo}</button>{/if}
      </section>
      {@render ranking(5)}
      <p class="center"><a href={href("/pulse/results")}>{t.pulse.results} →</a></p>
    {:else if current}
      <div class="progress" aria-label={t.pulse.left(cards.length - pos)}>
        {#each cards as _, i}<span class:on={i < pos} class:cur={i === pos}></span>{/each}
      </div>
      <div class="deck">
        {#each dirs as d}
          <div class="target t-{d.tier}" class:lit={leaning === d.tier}>{d.arrow} {t.pulse.tiers[d.tier][0]}</div>
        {/each}
        {#if upNext}
          <div class="card behind" aria-hidden="true"><h2>{upNext.name}</h2></div>
        {/if}
        {#key current.id}
          <div
            class="card v-{leaning ?? 'none'}"
            class:dragging
            class:flying={!!flying}
            style="transform: translate({dx}px, {dy}px) rotate({dx / 22}deg)"
            onpointerdown={down}
            onpointermove={move}
            onpointerup={up}
            onpointercancel={up}
            role="group"
            aria-label={current.name}
          >
            <div class="meta">
              <span class="stage" style="color:{stageColor(current.stage)};background:{stageSoft(current.stage)}">{t.rm.stages[current.stage] ?? current.stage}</span>
              {#each initiativeNames(current) as n}<span class="ini">{n}</span>{/each}
            </div>
            <h2>{current.name}</h2>
            {#if excerpt(current)}<div class="body md">{@html md(excerpt(current))}</div>{/if}
          </div>
        {/key}
      </div>
      <div class="buttons">
        {#each dirs as d}
          <button class="verdict b-{d.tier}" onclick={() => decide(d.tier)}>
            <span class="arrow">{d.arrow}</span>
            <span class="lbl">{t.pulse.tiers[d.tier][0]}</span>
            <span class="hint">{t.pulse.tiers[d.tier][1]}</span>
          </button>
        {/each}
      </div>
      <div class="foot">
        <span class="muted">{t.pulse.left(cards.length - pos)} · {t.pulse.inPulse(ids.length, (ws?.projects.length ?? 0) - ids.length)}</span>
        {#if history.length}<button class="btn small ghost" onclick={undo}>↶ {t.pulse.undo}</button>{/if}
      </div>
    {/if}
  {:else}
    <section class="head">
      <div class="seg" role="group">
        <button class:on={who === "everyone"} onclick={() => (who = "everyone")}>{t.pulse.everyone} <small>{t.pulse.people(people)}</small></button>
        <button class:on={who === "me"} onclick={() => (who = "me")}>{t.pulse.justMe}</button>
      </div>
      <span class="legend">
        {#each dirs as d}<span class="sw sw-{d.tier}"></span>{t.pulse.tiers[d.tier][0]} {/each}
      </span>
    </section>
    {@render ranking(Infinity)}
  {/if}
</div>

{#snippet ranking(max: number)}
  {#if !anyVotes}
    <p class="muted center">{t.pulse.noVotes}</p>
  {:else}
    <ol class="rank">
      {#each ranked.slice(0, max) as r, i (r.id)}
        {@const p = store.project(r.id)}
        <li class:quiet={!r.votes}>
          <span class="n">{i + 1}</span>
          <div class="name">
            <a href={href(`/p/${r.id}`)}>{p?.name ?? r.id}</a>
            <span class="sub">
              {t.pulse.votes(r.votes)}
              {#if p}· {p.priority} {t.pulse.declared}{/if}
              {#if r.split}<b class="split" title={t.pulse.splitHint}>⚡ {t.pulse.split}</b>{/if}
            </span>
            {#if r.votes}
              <span class="tally" aria-hidden="true">
                {#each dirs as d}<span class="sw-{d.tier}" style="width:{pct(r.tally[d.tier], r.votes)}%"></span>{/each}
              </span>
            {/if}
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
    max-width: 52rem;
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

  /* ---- deck */
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
  .deck {
    position: relative;
    display: grid;
    place-items: center;
    flex: 1;
    min-height: 22rem;
    padding: 2.4rem 0;
  }
  .target {
    position: absolute;
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--fog);
    transition: color 0.15s, transform 0.15s;
    pointer-events: none;
    white-space: nowrap;
  }
  .target.lit {
    transform: scale(1.15);
  }
  .t-top {
    top: 0;
    left: 50%;
    translate: -50% 0;
  }
  .t-low {
    bottom: 0;
    left: 50%;
    translate: -50% 0;
  }
  .t-drop {
    left: 0;
    top: 50%;
    translate: 0 -50%;
    writing-mode: vertical-rl;
    rotate: 180deg;
  }
  .t-high {
    right: 0;
    top: 50%;
    translate: 0 -50%;
    writing-mode: vertical-rl;
  }
  .t-top.lit {
    color: var(--must);
  }
  .t-high.lit {
    color: var(--should);
  }
  .t-low.lit {
    color: var(--nice);
  }
  .t-drop.lit {
    color: var(--no);
  }
  .card {
    grid-area: 1 / 1;
    position: relative;
    width: min(30rem, calc(100% - 3rem));
    min-height: 18rem;
    background: var(--card);
    border-radius: 24px;
    padding: 1.6rem;
    box-shadow: 0 30px 60px -30px rgba(27, 36, 48, 0.45), 0 0 0 1px rgba(27, 36, 48, 0.06);
    border: 3px solid transparent;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    cursor: grab;
    touch-action: none;
    user-select: none;
    transition: transform 0.32s var(--ease), border-color 0.15s, opacity 0.32s;
  }
  .card.behind {
    transform: translateY(14px) scale(0.95);
    opacity: 0.55;
    pointer-events: none;
  }
  .card.behind h2 {
    filter: blur(3px);
  }
  .card.dragging {
    transition: border-color 0.15s;
    cursor: grabbing;
  }
  .card.flying {
    opacity: 0;
  }
  .v-top {
    border-color: var(--must);
  }
  .v-high {
    border-color: var(--should);
  }
  .v-low {
    border-color: var(--nice);
  }
  .v-drop {
    border-color: var(--no);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .stage,
  .ini {
    font-size: 0.78rem;
    font-weight: 750;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
  }
  .ini {
    background: var(--paper-2);
    color: var(--ink-2);
  }
  h2 {
    font-size: clamp(1.5rem, 1rem + 2vw, 2.1rem);
    line-height: 1.1;
  }
  .body {
    color: var(--ink-2);
    font-size: 1.05rem;
    display: -webkit-box;
    -webkit-line-clamp: 7;
    line-clamp: 7;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .buttons {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.6rem;
  }
  .verdict {
    display: grid;
    gap: 0.1rem;
    justify-items: center;
    text-align: center;
    padding: 0.7rem 0.5rem;
    border-radius: 16px;
    border: 2px solid var(--line);
    background: var(--card);
  }
  .verdict:active {
    transform: scale(0.97);
  }
  .arrow {
    font-size: 1.3rem;
    font-weight: 800;
  }
  .lbl {
    font-weight: 750;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--ink-3);
  }
  .b-top .arrow {
    color: var(--must);
  }
  .b-high .arrow {
    color: var(--should);
  }
  .b-low .arrow {
    color: var(--nice);
  }
  .b-drop .arrow {
    color: var(--no);
  }
  .b-top:hover {
    border-color: var(--must);
    background: var(--must-soft);
  }
  .b-high:hover {
    border-color: var(--should);
    background: var(--should-soft);
  }
  .b-low:hover {
    border-color: var(--nice);
    background: var(--nice-soft);
  }
  .b-drop:hover {
    border-color: var(--no);
    background: var(--no-soft);
  }
  .foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .small {
    font-size: 0.85rem;
  }
  .done {
    text-align: center;
    display: grid;
    gap: 0.5rem;
    justify-items: center;
    padding-top: 6vh;
  }

  /* ---- ranking */
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: center;
    justify-content: space-between;
  }
  .legend {
    font-size: 0.82rem;
    color: var(--ink-3);
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
  }
  .sw {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 3px;
    margin-left: 0.4rem;
  }
  .sw-top {
    background: var(--must);
  }
  .sw-high {
    background: var(--should);
  }
  .sw-low {
    background: var(--nice);
  }
  .sw-drop {
    background: var(--no);
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
  .name {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }
  .name a {
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
  .tally {
    display: flex;
    height: 5px;
    border-radius: 3px;
    overflow: hidden;
    background: var(--paper-2);
    max-width: 16rem;
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
  @media (max-width: 560px) {
    .verdict .hint {
      display: none;
    }
    .target.t-high,
    .target.t-drop {
      display: none;
    }
    .card {
      width: 100%;
    }
  }
</style>
