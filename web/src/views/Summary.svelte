<script lang="ts">
  import { api } from "../lib/api";
  import { store } from "../lib/store.svelte";
  import { href } from "../lib/router.svelte";
  import { md, mdInline } from "../lib/md";
  import { SessionState } from "../session/state.svelte";
  import { isStatic } from "../lib/static";
  import type { ChoiceStepT, LoadedStep } from "../lib/types";
  import { scaleValues, type TriageScale } from "../../../src/core/scales";

  let { project, session }: { project: string; session: string } = $props();
  const ss = $derived(new SessionState(project, session));
  $effect(() => {
    const s = ss;
    s.start();
    return () => s.stop();
  });
  const t = $derived(store.t);

  let handoff = $state<string | null>(null);
  let copied = $state(false);

  const groups = $derived.by(() => {
    const decided: LoadedStep[] = [];
    const parked: LoadedStep[] = [];
    const open: LoadedStep[] = [];
    const scales = new Map<TriageScale, Map<string, LoadedStep[]>>();
    for (const { step } of ss.steps) {
      if (step.type === "slide" || step.type === "broken") continue;
      const r = ss.result(step.id);
      if (r?.status === "deferred" || r?.status === "escalated") parked.push(step);
      else if (step.type === "triage" && r?.value) {
        const sc = (step.scale ?? "priority") as TriageScale;
        if (!scales.has(sc)) scales.set(sc, new Map(scaleValues[sc].map((v) => [v, [] as LoadedStep[]])));
        const bucket = scales.get(sc)!.get(r.value);
        if (bucket) bucket.push(step);
        else decided.push(step);
      }
      else if (r?.value) decided.push(step);
      else open.push(step);
    }
    return { decided, parked, open, scales: [...scales.entries()] };
  });

  const answerOf = (step: LoadedStep) => {
    const r = ss.result(step.id);
    if (!r) return "";
    if (step.type === "checkpoint") return `${t.agree.values[r.value as keyof typeof t.agree.values]?.[0] ?? r.value ?? ""}`;
    if (step.type === "choice") {
      if (r.value === "other") return `${t.ownOption}: ${r.other?.text ?? ""}`;
      return (step as ChoiceStepT).options.find((o) => o.id === r.value)?.label ?? r.value ?? "";
    }
    return r.value ?? "";
  };

  async function writeHandoff() {
    const res = await api.handoff(project, [session]);
    handoff = res.markdown;
  }
  const prompt = $derived(
    `Use the omgp-handoff skill: read projects/${project}/handoff.md and the session results in projects/${project}/sessions/${session}.results.json, enrich the handoff into an implementation spec, update project.md and propose issues.`,
  );
</script>

