<script lang="ts">
  // A decision taken in the prototype: the options are states of the live prototype.
  // Switch between them with the tabs (or 1–9), click around in each, comment on
  // what you see, and pick one. Side by side shows all options at once.
  import { store } from "../lib/store.svelte";
  import Visual from "../visuals/Visual.svelte";
  import OptionInfo from "./OptionInfo.svelte";
  import type { ChoiceStepT, CommentTargetT, OptionT, VisualT } from "../lib/types";
  import type { SessionState } from "./state.svelte";

  let {
    step,
    options,
    baseline,
    ss,
    active = $bindable(),
    onchoose,
    onother,
  }: {
    step: ChoiceStepT;
    options: OptionT[];
    baseline?: OptionT;
    ss: SessionState;
    active: string;
    onchoose: (id: string) => void;
    onother: () => void;
  } = $props();

  const t = $derived(store.t);
  const letters = "ABCDEFGHIJ";
  const result = $derived(ss.result(step.id));
  const all = $derived([...(baseline ? [baseline] : []), ...options]);
  const current = $derived(all.find((o) => o.id === active) ?? options[0]);
  const vis = (o?: OptionT): VisualT | undefined => o?.visual ?? o?.visuals?.[0];
  let side = $state(false);
  let draft = $state<{ target: CommentTargetT; quote?: string } | null>(null);
  const comment = (a: Parameters<NonNullable<Parameters<typeof Visual>[1]["oncomment"]>>[0]) =>
    ss.act({ op: "annotate", annotation: { ...a, id: `a-${Date.now().toString(36)}`, step: step.id } });
</script>

<div class="pd">
  <div class="tabs" role="tablist">
    {#each all as o (o.id)}
      {@const i = options.indexOf(o)}
      <button role="tab" class="tab" class:on={!side && current?.id === o.id} class:base={o === baseline} class:chosen={result?.value === o.id} class:rec={step.recommended === o.id}
        aria-selected={current?.id === o.id} onclick={() => ((active = o.id), (side = false))}>
        {#if i >= 0}<span class="key">{letters[i]}</span>{/if}
        <span class="lbl">{o.label}</span>
        {#if step.recommended === o.id}<span class="star" title={t.recommendation}>★</span>{/if}
        {#if result?.value === o.id}<span class="ok">✓</span>{/if}
      </button>
    {/each}
    {#if step.allowOther}
      <button class="tab other" onclick={onother}><span class="key">?</span><span class="lbl">{t.none}</span></button>
    {/if}
    <span class="grow"></span>
    <button class="btn small" class:on={side} onclick={() => (side = !side)}>⧉ {t.sideBySide}</button>
  </div>

  {#if side}
    <div class="cols" style="--n:{options.length}">
      {#each options as o, i (o.id)}
        {@const v = vis(o)}
        <div class="col" class:chosen={result?.value === o.id}>
          <div class="colhead">
            <span class="key">{letters[i]}</span><strong>{o.label}</strong>
          </div>
          {#if v}<Visual visual={v} project={ss.project} annotations={ss.results.annotations} oncomment={comment} ondelete={(id) => ss.act({ op: "unannotate", id })} author={ss.author} />{/if}
          {#if o.consequence}<p class="conseq">→ {o.consequence}</p>{/if}
          <button class="btn small" class:primary={result?.value !== o.id} onclick={() => onchoose(o.id)}>{result?.value === o.id ? `✓ ${t.chosen}` : t.choose}</button>
        </div>
      {/each}
    </div>
  {:else if current}
    {@const v = vis(current)}
    <div class="main">
      <div class="stage">
        {#if v}
          {#key current.id}
            <div class="fade">
              <Visual visual={v.type === "prototype" ? { ...v, height: v.height ?? 560 } : v} project={ss.project} annotations={ss.results.annotations} oncomment={comment} ondelete={(id) => ss.act({ op: "unannotate", id })} author={ss.author} />
            </div>
            <!-- the option's other pictures (data model, flow) under the screen -->
            {#each (current.visual ? current.visuals ?? [] : (current.visuals ?? []).slice(1)) as extra}
              <div class="extra"><Visual visual={extra} project={ss.project} /></div>
            {/each}
          {/key}
        {/if}
      </div>
      <OptionInfo {step} option={current} {ss} bind:draft onchoose={() => onchoose(current.id)} onclose={() => {}} />
    </div>
  {/if}
</div>

<style>
  .pd {
    display: grid;
    gap: 0.8rem;
    min-height: 0;
  }
  .tabs {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    height: 2.6rem;
    padding: 0 0.9rem 0 0.4rem;
    border-radius: 12px;
    border: 2px solid transparent;
    background: var(--card);
    box-shadow: var(--shadow-lift);
    font-weight: 700;
    transition: border-color 0.15s, transform 0.1s;
  }
  .tab:hover {
    border-color: var(--fog);
  }
  .tab.on {
    border-color: var(--ink);
    background: var(--ink);
    color: #fff;
  }
  .tab.on .key {
    background: #fff;
    color: var(--ink);
  }
  .tab.base {
    background: transparent;
    box-shadow: none;
    border: 2px dashed var(--fog);
    padding-left: 0.8rem;
  }
  .tab.base.on {
    background: var(--paper-2);
    color: var(--ink);
    border-style: solid;
    border-color: var(--ink-3);
  }
  .tab.rec:not(.on) {
    border-color: var(--beacon);
  }
  .tab.chosen:not(.on) {
    box-shadow: 0 0 0 3px var(--ink), var(--shadow-lift);
  }
  .tab.other {
    background: transparent;
    box-shadow: none;
    border: 2px dashed var(--fog);
  }
  .key {
    display: grid;
    place-items: center;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 8px;
    background: var(--ink);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 800;
  }
  .other .key {
    background: var(--fog);
    color: var(--ink);
  }
  .star {
    color: var(--must);
  }
  .ok {
    font-weight: 900;
  }
  .grow {
    flex: 1;
  }
  .btn.on {
    background: var(--ink);
    color: #fff;
    border-color: var(--ink);
  }
  .main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(19rem, 24rem);
    gap: 1.4rem;
    align-items: start;
  }
  .stage {
    min-width: 0;
  }
  .extra {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--card);
    border-radius: var(--r-panel);
    box-shadow: var(--shadow-lift);
  }
  .fade {
    animation: fade 0.25s var(--ease);
  }
  @keyframes fade {
    from {
      opacity: 0.4;
    }
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    gap: 1rem;
  }
  .col {
    display: grid;
    gap: 0.6rem;
    align-content: start;
    padding: 0.7rem;
    border-radius: var(--r-panel);
    background: var(--card);
    box-shadow: var(--shadow-lift);
    border: 2px solid transparent;
  }
  .col.chosen {
    border-color: var(--ink);
  }
  .colhead {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-display);
    font-size: 1.15rem;
  }
  .conseq {
    font-size: 0.9rem;
    font-weight: 600;
  }
  @media (max-width: 1100px) {
    .main {
      grid-template-columns: 1fr;
    }
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
