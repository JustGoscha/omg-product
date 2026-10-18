<script lang="ts">
  import { md, mdInline } from "../lib/md";
  import { store } from "../lib/store.svelte";
  import { diffable, diffCounts, diffVisual } from "../lib/diff";
  import StepHeader from "./StepHeader.svelte";
  import OwnOption from "./OwnOption.svelte";
  import Visual from "../visuals/Visual.svelte";
  import OptionInfo from "./OptionInfo.svelte";
  import ProblemPanel from "./ProblemPanel.svelte";
  import PrototypeDecision from "./PrototypeDecision.svelte";
  import { useReview } from "./review";
  import { api } from "../lib/api";
  import RequestStatus from "../components/RequestStatus.svelte";
  import { agent } from "../lib/agent.svelte";
  import type { ChoiceStepT, CommentTargetT, OptionT, VisualT } from "../lib/types";
  import type { SessionState } from "./state.svelte";

  let { step, section, ss }: { step: ChoiceStepT; section: string; ss: SessionState } = $props();

  const t = $derived(store.t);
  const review = useReview();
  const result = $derived(ss.result(step.id));
  let draft = $state<{ target: CommentTargetT; quote?: string } | null>(null);
  const stepThreads = $derived(review?.threadsOf(step.id).filter((x) => x.status === "open") ?? []);
  const markedFor = (optionId: string) =>
    new Set(
      (review?.threadsOf(step.id, optionId) ?? [])
        .filter((x) => x.status === "open" && x.target.kind === "element")
        .map((x) => (x.target as { element: string }).element),
    );
  // rebuild the whole decision
  let askDecision = $state(false);
  let wishDecision = $state("");
  const decisionRequest = $derived(
    [...agent.requests].reverse().find((r) => r.kind === "revise-step" && r.step === step.id && r.status !== "done" && r.status !== "cancelled") ?? null,
  );
  async function rebuildDecision() {
    await api.request({
      kind: "revise-step",
      project: ss.project,
      session: ss.id,
      step: step.id,
      text: wishDecision.trim(),
      threads: stepThreads.map((x) => x.id),
      author: store.author || undefined,
    });
    askDecision = false;
    wishDecision = "";
    ss.load();
  }
  const letters = "ABCDEFGHIJ";
  const baseline = $derived(step.options.find((o) => o.baseline || o.id === step.baseline));
  const options = $derived(step.options.filter((o) => o !== baseline));
  const vis = (o?: OptionT): VisualT | undefined => o?.visual ?? o?.visuals?.[0];

  // when the options are states of a prototype, the decision happens in the prototype
  const protoMode = $derived(options.filter((o) => vis(o)?.type === "prototype").length >= 2);
  let tab = $state("");
  $effect(() => {
    if (protoMode && !options.some((o) => o.id === tab) && tab !== baseline?.id) tab = step.recommended && options.some((o) => o.id === step.recommended) ? step.recommended : options[0].id;
  });
  let openId = $state<string | null>(null);
  let other = $state(false);
  let compareTo = $state<string | null>(null);
  let showChanges = $state(true);
  let fresh = $state<string | null>(null);
  let reasonFor = $state<"deferred" | "escalated" | null>(null);
  let reason = $state("");

  const open = $derived(step.options.find((o) => o.id === openId) ?? null);
  const compareBase = $derived.by(() => {
    if (!open) return undefined;
    const id = compareTo ?? (baseline && baseline !== open ? baseline.id : null);
    const o = step.options.find((x) => x.id === id);
    return o && o !== open && diffable(vis(o), vis(open)) ? vis(o) : undefined;
  });
  const canCompare = $derived(open ? step.options.filter((o) => o !== open && diffable(vis(o), vis(open))) : []);

  function choose(id: string) {
    ss.act({ op: "step", step: step.id, patch: { status: "decided", value: id } });
    openId = null;
  }
  function park(kind: "deferred" | "escalated") {
    ss.act({ op: "step", step: step.id, patch: { status: kind, reason: reason.trim() || undefined, value: undefined } });
    reasonFor = null;
    reason = "";
  }
  const reopen = () => ss.act({ op: "step", step: step.id, patch: { status: undefined, reason: undefined } });

  const stepId = $derived(step.id);
  $effect(() => {
    void stepId;
    openId = null;
    other = false;
    compareTo = null;
    reasonFor = null;
    draft = null;
  });

  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      // typing, or Enter on a focused control, belongs to that control
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable], button, [role=button], a")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length && protoMode) {
        e.preventDefault();
        tab = options[n - 1].id;
      } else if (e.key === "Enter" && protoMode && !openId && !other && options.some((o) => o.id === tab)) {
        e.preventDefault();
        e.stopPropagation();
        choose(tab);
      } else if (n >= 1 && n <= options.length) {
        e.preventDefault();
        openId = options[n - 1].id;
        other = false;
      } else if (e.key === "Escape" && (openId || other)) {
        e.preventDefault();
        e.stopPropagation();
        openId = null;
        other = false;
      } else if (e.key === "Enter" && open && !open.baseline) {
        e.preventDefault();
        e.stopPropagation();
        choose(open.id);
      }
    };
    addEventListener("keydown", onKey, true);
    return () => removeEventListener("keydown", onKey, true);
  });

  const votesFor = (id: string) => Object.entries(result?.votes ?? {}).filter(([, v]) => v === id).map(([who]) => who);
  const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const thumb = (o: OptionT) => {
    const v = vis(o);
    if (!v) return undefined;
    const b = vis(baseline);
    return showChanges && b && diffable(b, v) ? { v, base: b } : { v, base: undefined };
  };