<div class="summary">
  <header>
    <a class="back" href={href(`/p/${project}/s/${session}`)}>← {ss.session?.title ?? session}</a>
    <h1>{t.summary}</h1>
    <p class="stats">
      <span><b>{groups.decided.length + groups.scales.reduce((n, [, b]) => n + [...b.values()].flat().length, 0)}</b> {t.decidedCount}</span>
      <span><b>{groups.parked.length}</b> {t.deferredTitle.toLowerCase()}</span>
      <span><b>{groups.open.length}</b> {t.openTitle.toLowerCase()}</span>
    </p>
  </header>

  <div class="cols">
    <section>
      <h2>{t.decisions}</h2>
      {#each groups.decided as step}
        {@const r = ss.result(step.id)}
        <article class="row">
          <div class="q">{step.title}</div>
          <div class="a">{answerOf(step)}</div>
          {#if r?.note}<div class="note">{r.note}</div>{/if}
        </article>
      {:else}
        <p class="muted">{t.empty}</p>
      {/each}

      {#if groups.parked.length}
        <h2>{t.deferredTitle}</h2>
        {#each groups.parked as step}
          {@const r = ss.result(step.id)}
          <article class="row parked">
            <div class="q">{step.title}</div>
            <div class="a">{r?.status === "deferred" ? t.deferred : t.escalated}{r?.reason ? `: ${r.reason}` : ""}</div>
          </article>
        {/each}
      {/if}

      {#if groups.open.length}
        <h2>{t.openTitle}</h2>
        {#each groups.open as step}
          <a class="row open" href={href(`/p/${project}/s/${session}?step=${encodeURIComponent(step.id)}`)}><div class="q">{step.title}</div></a>
        {/each}
      {/if}
    </section>

    <section>
      {#each groups.scales as [scale, buckets]}
        <h2>{t.scaleTitles[scale]}</h2>
        <div class="scope">
          {#each [...buckets.entries()] as [v, items], i}
            <div class="bucket b-{['must', 'should', 'nice', 'no'][i]}">
              <h3>{t.scales[scale][v]?.[0] ?? v} <span>{items.length}</span></h3>
              <ul>{#each items as step}<li>{step.title}</li>{/each}</ul>
            </div>
          {/each}
        </div>
      {/each}
      {#if ss.results.annotations.length}
        <h2>{t.changeRequests}</h2>
        <ol class="ann">
          {#each ss.results.annotations as a}
            <li><span class="chip k-{a.kind}">{t.annotationKinds[a.kind]}</span> {@html mdInline(a.text)} <span class="muted">{a.label ?? ""}</span></li>
          {/each}
        </ol>
      {/if}
    </section>
  </div>

  <section class="handoff">
    <div class="hbar">
      {#if isStatic}
        <span class="muted">{t.demo.handoff}</span>
      {:else}
        <button class="btn primary" onclick={writeHandoff}>{t.writeHandoff}</button>
        <button class="btn" onclick={() => (navigator.clipboard.writeText(prompt), (copied = true))}>{copied ? t.copied : t.copyPrompt}</button>
      {/if}
      {#if handoff}<span class="muted">{t.handoffWritten}: projects/{project}/handoff.md</span>{/if}
    </div>
    {#if handoff}<div class="doc md">{@html md(handoff)}</div>{/if}
  </section>
</div>

<style>
  .summary {
    max-width: 78rem;
    margin: 0 auto;
    padding: 2rem clamp(1rem, 4vw, 3rem) 4rem;
    display: grid;
    gap: 2rem;
  }
  header {
    display: grid;
    gap: 0.6rem;
  }
  .back {
    text-decoration: none;
    color: var(--ink-3);
    font-weight: 600;
  }
  h1 {
    font-size: clamp(2.2rem, 1.5rem + 2vw, 3.4rem);
  }
  .stats {
    display: flex;
    gap: 1.6rem;
    color: var(--ink-2);
  }
  .stats b {
    font-family: var(--font-display);
    font-size: 1.6rem;
    color: var(--ink);
    margin-right: 0.2rem;
  }
  .cols {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 2.5rem;
  }
  h2 {
    font-size: 1.3rem;
    margin: 1.2rem 0 0.6rem;
  }
  .row {
    display: grid;
    gap: 0.2rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--line);
    text-decoration: none;
  }
  .q {
    color: var(--ink-2);
  }
  .a {
    font-weight: 700;
    font-size: 1.08rem;
  }
  .note {
    font-size: 0.9rem;
    color: var(--ink-3);
  }
  .parked .a {
    color: var(--ink-3);
  }
  .open .q {
    color: var(--ink);
  }
  .scope {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .bucket {
    border-radius: var(--r-card);
    padding: 0.9rem 1rem;
  }
  .bucket h3 {
    font-family: var(--font-ui);
    font-size: 0.95rem;
    font-weight: 800;
    display: flex;
    justify-content: space-between;
  }
  .bucket ul {
    margin: 0.5rem 0 0;
    padding-left: 1.1rem;
    font-size: 0.92rem;
    display: grid;
    gap: 0.25rem;
  }
  .b-must {
    background: var(--must-soft);
  }
  .b-must h3 {
    color: var(--must);
  }
  .b-should {
    background: var(--should-soft);
  }
  .b-should h3 {
    color: var(--should);
  }
  .b-nice {
    background: var(--nice-soft);
  }
  .b-nice h3 {
    color: var(--nice);
  }
  .b-no {
    background: var(--no-soft);
  }
  .b-no h3 {
    color: var(--no);
  }
  .ann {
    display: grid;
    gap: 0.5rem;
    padding-left: 1.2rem;
  }
  .handoff {
    display: grid;
    gap: 1rem;
  }
  .hbar {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .doc {
    background: var(--card);
    border-radius: var(--r-panel);
    padding: 2rem;
    box-shadow: var(--shadow-lift);
    max-width: 52rem;
  }
  @media (max-width: 900px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
