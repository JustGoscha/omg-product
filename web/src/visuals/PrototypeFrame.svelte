<script lang="ts">
  import { untrack } from "svelte";
  import { projectFileUrl } from "../lib/api";
  import { store } from "../lib/store.svelte";
  import { useComments } from "../lib/comments-context";
  import ThreadCard from "../comments/ThreadCard.svelte";
  import type { AnnotationT } from "../lib/types";

  type Pin = Pick<AnnotationT, "id" | "selector" | "x" | "y" | "kind" | "text"> & { n?: number };
  type NewAnnotation = Omit<AnnotationT, "id" | "at">;

  let {
    project,
    src,
    focus,
    height,
    compact = false,
    pins = [],
    oncomment,
    ondelete,
    author,
  }: {
    project: string;
    src: string;
    focus?: string;
    height?: number;
    compact?: boolean;
    pins?: Pin[];
    oncomment?: (a: NewAnnotation) => void;
    /** remove a meeting annotation (older pins saved in the session results) */
    ondelete?: (id: string) => void;
    author?: string;
  } = $props();

  // with the project's comments around, pins can become threads and go to the agent
  const commentsOf = useComments();
  const threads = $derived(commentsOf?.() ?? null);
  const threadPins = $derived(
    (threads?.threads ?? [])
      .filter((th) => th.status === "open" && th.target.kind === "prototype" && th.target.file.split("#")[0] === src.split("#")[0])
      .map((th, i) => {
        const tg = th.target as { selector?: string; x?: number; y?: number };
        return { id: th.id, selector: tg.selector, x: tg.x, y: tg.y, kind: "question" as const, text: th.comments[0].text, n: pins.length + i + 1 };
      }),
  );
  let sent = $state(false);
  // the pin someone clicked: a comment thread, or an older meeting annotation
  let opened = $state<string | null>(null);
  const openThread = $derived(opened ? threads?.threads.find((th) => th.id === opened) : undefined);
  const openNote = $derived(opened && !openThread ? pins.find((p) => p.id === opened) : undefined);
  async function noteToAgent(p: Pin) {
    if (!threads) return;
    await threads.addForAgent({ kind: "prototype", file: src, selector: p.selector, x: p.x, y: p.y, label: p.text.slice(0, 40) }, p.text);
    ondelete?.(p.id);
    opened = null;
    sent = true;
    setTimeout(() => (sent = false), 3000);
  }
  let frame = $state<HTMLIFrameElement>();
  let box = $state<HTMLDivElement>();
  let ready = $state(false);
  let annotating = $state(false);
  let picked = $state<{ selector: string; label: string; x: number; y: number; hash: string } | null>(null);
  let draft = $state("");
  let kind = $state<AnnotationT["kind"]>("change");
  let boxWidth = $state(800);
  // switching between states of the same prototype only changes the hash: no reload
  const base = $derived(src.split("#")[0]);
  const hash = $derived(src.includes("#") ? `#${src.split("#")[1]}` : "");
  const url = $derived.by(() => {
    const b = base;
    return projectFileUrl(project, b, true) + untrack(() => hash);
  });
  const VW = 1280;
  const VH = 800;
  const scale = $derived(compact ? boxWidth / VW : 1);

  const send = (msg: Record<string, unknown>) => frame?.contentWindow?.postMessage({ omgp: true, ...msg }, "*");

  $effect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame?.contentWindow || !e.data?.omgp) return;
      if (e.data.type === "ready") ready = true;
      if (e.data.type === "pin-click") ((opened = e.data.id), (picked = null));
      if (e.data.type === "pick") {
        picked = e.data;
        draft = "";
      }
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  });

  $effect(() => {
    if (!ready) return;
    send({ type: "focus", selector: focus ?? null, dim: !annotating });
  });
  $effect(() => {
    if (!ready) return;
    send({ type: "pins", pins: [...$state.snapshot(pins), ...$state.snapshot(threadPins)] });
  });
  $effect(() => {
    if (!ready) return;
    send({ type: "annotate", on: annotating });
  });
  $effect(() => {
    void url;
    ready = false;
  });
  $effect(() => {
    const h = hash;
    if (ready) send({ type: "hash", hash: h || "#" });
  });
  $effect(() => {
    if (!box || !compact) return;
    const ro = new ResizeObserver(() => (boxWidth = box!.clientWidth));
    ro.observe(box);
    return () => ro.disconnect();
  });

  function toAgent() {
    if (!picked || !draft.trim() || !threads) return;
    const file = picked.hash && !src.includes("#") ? `${src}${picked.hash}` : src;
    threads.addForAgent({ kind: "prototype", file, selector: picked.selector, label: picked.label, x: picked.x, y: picked.y }, draft.trim());
    picked = null;
    draft = "";
    sent = true;
    setTimeout(() => (sent = false), 3000);
  }

  function save() {
    if (!picked || !draft.trim()) return;
    if (threads) {
      // comments are threads: they show in the comments panel and can go to the agent
      const file = picked.hash && !src.includes("#") ? `${src}${picked.hash}` : src;
      threads.add({ kind: "prototype", file, selector: picked.selector, label: picked.label, x: picked.x, y: picked.y }, draft.trim());
      picked = null;
      draft = "";
      return;
    }
    oncomment?.({
      src: picked.hash && !src.includes("#") ? `${src}${picked.hash}` : src,
      selector: picked.selector,
      label: picked.label,
      x: picked.x,
      y: picked.y,
      kind,
      text: draft.trim(),
      author,
    });
    picked = null;
    draft = "";
  }
