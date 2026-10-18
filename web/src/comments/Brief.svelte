<script lang="ts">
  // A markdown document you can comment on (per paragraph, per list item, or on
  // selected words) and edit section by section. Used for briefs and handoffs.
  import { marked, type Token, type Tokens } from "marked";
  import { md } from "../lib/md";
  import { api, ApiError } from "../lib/api";
  import { store } from "../lib/store.svelte";
  import { stripMd } from "../../../src/core/comment-ops";
  import MarkdownEditor from "./MarkdownEditor.svelte";
  import type { AnchoredThread, CommentTargetT } from "../lib/types";
  import type { Comments } from "../lib/comments.svelte";

  let {
    scope,
    file,
    body,
    comments,
    recommend = [],
    editable = true,
    activeThread = null,
    ondraft,
    onopen,
  }: {
    scope: string;
    file: string;
    body: string;
    comments: Comments;
    recommend?: string[];
    editable?: boolean;
    activeThread?: string | null;
    ondraft: (target: CommentTargetT, quote: string) => void;
    onopen: (threadId: string) => void;
  } = $props();

  const t = $derived(store.t);
  const flat = (s: string) => stripMd(s).replace(/\s+/g, " ").trim();

  interface Block {
    idx: number;
    raw: string; // markdown of this block, as it is in the file
    html: string;
    kind: "p" | "li" | "h" | "other";
    ordered?: boolean;
  }
  interface Section {
    heading: string | null; // null = text before the first ## heading
    raw: string; // content under the heading, as in the file
    blocks: Block[];
  }

  const sections = $derived.by(() => {
    const tokens = marked.lexer(body ?? "");
    const out: Section[] = [{ heading: null, raw: "", blocks: [] }];
    let idx = 0;
    for (const tok of tokens as Token[]) {
      if (tok.type === "heading" && (tok as Tokens.Heading).depth === 2) {
        out.push({ heading: (tok as Tokens.Heading).text, raw: "", blocks: [] });
        continue;
      }
      const sec = out[out.length - 1];
      sec.raw += tok.raw;
      if (tok.type === "space") continue;
      if (tok.type === "list") {
        const list = tok as Tokens.List;
        for (const item of list.items) {
          const content = item.raw.replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/, "");
          sec.blocks.push({ idx: idx++, raw: item.raw.trim(), html: md(content).replace(/^<p>([\s\S]*)<\/p>\s*$/, "$1"), kind: "li", ordered: list.ordered });
        }
      } else
        sec.blocks.push({ idx: idx++, raw: tok.raw.trim(), html: md(tok.raw), kind: tok.type === "paragraph" ? "p" : tok.type === "heading" ? "h" : "other" });
    }
    for (const s of out) s.raw = s.raw.trim();
    return out.filter((s, i) => i > 0 || s.blocks.length);
  });
  const missing = $derived(recommend.filter((h) => !sections.some((s) => s.heading?.toLowerCase().startsWith(h.toLowerCase()))));

  // threads on this file, matched to the block that contains their quote
  const mine = $derived(comments.threads.filter((th) => th.target.kind === "text" && th.target.file === file && th.status === "open"));
  const byBlock = $derived.by(() => {
    const map = new Map<number, AnchoredThread[]>();
    const lost: AnchoredThread[] = [];
    const all = sections.flatMap((s) => s.blocks);
    for (const th of mine) {
      const q = flat((th.target as { quote: string }).quote);
      const b = all.find((b) => flat(b.raw).includes(q)) ?? all.find((b) => q.includes(flat(b.raw)) && flat(b.raw).length > 12);
      if (!b) lost.push(th);
      else map.set(b.idx, [...(map.get(b.idx) ?? []), th]);
    }
    return { map, lost };
  });

  // ---------- commenting on selected words ----------
  let doc = $state<HTMLElement>();
  let pick = $state<{ x: number; y: number; quote: string; block: Block; section: string | null } | null>(null);
  function onSelect() {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !doc) return (pick = null);
    const text = sel.toString().replace(/\s+/g, " ").trim();
    const a = (sel.anchorNode?.parentElement ?? null)?.closest("[data-block]");
    const f = (sel.focusNode?.parentElement ?? null)?.closest("[data-block]");
    if (!a || a !== f || text.length < 2 || !doc.contains(a)) return (pick = null);
    const idx = Number(a.getAttribute("data-block"));
    const sec = sections.find((s) => s.blocks.some((b) => b.idx === idx))!;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const box = doc.getBoundingClientRect();
    pick = { x: r.left - box.left + r.width / 2, y: r.top - box.top, quote: text, block: sec.blocks.find((b) => b.idx === idx)!, section: sec.heading };
  }
  const target = (quote: string, section: string | null): CommentTargetT => ({ kind: "text", file, quote, ...(section ? { section } : {}) });

  // highlight selected-word comments inside their block
  $effect(() => {
    void sections;
    const threads = mine;
    if (!doc) return;
    for (const m of doc.querySelectorAll("mark.cq")) m.replaceWith(...m.childNodes);
    for (const th of threads) {
      const q = (th.target as { quote: string }).quote.replace(/\s+/g, " ").trim();
      if (q.length > 120) continue;
      for (const el of doc.querySelectorAll<HTMLElement>("[data-block] .content")) {
        if (!flat(el.textContent ?? "").includes(flat(q)) || flat(el.textContent ?? "") === flat(q)) continue;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
          const i = n.data.indexOf(q);
          if (i < 0) continue;
          const range = document.createRange();
          range.setStart(n, i);
          range.setEnd(n, i + q.length);
          const mark = document.createElement("mark");
          mark.className = "cq";
          mark.dataset.thread = th.id;
          range.surroundContents(mark);
          break;
        }
      }
    }
  });

  // ---------- editing ----------
  let editing = $state<{ heading: string | null; original: string; isNew?: boolean } | null>(null);
  let all = $state<{ original: string } | null>(null);

  function startEdit(sec: Section) {
    if (!editable) return;
    all = null;
    editing = { heading: sec.heading, original: sec.raw };
  }
  const conflict = (e: unknown) => {
    throw new Error(e instanceof ApiError && e.conflict ? t.cm.conflict : (e as Error).message);
  };
  async function saveSection(md: string) {
    const ed = editing!;
    try {
      if (ed.heading === null) await api.editText(scope, { file, content: rebuildPreamble(md), expect: body });
      else await api.editText(scope, { file, heading: ed.heading, content: md, expect: ed.isNew ? undefined : ed.original });
      editing = null;
    } catch (e) {
      conflict(e);
    }
  }
  async function saveAll(md: string) {
    try {
      await api.editText(scope, { file, content: md, expect: all!.original });
      all = null;
    } catch (e) {
      conflict(e);
    }
  }
  // the text before the first heading is saved by replacing the whole body
  function rebuildPreamble(draft: string) {
    const rest = sections.filter((s) => s.heading !== null).map((s) => `## ${s.heading}\n${s.raw}`).join("\n\n");
    return `${draft.trim()}\n\n${rest}`.trim();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="brief" bind:this={doc} onmouseup={onSelect} onkeyup={onSelect}
  onclick={(e) => {
    const m = (e.target as HTMLElement).closest("mark.cq") as HTMLElement | null;
    if (m?.dataset.thread) onopen(m.dataset.thread);
  }}>
  {#if editable}
    <div class="topbar">
      {#if byBlock.lost.length}
        <button class="chip warn" onclick={() => onopen(byBlock.lost[0].id)}>{byBlock.lost.length} × {t.cm.outdated}</button>
      {/if}
      <span class="grow"></span>
      {#if !all}
        <button class="btn small ghost" onclick={() => ((editing = null), (all = { original: body }))}>✎ {t.cm.editAll}</button>
      {/if}
    </div>
  {/if}

  {#if all}
    <MarkdownEditor value={all.original} onsave={saveAll} oncancel={() => (all = null)} />
  {:else}
    {#each sections as sec (sec.heading ?? "__pre")}
      <section class:editing={editing && editing.heading === sec.heading}>
        {#if sec.heading !== null}
          <div class="h2row">
            <h2>{sec.heading}</h2>
            {#if editable && !(editing && editing.heading === sec.heading)}
              <button class="edit" onclick={() => startEdit(sec)} title={t.cm.edit}>✎</button>
            {/if}
          </div>
        {/if}
        {#if editing && editing.heading === sec.heading}
          <div class="editor"><MarkdownEditor value={editing.original} onsave={saveSection} oncancel={() => (editing = null)} /></div>
        {:else}
          {#each sec.blocks as b (b.idx)}
            {@const threads = byBlock.map.get(b.idx) ?? []}
            <div class="block k-{b.kind}" class:ol={b.ordered} class:has={threads.length} class:active={threads.some((x) => x.id === activeThread)} data-block={b.idx}
              ondblclick={() => startEdit(sec)} role="presentation">
              <div class="content md">{@html b.html}</div>
              <div class="gutter">
                {#if threads.length}
                  <button class="bubble on" onclick={() => onopen(threads[0].id)} title={threads.map((x) => x.comments[0].text).join("\n")}>{threads.length}</button>
                {:else}
                  <button class="bubble" onclick={() => ondraft(target(b.raw.replace(/^\s*([-*+]|\d+[.)])\s+/, ""), sec.heading), b.raw)} title={t.cm.comment}>+</button>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </section>
    {/each}
    {#if editable && missing.length}
      <div class="missing">
        {#each missing as h}
          <button class="btn small ghost" onclick={() => ((all = null), (editing = { heading: h, original: "", isNew: true }))}>+ {h}</button>
        {/each}
      </div>
      {#if editing?.isNew}
        <section class="editing">
          <h2>{editing.heading}</h2>
          <div class="editor"><MarkdownEditor value="" onsave={saveSection} oncancel={() => (editing = null)} /></div>
        </section>
      {/if}
    {/if}
  {/if}

  {#if pick}
    <button class="pick" style="left:{pick.x}px;top:{pick.y}px" onmousedown={(e) => e.preventDefault()}
      onclick={() => (ondraft(target(pick!.quote, pick!.section), pick!.quote), (pick = null), getSelection()?.removeAllRanges())}>
      💬 {t.cm.comment}
    </button>
  {/if}
</div>



<style>
  .brief {
    position: relative;
    font-size: 1.06rem;
    max-width: 46rem;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .grow {
    flex: 1;
  }
  .warn {
    background: var(--must-soft);
    color: #7a5600;
    border: 0;
  }
  section {
    margin-bottom: 1.4rem;
  }
  .h2row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin: 1.6rem 0 0.5rem;
  }
  section:first-child .h2row {
    margin-top: 0;
  }
  h2 {
    font-size: 1.45rem;
  }
  .edit {
    border: 0;
    background: transparent;
    color: var(--ink-3);
    font-size: 1rem;
    opacity: 0;
    padding: 0.1rem 0.4rem;
    border-radius: 6px;
    transition: opacity 0.15s;
  }
  section:hover .edit,
  .edit:focus-visible {
    opacity: 1;
  }
  .edit:hover {
    background: var(--paper-2);
    color: var(--ink);
  }
  .block {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 2.2rem;
    margin-right: -2.6rem;
    border-radius: 6px;
  }
  .block .content {
    padding: 0.15rem 0.35rem;
    margin-left: -0.35rem;
    border-radius: 6px;
    transition: background 0.15s;
  }
  .block:hover .content {
    background: rgba(27, 36, 48, 0.04);
  }
  .block.has .content {
    background: var(--beacon-soft);
  }
  .block.active .content {
    box-shadow: inset 3px 0 0 var(--beacon);
  }
  .k-li .content {
    padding-left: 1.4rem;
    position: relative;
  }
  .k-li .content::before {
    content: "•";
    position: absolute;
    left: 0.45rem;
    color: var(--ink-3);
  }
  .k-li + .k-li {
    margin-top: 0.1rem;
  }
  .k-p + .k-p,
  .k-li + .k-p,
  .k-p + .k-li,
  .k-other {
    margin-top: 0.55rem;
  }
  .k-h :global(h3) {
    font-size: 1.12rem;
    margin: 0.9rem 0 0.2rem;
  }
  .gutter {
    display: flex;
    justify-content: center;
    padding-top: 0.15rem;
  }
  .bubble {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50% 50% 50% 4px;
    border: 1.5px solid var(--line);
    background: var(--card);
    color: var(--ink-3);
    font-size: 0.85rem;
    font-weight: 800;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .block:hover .bubble,
  .bubble:focus-visible,
  .bubble.on {
    opacity: 1;
  }
  .bubble.on {
    background: var(--beacon);
    border-color: var(--beacon);
    color: var(--ink);
  }
  .content :global(mark.cq) {
    background: var(--beacon);
    border-radius: 3px;
    padding: 0 0.1em;
    cursor: pointer;
  }
  .editor {
    display: grid;
    gap: 0.5rem;
    margin: 0.3rem 0 0.8rem;
  }
  .missing {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 1rem;
    padding-top: 0.8rem;
    border-top: 1px dashed var(--line);
  }
  .missing .btn {
    border: 1.5px dashed var(--fog);
    color: var(--ink-3);
  }
  .pick {
    position: absolute;
    transform: translate(-50%, calc(-100% - 8px));
    z-index: 10;
    border: 0;
    background: var(--ink);
    color: #fff;
    font-weight: 700;
    font-size: 0.82rem;
    padding: 0.35rem 0.7rem;
    border-radius: 8px;
    box-shadow: 0 8px 20px -8px rgba(27, 36, 48, 0.6);
    white-space: nowrap;
  }
</style>
