<script lang="ts">
  import { untrack } from "svelte";
  import { store } from "../lib/store.svelte";
  import { router, href } from "../lib/router.svelte";
  import { SessionState } from "../session/state.svelte";
  import ProgressArc from "../session/ProgressArc.svelte";
  import SlideView from "../session/SlideView.svelte";
  import TriageView from "../session/TriageView.svelte";
  import ChoiceView from "../session/ChoiceView.svelte";
  import QuestionView from "../session/QuestionView.svelte";
  import PollView from "../session/PollView.svelte";
  import CheckpointView from "../session/CheckpointView.svelte";
  import ThreadsPanel from "../comments/ThreadsPanel.svelte";
  import { Comments } from "../lib/comments.svelte";
  import { api } from "../lib/api";
  import { provideReview } from "../session/review";
  import { provideComments } from "../lib/comments-context";
  import { isStatic } from "../lib/static";
  import type { CommentTargetT } from "../lib/types";

  let { project, session, step: stepParam }: { project: string; session: string; step?: string } = $props();

  const ss = $derived(new SessionState(project, session));
  $effect(() => {
    const s = ss;
    s.start();
    return () => s.stop();
  });

  const t = $derived(store.t);

  // comments and in-place editing for every step
  const comments = $derived(new Comments(project));
  $effect(() => {
    const c = comments;
    c.start();
    return () => c.stop();
  });
  let panel = $state<{ step: string; draft: { target: CommentTargetT; quote?: string } | null; active: string | null } | null>(null);
  const file = $derived(`sessions/${session}.yaml`);
  // a static demo has nobody to save edits or comments: the step views show plain text then
  if (!isStatic) provideComments(() => comments);
  if (!isStatic) provideReview({
    get comments() {
      return comments;
    },
    get file() {
      return file;
    },
    edit: (step, path, value, expect) => api.editStep(project, session, step, { path, value, expect }),
    discuss: (step, draft = null, active = null) => (panel = { step, draft, active }),
    threadsOf: (step, option) =>
      comments.threads.filter(
        (th) => (th.target.kind === "step" || th.target.kind === "element") && th.target.file === file && th.target.step === step && (option === undefined || th.target.option === option),
      ),
  });
  const openComments = $derived(
    comments.threads.filter((th) => th.status === "open" && (("file" in th.target && th.target.file === file) || th.target.kind === "prototype")).length,
  );

  // prototype files a step shows (its own visuals and its options'), for the comments filter
  function stepPrototypes(stepId: string) {
    const st = ss.steps.find((x) => x.step.id === stepId)?.step;
    const out = new Set<string>();
    if (!st || st.type === "broken") return out;
    const all = [st.visual, ...(st.visuals ?? []), ...(st.type === "choice" ? st.options.flatMap((o) => [o.visual, ...(o.visuals ?? [])]) : [])];
    for (const v of all) if (v?.type === "prototype") out.add(v.src.split("#")[0]);
    return out;
  }
  const total = $derived(ss.steps.length);
  const current = $derived.by(() => {
    if (!total) return 0;
    const wanted = stepParam ?? untrack(() => ss.results.current);
    const i = ss.steps.findIndex((s) => s.step.id === wanted);
    return i >= 0 ? i : 0;
  });
  const flat = $derived(ss.steps[current]);
  const answered = $derived(ss.steps.filter((s) => s.step.type !== "slide" && ss.answered(s.step)).length);
  const questions = $derived(ss.steps.filter((s) => s.step.type !== "slide").length);

  let notesOpen = $state(false);
  let speaker = $state(false);
  let note = $state("");
  let menu = $state(false);

  $effect(() => {
    note = ss.result(flat?.step.id ?? "")?.note ?? "";
  });

  function go(i: number) {
    if (i >= total) return router.go(`/p/${project}/s/${session}/summary`);
    const target = ss.steps[Math.max(0, i)];
    if (!target) return;
    router.replace(`/p/${project}/s/${session}?step=${encodeURIComponent(target.step.id)}`);
    ss.act({ op: "current", step: target.step.id });
  }
  const next = () => go(current + 1);
  const back = () => go(current - 1);

  function saveNote() {
    if (!flat) return;
    ss.act({ op: "step", step: flat.step.id, patch: { note: note.trim() || undefined } });
  }

  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) (e.preventDefault(), next());
      else if (e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) (e.preventDefault(), back());
      else if (e.key === "n") (e.preventDefault(), (notesOpen = !notesOpen));
      else if (e.key === "s") speaker = !speaker;
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const joinUrl = $derived(`${location.origin}/#/join/${project}/${session}`);
</script>