</script>

{#if compact}
  <div class="thumb" bind:this={box} style="height:{VH * scale}px">
    <iframe bind:this={frame} src={url} title={src} style="width:{VW}px;height:{VH}px;transform:scale({scale})" tabindex="-1" loading="lazy"></iframe>
  </div>
{:else}
  <div class="full">
    <div class="bar">
      <span class="src">{src}</span>
      {#if sent}<span class="sent">✦ {store.t.cm.sentToAgent}</span>{/if}
      {#if oncomment || threads}
        <button class="btn small" class:beacon={annotating} onclick={() => ((annotating = !annotating), (picked = null))}>
          {annotating ? store.t.annotating : store.t.annotate}
        </button>
      {/if}
      <a class="btn small ghost" href={projectFileUrl(project, src)} target="_blank" rel="noreferrer">↗</a>
    </div>
    <div class="stage" style="height:{height ?? 640}px">
      <iframe bind:this={frame} src={url} title={src}></iframe>
      {#if openThread}
        <div class="composer opened">
          <div class="ohead"><span class="target">{openThread.target.kind === "prototype" ? (openThread.target.label ?? "") : ""}</span><button class="btn small ghost" onclick={() => (opened = null)}>×</button></div>
          <ThreadCard thread={openThread} comments={threads!} />
        </div>
      {:else if openNote}
        <div class="composer opened">
          <div class="ohead"><span class="target">{store.t.annotationKinds[openNote.kind]}</span><button class="btn small ghost" onclick={() => (opened = null)}>×</button></div>
          <p class="note">{openNote.text}</p>
          <div class="actions">
            {#if ondelete}<button class="btn small ghost" onclick={() => (ondelete(openNote.id), (opened = null))}>{store.t.cm.remove}</button>{/if}
            {#if threads}<button class="btn small ai" onclick={() => noteToAgent(openNote)}>✦ {store.t.cm.sendToAgent}</button>{/if}
          </div>
        </div>
      {/if}
      {#if picked}
        <form class="composer" onsubmit={(e) => (e.preventDefault(), save())}>
          <div class="target">{picked.label}</div>
          <div class="kinds">
            {#each ["change", "question", "idea", "praise"] as const as k}
              <button type="button" class="chip k-{k}" class:on={kind === k} onclick={() => (kind = k)}>{store.t.annotationKinds[k]}</button>
            {/each}
          </div>
          <!-- svelte-ignore a11y_autofocus -->
          <textarea class="field" rows="3" bind:value={draft} placeholder={store.t.annotationPlaceholder} autofocus
            onkeydown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); if (e.key === "Escape") picked = null; }}></textarea>
          <div class="actions">
            <button type="button" class="btn small ghost" onclick={() => (picked = null)}>×</button>
            {#if threads}
              <button type="button" class="btn small ai" disabled={!draft.trim()} onclick={toAgent}>✦ {store.t.cm.sendToAgent}</button>
            {/if}
            <button type="submit" class="btn small primary" disabled={!draft.trim()}>OK</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .thumb {
    position: relative;
    overflow: hidden;
    border-radius: var(--r-small);
    background: #fff;
  }
  .thumb iframe {
    position: absolute;
    left: 0;
    top: 0;
    border: 0;
    transform-origin: 0 0;
    pointer-events: none;
  }
  .full {
    border: 1.5px solid var(--line);
    border-radius: var(--r-card);
    overflow: hidden;
    background: #fff;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.5rem 0.4rem 0.9rem;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
  }
  .src {
    flex: 1;
    font-family: var(--font-code);
    font-size: 0.78rem;
    color: var(--ink-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .stage {
    position: relative;
  }
  .stage iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
  .composer {
    position: absolute;
    top: 12px;
    right: 12px;
    width: min(340px, calc(100% - 24px));
    background: var(--card);
    border-radius: var(--r-card);
    box-shadow: 0 18px 40px -18px rgba(27, 36, 48, 0.55), 0 0 0 1px var(--line);
    padding: 0.8rem;
    display: grid;
    gap: 0.55rem;
    animation: pop 0.18s var(--ease);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
    }
  }
  .target {
    font-size: 0.8rem;
    color: var(--ink-3);
  }
  .kinds {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .kinds .chip {
    border: 1.5px solid transparent;
  }
  .kinds .chip.on {
    border-color: var(--ink);
    background: var(--card);
    color: var(--ink);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }
  .btn.ai {
    border-color: var(--ai);
    color: var(--ai);
  }
  .opened {
    max-height: calc(100% - 24px);
    overflow: auto;
  }
  .ohead {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .note {
    margin: 0;
    white-space: pre-wrap;
  }
  .sent {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--ai);
  }
</style>
