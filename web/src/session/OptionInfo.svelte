<script lang="ts">
  // The right column of an opened option: everything editable in place, every part
  // commentable, and one button to have the agent rebuild the option from the comments.
  import { md, mdInline } from "../lib/md";
  import { api } from "../lib/api";
  import { store } from "../lib/store.svelte";
  import EditableText from "../comments/EditableText.svelte";
  import EditableList from "../comments/EditableList.svelte";
  import Composer from "../comments/Composer.svelte";
  import ThreadCard from "../comments/ThreadCard.svelte";
  import { useReview } from "./review";
  import RequestStatus from "../components/RequestStatus.svelte";
  import { agent } from "../lib/agent.svelte";
  import type { ChoiceStepT, CommentTargetT, OptionT } from "../lib/types";
  import type { SessionState } from "./state.svelte";

  let {
    step,
    option: o,
    ss,
    draft = $bindable(null),
    onchoose,
    onclose,
  }: {
    step: ChoiceStepT;
    option: OptionT;
    ss: SessionState;
    draft?: { target: CommentTargetT; quote?: string } | null;
    onchoose: () => void;
    onclose: () => void;
  } = $props();

  const t = $derived(store.t);
  const review = useReview();
  const result = $derived(ss.result(step.id));
  const at = (field: string) => ["options", `@${o.id}`, field];
  const save = (field: string) => (next: unknown, prev: unknown) => review!.edit(step.id, at(field), next, prev);

  const threads = $derived(review?.threadsOf(step.id, o.id) ?? []);
  const listMarks = (field: string) =>
    new Set(
      threads
        .filter((th) => th.target.kind === "step" && th.target.field?.startsWith(`${field}[`))
        .map((th) => Number((th.target as { field: string }).field.match(/\[(\d+)\]/)?.[1])),
    );
  const commentOn = (field?: string, quote?: string) =>
    (draft = { target: { kind: "step", file: review!.file, step: step.id, option: o.id, ...(field ? { field } : {}) }, quote });

  let showDone = $state(false);
  const done = $derived(threads.filter((x) => x.status === "resolved"));

  // rebuild through the agent
  let asking = $state(false);
  let wish = $state("");
  const request = $derived(
    [...agent.requests].reverse().find((r) => r.kind === "revise-option" && r.step === step.id && r.option === o.id && r.status !== "done" && r.status !== "cancelled") ??
      null,
  );
  async function rebuild() {
    await api.request({
      kind: "revise-option",
      project: ss.project,
      session: ss.id,
      step: step.id,
      option: o.id,
      text: wish.trim(),
      threads: threads.filter((th) => th.status === "open").map((th) => th.id),
      author: store.author || undefined,
    });
    asking = false;
    wish = "";
    ss.load();
  }
</script>