<div class="runner">
  <header class="top">
    <a class="back" href={href(`/p/${project}`)} aria-label="back to project">←</a>
    <div class="title">
      <strong>{ss.session?.title ?? session}</strong>
      {#if flat}<span class="muted">{flat.section.title}</span>{/if}
    </div>
    <div class="arcwrap"><ProgressArc {ss} {current} ongo={go} /></div>
    <span class="count">{answered}/{questions} {t.progress}</span>
    {#if !isStatic || openComments}
      <button class="btn small ghost" class:has={openComments} onclick={() => (panel = panel ? null : { step: flat?.step.id ?? "", draft: null, active: null })} title={t.cm.comments}>💬 {openComments || ""}</button>
    {:else}
      <span></span>
    {/if}
    <div class="menuwrap">
      <button class="btn small ghost" onclick={() => (menu = !menu)} aria-expanded={menu}>⋯</button>
      {#if menu}
        <div class="menu">
          <label>
            <span>{t.annotate} ·</span>
            <input class="field" value={ss.author} placeholder="Name" onchange={(e) => ss.setAuthor((e.target as HTMLInputElement).value)} />
          </label>
          {#if !isStatic}
            <div class="join">
              <span>{t.join}</span>
              <code>{joinUrl}</code>
              <span class="muted">Start the studio with <code>--host 0.0.0.0</code> so phones can reach it.</span>
            </div>
          {/if}
          <a class="btn small" href={href(`/p/${project}/s/${session}/summary`)}>{t.summary}</a>
          <button class="btn small ghost danger" onclick={() => confirm(t.resetConfirm) && (ss.act({ op: "reset" }), (menu = false))}>{t.resetResults}</button>
        </div>
      {/if}
    </div>
  </header>

  <main class="stage">
    {#if ss.error && !ss.session}
      <p class="error">{ss.error}</p>
    {:else if !ss.session}
      <p class="muted">…</p>
    {:else if !flat}
      <p class="muted">{t.empty}</p>
    {:else}
      {#key flat.step.id}
        <div class="step">
          {#if flat.step.type === "slide"}
            <SlideView step={flat.step} section={flat.section.title} {ss} />
          {:else if flat.step.type === "triage"}
            <TriageView step={flat.step} section={flat.section.title} {ss} onnext={next} />
          {:else if flat.step.type === "choice"}
            <ChoiceView step={flat.step} section={flat.section.title} {ss} />
          {:else if flat.step.type === "question"}
            <QuestionView step={flat.step} section={flat.section.title} {ss} />
          {:else if flat.step.type === "poll"}
            <PollView step={flat.step} section={flat.section.title} {ss} />
          {:else if flat.step.type === "checkpoint"}
            <CheckpointView step={flat.step} section={flat.section.title} {ss} index={current} ongo={go} />
          {:else if flat.step.type === "broken"}
            <div class="broken">
              <h1>{flat.step.title}</h1>
              <p>This step has errors in the session file:</p>
              <ul>{#each flat.step.errors as e}<li><code>{e}</code></li>{/each}</ul>
            </div>
          {/if}
        </div>
      {/key}
    {/if}
  </main>

  {#if panel}
    {@const stepId = panel.step}
    <ThreadsPanel
      {comments}
      active={panel.active}
      draft={panel.draft}
      filter={(th) => ("step" in th.target && th.target.step === stepId) || (th.target.kind === "prototype" && stepPrototypes(stepId).has(th.target.file.split("#")[0]))}
      filterLabel={t.cm.thisStep}
      onclose={() => (panel = null)}
      ondraftdone={(tid) => panel && (panel = { ...panel, draft: null, active: tid })}
      onfocus={(th) => {
        const sid = "step" in th.target ? th.target.step : undefined;
        if (sid && sid !== flat?.step.id) {
          const i = ss.steps.findIndex((x) => x.step.id === sid);
          if (i >= 0) go(i);
        }
      }}
    />
  {/if}

  {#if ss.error && ss.session}
    <button class="toast" onclick={() => (ss.error = null)}>{ss.error} ×</button>
  {/if}

  {#if speaker && flat && flat.step.type !== "broken" && flat.step.notes}
    <aside class="speaker">{flat.step.notes}</aside>
  {/if}

  {#if notesOpen && flat}
    <div class="notes">
      <textarea class="field" rows="3" bind:value={note} onblur={saveNote} placeholder={t.notePlaceholder}></textarea>
    </div>
  {/if}

  <footer class="bottom">
    <button class="btn" onclick={back} disabled={current === 0}>{t.back}</button>
    <button class="btn ghost small" class:on={notesOpen} onclick={() => (notesOpen = !notesOpen)}>
      {t.notes}{#if ss.result(flat?.step.id ?? "")?.note} ●{/if} <span class="kbd">N</span>
    </button>
    {#if flat && flat.step.type !== "broken" && flat.step.notes}
      <button class="btn ghost small" class:on={speaker} onclick={() => (speaker = !speaker)}>Speaker notes <span class="kbd">S</span></button>
    {/if}
    <span class="grow"></span>
    <span class="pos muted">{current + 1} / {total}</span>
    <button class="btn primary" onclick={next}>{current + 1 >= total ? t.summary : t.next} <span class="kbd">{flat?.step.type === "triage" ? "Space" : "→"}</span></button>
  </footer>
</div>

<style>
  .runner {
    display: grid;
    grid-template-rows: auto 1fr auto auto auto;
    height: 100dvh;
    overflow: hidden;
  }
  .top {
    display: grid;
    grid-template-columns: auto minmax(10rem, 20rem) 1fr auto auto auto;
    align-items: center;
    gap: 1.2rem;
    padding: 0.8rem 1.4rem;
  }
  .back {
    text-decoration: none;
    font-size: 1.3rem;
    font-weight: 700;
    width: 2.2rem;
    height: 2.2rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }
  .back:hover {
    background: var(--paper-2);
  }
  .title {
    display: grid;
    line-height: 1.25;
    min-width: 0;
  }
  .title strong,
  .title span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title span {
    font-size: 0.85rem;
  }
  .count {
    font-size: 0.85rem;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .menuwrap {
    position: relative;
  }
  .menu {
    position: absolute;
    right: 0;
    top: 2.6rem;
    z-index: 30;
    width: 22rem;
    background: var(--card);
    border-radius: var(--r-card);
    box-shadow: 0 18px 40px -18px rgba(27, 36, 48, 0.5), 0 0 0 1px var(--line);
    padding: 1rem;
    display: grid;
    gap: 0.8rem;
  }
  .menu label,
  .join {
    display: grid;
    gap: 0.3rem;
    font-size: 0.85rem;
    font-weight: 650;
  }
  .danger {
    color: var(--block);
    justify-self: start;
  }
  .join code {
    word-break: break-all;
    font-weight: 400;
  }
  .stage {
    min-height: 0;
    overflow: auto;
    padding: clamp(1rem, 2.5vw, 2.4rem) clamp(1rem, 4vw, 4rem);
  }
  .step {
    height: 100%;
    animation: enter 0.32s var(--ease);
  }
  @keyframes enter {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }
  .broken {
    display: grid;
    gap: 1rem;
    max-width: 48rem;
    margin: 0 auto;
    color: var(--block);
  }
  .speaker {
    margin: 0 1.4rem;
    padding: 0.8rem 1rem;
    border-radius: var(--r-card);
    background: var(--ink);
    color: #fff;
    font-size: 0.95rem;
  }
  .notes {
    padding: 0 1.4rem 0.6rem;
  }
  .bottom {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 1.4rem 1rem;
  }
  .btn.has {
    background: var(--beacon);
    border-color: var(--beacon);
  }
  .bottom .on {
    background: var(--paper-2);
  }
  .grow {
    flex: 1;
  }
  .pos {
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
  }
  .btn.primary .kbd {
    background: transparent;
    color: #fff;
    border-color: rgba(255, 255, 255, 0.4);
  }
  .error {
    color: var(--block);
  }
  .toast {
    position: fixed;
    bottom: 5rem;
    left: 50%;
    translate: -50% 0;
    z-index: 40;
    border: 0;
    background: var(--block);
    color: #fff;
    padding: 0.6rem 1rem;
    border-radius: 10px;
    font-weight: 650;
    max-width: 40rem;
  }
  @media (max-width: 800px) {
    .top {
      grid-template-columns: auto 1fr auto;
    }
    .arcwrap {
      grid-column: 1 / -1;
      order: 5;
    }
    .count {
      display: none;
    }
  }
</style>
