<script lang="ts">
  import { untrack } from "svelte";
  import { api } from "../lib/api";
  import { store } from "../lib/store.svelte";
  import Dictate from "./Dictate.svelte";
  import SketchPad from "./SketchPad.svelte";
  import { fileUrl } from "../lib/api";
  import type { ChoiceStepT } from "../lib/types";
  import type { SessionState } from "./state.svelte";
  import RequestStatus from "../components/RequestStatus.svelte";
  import { agent } from "../lib/agent.svelte";
  import { isStatic } from "../lib/static";

  let { step, ss, onclose, onbuilt }: { step: ChoiceStepT; ss: SessionState; onclose: () => void; onbuilt: (optionId: string) => void } = $props();
  const t = $derived(store.t);
  const result = $derived(ss.result(step.id));
  const initial = untrack(() => ss.result(step.id)?.other);
  let text = $state(initial?.text ?? "");
  let sketch = $state<string | undefined>(initial?.sketch);
  let sketching = $state(false);
  let busy = $state(false);
  let noAgent = $state<string | null>(null);
  let copied = $state(false);
  let started = $state<number | null>(null);
  let now = $state(Date.now());

  const requestId = $derived(result?.other?.requestId);
  const request = $derived(agent.get(requestId) ?? ss.requests.find((r) => r.id === requestId));
  const built = $derived(step.options.find((o) => o.requestId && o.requestId === requestId));

  $effect(() => {
    if (!request || request.status === "done" || request.status === "failed") return;
    const i = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(i);
  });
  $effect(() => {
    if (built) onbuilt(built.id);
  });

  async function saveSketch(dataUrl: string) {
    sketching = false;
    const res = await api.asset(ss.project, dataUrl, `sketch-${step.id}-${Date.now().toString(36)}`);
    sketch = res.path;
  }

  async function build() {
    busy = true;
    try {
      const r = await api.request({
        kind: "option",
        project: ss.project,
        session: ss.id,
        step: step.id,
        text,
        sketch: sketch ? `projects/${ss.project}/${sketch}` : undefined,
        author: ss.author || undefined,
      });
      started = Date.now();
      await ss.act({ op: "step", step: step.id, patch: { other: { text, sketch, requestId: r.id } } });
      if (!r.agent) noAgent = r.prompt;
      await ss.load();
    } finally {
      busy = false;
    }
  }

  function keep() {
    ss.act({ op: "step", step: step.id, patch: { status: "decided", value: "other", other: { text, sketch, requestId } } });
    onclose();
  }

  const elapsed = $derived(request?.createdAt ? Math.max(0, Math.round((now - Date.parse(request.createdAt)) / 1000)) : 0);
</script>

<div class="own">
  <div class="head">
    <h2>{t.ownTitle}</h2>
    <button class="btn small ghost" onclick={onclose} aria-label="close">×</button>
  </div>

  {#if sketching}
    <div class="sketch-area"><SketchPad onsave={saveSketch} oncancel={() => (sketching = false)} /></div>
  {:else}
    <textarea class="field big" rows="5" bind:value={text} placeholder={t.ownPlaceholder}></textarea>
    <div class="tools">
      <Dictate ontext={(s) => (text = text ? `${text} ${s}` : s)} />
      {#if !isStatic}<button class="btn small" onclick={() => (sketching = true)}>✎ {t.sketchIt}</button>{/if}
      {#if sketch}
        <img class="preview" src={fileUrl(`projects/${ss.project}/${sketch}`)} alt="sketch" />
        <button class="btn small ghost" onclick={() => (sketch = undefined)}>×</button>
      {/if}
    </div>

    {#if request && !built}
      <RequestStatus {request} lines={5} />
    {/if}
    {#if noAgent && request?.status === "open" && !agent.connected}
      <div class="noagent">
        <p>No agent picked this up yet. Start one next to the studio with <code>omgp work</code>, or paste this into an agent chat:</p>
        <button class="btn small" onclick={() => (navigator.clipboard.writeText(noAgent!), (copied = true))}>{copied ? t.copied : t.copyPrompt}</button>
      </div>
    {/if}

    {#if isStatic}<p class="noagent">{t.demo.needsAgent}</p>{/if}
    <div class="actions">
      <button class="btn" class:primary={isStatic} onclick={keep} disabled={!text.trim() && !sketch}>{t.keepAsText}</button>
      {#if !isStatic}
        <button class="btn primary" onclick={build} disabled={busy || (!text.trim() && !sketch) || request?.status === "working"}>{t.build}</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .own {
    display: grid;
    gap: 0.9rem;
    height: 100%;
    align-content: start;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    font-size: 1.6rem;
  }
  .big {
    font-size: 1.15rem;
    line-height: 1.45;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .preview {
    height: 2.5rem;
    border-radius: 6px;
    border: 1px solid var(--line);
  }
  .sketch-area {
    height: min(60vh, 520px);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
  }
  .noagent {
    display: grid;
    gap: 0.5rem;
    justify-items: start;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
</style>