</script>

<div class="choice">
  <StepHeader step={step} {section} />
  <ProblemPanel {step} />

  {#if result?.status === "deferred" || result?.status === "escalated"}
    <div class="parked">
      <strong>{result.status === "deferred" ? t.defer : t.escalate}</strong>
      {#if result.reason}<span>{result.reason}</span>{/if}
      <button class="btn small" onclick={reopen}>{t.undo}</button>
    </div>
  {/if}

  {#if decisionRequest}<RequestStatus request={decisionRequest} lines={4} />{/if}

  {#if protoMode}
    <PrototypeDecision {step} {options} {baseline} {ss} bind:active={tab} onchoose={choose} onother={() => ((other = true), (openId = null))} />
  {:else}
  <div class="options" style="--n:{options.length + (step.allowOther ? 1 : 0) + (baseline ? 1 : 0)}">
    {#if baseline}
      {@const th = thumb(baseline)}
      <button class="opt base" onclick={() => ((openId = baseline.id), (other = false))}>
        <div class="top"><span class="label">{baseline.label}</span></div>
        {#if baseline.summary}<p class="summary">{@html mdInline(baseline.summary)}</p>{/if}
        {#if th}<div class="thumb"><Visual visual={th.v} project={ss.project} compact caption={false} /></div>{/if}
      </button>
    {/if}
    {#each options as o, i (o.id)}
      {@const th = thumb(o)}
      {@const chosen = result?.value === o.id}
      {@const counts = th?.base ? diffCounts(diffVisual(th.base, th.v)) : null}
      <button
        class="opt"
        class:chosen
        class:rec={step.recommended === o.id}
        class:fresh={fresh === o.id || (o.requestId && o.requestId === result?.other?.requestId)}
        onclick={() => ((openId = o.id), (other = false))}
      >
        <div class="top">
          <span class="key">{letters[i]}</span>
          <span class="label">{o.label}</span>
          {#if chosen}<span class="check" aria-label={t.chosen}>✓</span>{/if}
        </div>
        {#if o.summary}<p class="summary">{@html mdInline(o.summary)}</p>{/if}
        {#if o.consequence}<p class="conseq">→ {o.consequence}</p>{/if}
        {#if step.recommended === o.id && step.because}<p class="because">{step.because}</p>{/if}
        {#if th}<div class="thumb"><Visual visual={th.v} base={th.base} project={ss.project} compact caption={false} /></div>{/if}
        <div class="foot">
          {#if step.recommended === o.id}<span class="chip recchip">{t.recommendation}</span>{/if}
          {#if o.requestId}<span class="chip aichip">AI</span>{/if}
          {#if o.effort}<span class="chip">{t.effort} {o.effort}</span>{/if}
          {#if counts && counts.added + counts.removed + counts.changed}
            <span class="delta">
              {#if counts.added}<span class="d-add">+{counts.added}</span>{/if}
              {#if counts.removed}<span class="d-rem">−{counts.removed}</span>{/if}
              {#if counts.changed}<span class="d-chg">~{counts.changed}</span>{/if}
            </span>
          {/if}
          <span class="grow"></span>
          {#each votesFor(o.id) as who}<span class="voter" title={who}>{initials(who)}</span>{/each}
        </div>
      </button>
    {/each}
    {#if step.allowOther}
      <button class="opt otheropt" class:chosen={result?.value === "other"} onclick={() => ((other = true), (openId = null))}>
        <div class="top"><span class="key">?</span><span class="label">{t.none}</span></div>
        <p class="summary">{result?.value === "other" && result.other?.text ? result.other.text : t.ownTitle}</p>
        <div class="plus">+</div>
      </button>
    {/if}
  </div>

  {/if}

  <div class="bar">
    {#if baseline && options.some((o) => diffable(vis(baseline), vis(o)))}
      <label class="toggle"><input type="checkbox" bind:checked={showChanges} /> {t.compare}: {baseline.label}</label>
    {/if}
    <span class="grow"></span>
    {#if review}
      {#if askDecision && !decisionRequest}
        <input class="field reason" bind:value={wishDecision} placeholder={t.rebuildHint} onkeydown={(e) => e.key === "Enter" && rebuildDecision()} />
        <button class="btn small ai" onclick={rebuildDecision} disabled={!wishDecision.trim() && !stepThreads.length}>↻</button>
        <button class="btn small ghost" onclick={() => (askDecision = false)}>×</button>
      {:else}
        <button class="btn small" class:has={stepThreads.length} onclick={() => review.discuss(step.id)}>💬 {stepThreads.length || ""}</button>
        <button class="btn small ai" onclick={() => (askDecision = true)} disabled={!!decisionRequest}>↻ {t.rebuildDecision}</button>
      {/if}
    {/if}
    {#if reasonFor}
      <input class="field reason" bind:value={reason} placeholder={t.reasonPlaceholder} onkeydown={(e) => e.key === "Enter" && park(reasonFor!)} />
      <button class="btn small primary" onclick={() => park(reasonFor!)}>OK</button>
      <button class="btn small ghost" onclick={() => (reasonFor = null)}>×</button>
    {:else}
      <button class="btn small" onclick={() => (reasonFor = "deferred")}>{t.defer}</button>
      {#if step.level === "tech"}<button class="btn small" onclick={() => (reasonFor = "escalated")}>{t.escalate}</button>{/if}
    {/if}
  </div>
</div>

{#if open || other}
  <div class="scrim" onclick={() => ((openId = null), (other = false))} role="presentation"></div>
  <section class="sheet" aria-label={open?.label ?? t.none}>
    {#if other}
      <div class="own-wrap">
        <OwnOption {step} {ss} onclose={() => (other = false)} onbuilt={(id) => ((fresh = id), (other = false), (openId = id))} />
      </div>
    {:else if open}
      {@const v = vis(open)}
      <div class="detail" class:novis={!v}>
        {#if v}
          <div class="big">
            {#if canCompare.length}
              <div class="cmp">
                <span>{t.compareWith}</span>
                <button class="chip" class:on={!compareBase} onclick={() => (compareTo = "__none")}>—</button>
                {#each canCompare as o}
                  <button class="chip" class:on={compareBase === vis(o)} onclick={() => (compareTo = o.id)}>{o.label}</button>
                {/each}
                {#if compareBase}
                  <span class="legend"><i class="l-add"></i>{t.diffAdded} <i class="l-rem"></i>{t.diffRemoved} <i class="l-chg"></i>{t.diffChanged}</span>
                {/if}
              </div>
            {/if}
            <div class="bigvis">
              <Visual visual={v} base={compareBase} project={ss.project} annotations={ss.results.annotations} author={ss.author}
                oncomment={(a) => ss.act({ op: "annotate", annotation: { ...a, id: `a-${Date.now().toString(36)}`, step: step.id } })}
                ondelete={(id) => ss.act({ op: "unannotate", id })}
                marked={markedFor(open.id)}
                onelement={review ? (element, label) => (draft = { target: { kind: "element", file: review.file, step: step.id, option: open!.id, element, label }, quote: label }) : undefined} />
            </div>
            {#each open.visuals?.slice(open.visual ? 0 : 1) ?? [] as extra}
              <div class="bigvis"><Visual visual={extra} project={ss.project} /></div>
            {/each}
          </div>
        {/if}
        <OptionInfo {step} option={open} {ss} bind:draft onchoose={() => choose(open.id)} onclose={() => (openId = null)} />
      </div>
    {/if}
  </section>
{/if}

<style>
  /* the problem section comes first; options keep their size and the page scrolls */
  .choice {
    display: grid;
    grid-template-rows: auto auto auto auto minmax(18rem, 1fr) auto;
    gap: 1.2rem;
    min-height: 100%;
  }
  .parked {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.7rem 1rem;
    border-radius: var(--r-card);
    background: var(--paper-2);
    border: 1.5px dashed var(--fog);
  }
  .options {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    gap: 1rem;
    align-items: stretch;
    min-height: 0;
  }
  .opt {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto auto 1fr auto;
    gap: 0.6rem;
    text-align: left;
    padding: 1rem;
    border-radius: var(--r-panel);
    border: 2px solid transparent;
    background: var(--card);
    box-shadow: var(--shadow-lift);
    min-height: 0;
    overflow: hidden;
    transition: border-color 0.15s, transform 0.15s var(--ease);
  }
  .opt:hover {
    transform: translateY(-2px);
    border-color: var(--fog);
  }
  .opt.rec {
    border-color: var(--beacon);
  }
  .opt.chosen {
    border-color: var(--ink);
    box-shadow: 0 0 0 3px var(--ink), var(--shadow-lift);
  }
  .opt.fresh {
    animation: glow 1.6s var(--ease) 2;
  }
  @keyframes glow {
    50% {
      box-shadow: 0 0 0 6px var(--ai-soft), 0 0 0 8px var(--ai);
    }
  }
  .opt.base {
    background: transparent;
    box-shadow: none;
    border: 2px dashed var(--fog);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }
  .key {
    display: grid;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 8px;
    background: var(--ink);
    color: #fff;
    font-weight: 800;
    font-size: 0.9rem;
    flex: none;
  }
  .label {
    font-family: var(--font-display);
    font-weight: 680;
    font-size: clamp(1.1rem, 0.9rem + 0.6vw, 1.45rem);
    line-height: 1.15;
  }
  .check {
    margin-left: auto;
    font-weight: 900;
    font-size: 1.3rem;
  }
  .summary {
    color: var(--ink-2);
    font-size: 1rem;
  }
  .conseq {
    font-size: 0.9rem;
    color: var(--ink);
    font-weight: 600;
  }
  .because {
    font-size: 0.88rem;
    font-weight: 650;
    color: #6b4d00;
    background: var(--beacon-soft);
    border-radius: 8px;
    padding: 0.35rem 0.6rem;
  }
  .thumb {
    min-height: 0;
    max-height: 32vh;
    overflow: hidden;
    border-radius: var(--r-small);
    background: var(--paper);
    padding: 0.4rem;
    mask-image: linear-gradient(to bottom, #000 85%, transparent);
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .grow {
    flex: 1;
  }
  .recchip {
    background: var(--beacon);
    color: var(--ink);
  }
  .aichip {
    background: var(--ai-soft);
    color: var(--ai);
  }
  .delta {
    display: inline-flex;
    gap: 0.3rem;
    font-weight: 800;
    font-size: 0.82rem;
  }
  .d-add {
    color: var(--added);
  }
  .d-rem {
    color: var(--removed);
  }
  .d-chg {
    color: var(--changed);
  }
  .voter {
    display: grid;
    place-items: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    background: var(--paper-2);
    font-size: 0.68rem;
    font-weight: 800;
  }
  .otheropt {
    background: transparent;
    box-shadow: none;
    border: 2px dashed var(--fog);
  }
  .otheropt .key {
    background: var(--fog);
    color: var(--ink);
  }
  .otheropt.chosen {
    border-style: solid;
  }
  .plus {
    display: grid;
    place-items: center;
    font-size: 3rem;
    font-weight: 300;
    color: var(--fog);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .btn.ai {
    border-color: var(--ai);
    color: var(--ai);
  }
  .btn.has {
    background: var(--beacon);
    border-color: var(--beacon);
  }
  .toggle {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-weight: 600;
    color: var(--ink-2);
  }
  .reason {
    width: min(28rem, 60vw);
    padding: 0.4rem 0.7rem;
  }

  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(27, 36, 48, 0.32);
    z-index: 20;
    animation: fade 0.2s;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  .sheet {
    position: fixed;
    left: clamp(0.5rem, 3vw, 3rem);
    right: clamp(0.5rem, 3vw, 3rem);
    bottom: 0;
    top: 6vh;
    z-index: 21;
    background: var(--paper);
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -20px 60px -20px rgba(27, 36, 48, 0.5);
    overflow: auto;
    animation: rise 0.32s var(--ease);
  }
  @keyframes rise {
    from {
      transform: translateY(40px);
      opacity: 0;
    }
  }
  .own-wrap {
    max-width: 52rem;
    margin: 0 auto;
    padding: 2rem;
  }
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 26rem);
    gap: 2rem;
    padding: 2rem;
    min-height: 100%;
  }
  .detail.novis {
    grid-template-columns: minmax(0, 40rem);
    justify-content: center;
  }
  .big {
    display: grid;
    gap: 1rem;
    align-content: start;
    min-width: 0;
  }
  .bigvis {
    background: var(--card);
    border-radius: var(--r-panel);
    padding: 1.25rem;
    box-shadow: var(--shadow-lift);
    overflow: auto;
  }
  .cmp {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    font-weight: 600;
    color: var(--ink-2);
  }
  .cmp .chip {
    border: 1.5px solid transparent;
  }
  .cmp .chip.on {
    border-color: var(--ink);
    background: var(--card);
    color: var(--ink);
  }
  .legend {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-left: 0.6rem;
    font-size: 0.85rem;
  }
  .legend i {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 3px;
    display: inline-block;
    margin-left: 0.4rem;
  }
  .l-add {
    background: var(--added);
  }
  .l-rem {
    background: var(--removed);
  }
  .l-chg {
    background: var(--changed);
  }
  @media (max-width: 1000px) {
    .options {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .detail {
      grid-template-columns: 1fr;
    }
  }
</style>