<aside class="info">
  <div class="info-head">
    <h2><EditableText value={o.label} onsave={save("label")} disabled={!review} /></h2>
    <button class="btn small ghost" onclick={onclose} aria-label="close">×</button>
  </div>
  <p class="lead"><EditableText value={o.summary} onsave={save("summary")} placeholder="+ summary" disabled={!review}>{@html mdInline(o.summary)}</EditableText></p>

  {#if o.consequence || review}
    <div class="conseq">
      <strong>{t.ctx.consequence}</strong>
      <EditableText value={o.consequence} onsave={save("consequence")} multiline placeholder="+" disabled={!review} />
    </div>
  {/if}

  {#if step.recommended === o.id}
    <div class="recbox">
      <strong>{t.recommendation}</strong>
      <EditableText value={step.because} onsave={(n, p) => review!.edit(step.id, ["because"], n, p)} placeholder="+ because" disabled={!review} />
    </div>
  {:else if review && !o.baseline}
    <button class="link" onclick={() => review.edit(step.id, ["recommended"], o.id, step.recommended ?? null)}>☆ {t.recommendation}</button>
  {/if}

  {#if o.body || review}
    <div class="body"><EditableText value={o.body} onsave={save("body")} multiline markdown placeholder="+ details" disabled={!review}><div class="md">{@html md(o.body)}</div></EditableText></div>
  {/if}

  <div class="pc">
    <div>
      <h3 class="pro">{t.pros}</h3>
      {#if review}
        <EditableList items={o.pros ?? []} onsave={save("pros")} commented={listMarks("pros")} oncomment={(i, x) => commentOn(`pros[${i}]`, x)} />
      {:else}<ul>{#each o.pros ?? [] as x}<li>{@html mdInline(x)}</li>{/each}</ul>{/if}
    </div>
    <div>
      <h3 class="con">{t.cons}</h3>
      {#if review}
        <EditableList items={o.cons ?? []} onsave={save("cons")} commented={listMarks("cons")} oncomment={(i, x) => commentOn(`cons[${i}]`, x)} />
      {:else}<ul>{#each o.cons ?? [] as x}<li>{@html mdInline(x)}</li>{/each}</ul>{/if}
    </div>
  </div>
  {#each [["enables", t.enables], ["forecloses", t.forecloses]] as const as [field, label]}
    {#if o[field]?.length || review}
      <div class="later">
        <h3>{label}</h3>
        {#if review}
          <EditableList items={o[field] ?? []} onsave={save(field)} commented={listMarks(field)} oncomment={(i, x) => commentOn(`${field}[${i}]`, x)} />
        {:else}<ul>{#each o[field] ?? [] as x}<li>{@html mdInline(x)}</li>{/each}</ul>{/if}
      </div>
    {/if}
  {/each}
  <p class="muted effort">{t.effort}: <strong><EditableText value={o.effort} onsave={save("effort")} placeholder="?" disabled={!review} /></strong></p>

  {#if !o.baseline}
    <button class="btn primary choose" onclick={onchoose}>
      {result?.value === o.id ? `✓ ${t.chosen}` : `${t.choose}: ${o.label}`} <span class="kbd">↵</span>
    </button>
  {/if}

  {#if review}
    <section class="talk">
      <div class="talk-head">
        <h3>💬 {t.cm.comments} {threads.filter((x) => x.status === "open").length || ""}</h3>
        <span class="grow"></span>
        {#if !draft}<button class="btn small ghost" onclick={() => commentOn()}>+ {t.cm.comment}</button>{/if}
      </div>
      {#if draft}
        <div class="draft">
          <Composer quote={draft.quote} onsubmit={(text) => (review.comments.add(draft!.target, text), (draft = null))}
            onagent={(text) => { const target = draft!.target; draft = null; review.comments.addForAgent(target, text); }} oncancel={() => (draft = null)} />
        </div>
      {/if}
      {#each threads.filter((x) => x.status === "open" || showDone) as th (th.id)}
        <ThreadCard thread={th} comments={review.comments} />
      {/each}
      {#if done.length}
        <button class="link" onclick={() => (showDone = !showDone)}>✓ {done.length} {t.cm.resolved.toLowerCase()}{showDone ? " ▴" : " ▾"}</button>
      {/if}
      {#if !draft && !threads.some((x) => x.status === "open")}<p class="muted hint">{t.cm.reviewHint}</p>{/if}

      <div class="rebuild">
        {#if request}
          <RequestStatus {request} lines={5} />
        {:else if asking}
          <textarea class="field" rows="3" bind:value={wish} placeholder={t.rebuildHint}></textarea>
          <div class="row">
            <button class="btn small ghost" onclick={() => (asking = false)}>{t.cm.cancel}</button>
            <button class="btn small ai" onclick={rebuild} disabled={!wish.trim() && !threads.some((x) => x.status === "open")}>↻ {t.rebuildOption}</button>
          </div>
        {:else}
          <button class="btn small ai" onclick={() => (asking = true)}>
            ↻ {t.rebuildOption}{#if threads.some((x) => x.status === "open")} · {threads.filter((x) => x.status === "open").length} 💬{/if}
          </button>
        {/if}
      </div>
    </section>
  {/if}
</aside>

<style>
  .info {
    display: grid;
    gap: 0.9rem;
    align-content: start;
  }
  .info-head {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
  }
  .info h2 {
    font-size: 2rem;
    flex: 1;
  }
  .lead {
    font-size: 1.15rem;
    color: var(--ink-2);
  }
  .conseq {
    display: grid;
    gap: 0.15rem;
    padding: 0.55rem 0.8rem;
    border-radius: 8px;
    background: var(--card);
    box-shadow: inset 4px 0 0 var(--ink);
    font-size: 1rem;
    font-weight: 600;
  }
  .conseq strong {
    font-size: 0.8rem;
    color: var(--ink-3);
  }
  .recbox {
    display: grid;
    gap: 0.15rem;
    background: var(--beacon-soft);
    border-left: 4px solid var(--beacon);
    padding: 0.55rem 0.8rem;
    border-radius: 8px;
    font-size: 0.95rem;
  }
  .recbox strong {
    font-size: 0.8rem;
    color: #6b4d00;
  }
  .link {
    justify-self: start;
    border: 0;
    background: none;
    padding: 0;
    color: var(--ink-3);
    font-size: 0.85rem;
    font-weight: 650;
  }
  .link:hover {
    color: var(--ink);
  }
  .pc {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .info h3 {
    font-family: var(--font-ui);
    font-size: 0.95rem;
    font-weight: 800;
    margin-bottom: 0.3rem;
  }
  .pro {
    color: var(--should);
  }
  .con {
    color: var(--block);
  }
  .info ul {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.3rem;
  }
  .later h3 {
    color: var(--ink-3);
  }
  .effort {
    margin: 0;
  }
  .choose {
    height: 3.2rem;
    font-size: 1.05rem;
    justify-content: center;
  }
  .choose .kbd {
    background: transparent;
    color: #fff;
    border-color: rgba(255, 255, 255, 0.4);
  }
  .talk {
    display: grid;
    gap: 0.6rem;
    padding-top: 0.9rem;
    border-top: 1.5px solid var(--line);
  }
  .talk-head {
    display: flex;
    align-items: center;
  }
  .talk-head h3 {
    margin: 0;
  }
  .grow {
    flex: 1;
  }
  .draft {
    padding: 0.7rem;
    background: var(--card);
    border-radius: var(--r-card);
    box-shadow: 0 0 0 2px var(--beacon);
  }
  .hint {
    font-size: 0.85rem;
  }
  .rebuild {
    display: grid;
    gap: 0.5rem;
  }
  .rebuild .row {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }
  .btn.ai {
    border-color: var(--ai);
    color: var(--ai);
    justify-self: start;
  }
</style>
