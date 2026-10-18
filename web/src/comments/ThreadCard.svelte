<script lang="ts">
  import { store } from "../lib/store.svelte";
  import { mdInline } from "../lib/md";
  import type { AnchoredThread } from "../lib/types";
  import type { Comments } from "../lib/comments.svelte";

  let { thread, comments, active = false, onfocus }: { thread: AnchoredThread; comments: Comments; active?: boolean; onfocus?: () => void } = $props();
  const t = $derived(store.t);
  let reply = $state("");
  let el = $state<HTMLElement>();

  $effect(() => {
    if (active) el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  const when = (iso: string) => {
    const d = new Date(iso);
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins} min`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)} h`;
    return d.toLocaleDateString(store.ws?.config.locale === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short" });
  };
  const target = $derived.by(() => {
    const tg = thread.target;
    if (tg.kind === "text") return { label: tg.file + (thread.line ? `:${thread.line}` : ""), quote: tg.quote };
    if (tg.kind === "step") return { label: `${tg.step}${tg.option ? ` › ${tg.option}` : ""}${tg.field ? ` › ${tg.field}` : ""}` };
    if (tg.kind === "element") return { label: `${tg.step ?? tg.file}${tg.option ? ` › ${tg.option}` : ""}`, quote: tg.label ?? tg.element };
    if (tg.kind === "prototype") return { label: tg.file, quote: tg.label };
    return { label: tg.file };
  });
  function send() {
    if (!reply.trim()) return;
    comments.reply(thread.id, reply.trim());
    reply = "";
  }
</script>

<article class="thread" class:active class:resolved={thread.status === "resolved"} bind:this={el} onclick={onfocus} onkeydown={() => {}} role="presentation">
  <header>
    <span class="where">{target.label}</span>
    {#if thread.outdated}<span class="chip warn" title={t.cm.outdated}>{t.cm.outdated}</span>{/if}
  </header>
  {#if target.quote}<blockquote>{target.quote.length > 140 ? target.quote.slice(0, 139) + "…" : target.quote}</blockquote>{/if}
  {#each thread.comments as c (c.id)}
    <div class="c" class:agent={c.agent}>
      <div class="who"><strong>{c.agent ? `${t.cm.agent}` : c.author}</strong> <span class="muted">{when(c.at)}</span></div>
      <div class="text">{@html mdInline(c.text)}</div>
    </div>
  {/each}
  {#if comments.readOnly}
    <div class="actions"><span class="muted small">{thread.status === "resolved" ? `✓ ${t.cm.resolved} · ` : ""}{t.demo.readOnly}</span></div>
  {:else if thread.status === "open"}
    <div class="reply">
      <input class="field" bind:value={reply} placeholder={t.cm.replyPlaceholder} onkeydown={(e) => e.key === "Enter" && send()} />
    </div>
    <div class="actions">
      <button class="btn small" onclick={() => comments.act({ op: "resolve", thread: thread.id, by: store.author || undefined })}>✓ {t.cm.resolve}</button>
      {#if comments.sent.has(thread.id)}
        <span class="sent">{t.cm.sentToAgent}</span>
      {:else}
        <button class="btn small ai" onclick={() => comments.toAgent(thread.id)}>{t.cm.fixWithAgent}</button>
      {/if}
    </div>
  {:else}
    <div class="actions">
      <span class="muted small">✓ {t.cm.resolved}{thread.resolvedBy ? ` · ${thread.resolvedBy}` : ""}</span>
      <button class="btn small ghost" onclick={() => comments.act({ op: "reopen", thread: thread.id })}>{t.cm.reopen}</button>
      <button class="btn small ghost" onclick={() => comments.act({ op: "delete", thread: thread.id })}>{t.cm.remove}</button>
    </div>
  {/if}
</article>

<style>
  .thread {
    display: grid;
    gap: 0.55rem;
    padding: 0.8rem 0.9rem;
    background: var(--card);
    border-radius: var(--r-card);
    box-shadow: 0 0 0 1px var(--line);
    transition: box-shadow 0.15s;
  }
  .thread.active {
    box-shadow: 0 0 0 2px var(--beacon), var(--shadow-lift);
  }
  .thread.resolved {
    opacity: 0.7;
  }
  header {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .where {
    font-family: var(--font-code);
    font-size: 0.72rem;
    color: var(--ink-3);
    overflow-wrap: anywhere;
  }
  .warn {
    background: var(--must-soft);
    color: #7a5600;
    height: 1.3rem;
    font-size: 0.7rem;
  }
  blockquote {
    margin: 0;
    padding: 0.25rem 0.55rem;
    border-left: 3px solid var(--beacon);
    background: var(--beacon-soft);
    border-radius: 0 6px 6px 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .c {
    display: grid;
    gap: 0.1rem;
  }
  .c.agent {
    padding: 0.4rem 0.55rem;
    border-radius: 8px;
    background: var(--ai-soft);
  }
  .c.agent .who strong {
    color: var(--ai);
  }
  .who {
    font-size: 0.8rem;
  }
  .text {
    font-size: 0.92rem;
    white-space: pre-wrap;
  }
  .reply .field {
    padding: 0.4rem 0.6rem;
    font-size: 0.88rem;
  }
  .actions {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .btn.ai {
    border-color: var(--ai);
    color: var(--ai);
  }
  .sent {
    font-size: 0.8rem;
    font-weight: 650;
    color: var(--ai);
  }
  .small {
    font-size: 0.8rem;
  }
</style>
