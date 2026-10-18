<script lang="ts">
  // A markdown file you just edit: click and type, it saves itself. Comments sit in
  // the margin (per paragraph or list item), on selected words, and as highlights.
  import { onMount, untrack } from "svelte";
  import { api, ApiError } from "../lib/api";
  import { store } from "../lib/store.svelte";
  import { unwrap } from "../lib/unwrap";
  import { stripMd } from "../../../src/core/comment-ops";
  import type { AnchoredThread, CommentTargetT } from "../lib/types";
  import type { Comments } from "../lib/comments.svelte";

  let {
    scope,
    file,
    body,
    comments,
    recommend = [],
    activeThread = null,
    readonly = false,
    ondraft,
    onopen,
  }: {
    scope: string;
    file: string;
    body: string;
    comments: Comments;
    recommend?: string[];
    activeThread?: string | null;
    /** show the text and its threads, nothing to edit or comment (static demo) */
    readonly?: boolean;
    ondraft: (target: CommentTargetT, quote: string) => void;
    onopen: (threadId: string) => void;
  } = $props();

  const t = $derived(store.t);
  const flat = (s: string) => stripMd(s).replace(/\s+/g, " ").trim();
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();

  // ---------- the editor ----------
  type Editor = { getMarkdown(): string; destroy(): Promise<unknown>; editor: { action(fn: unknown): unknown } };
  let wrap = $state<HTMLDivElement>();
  let root = $state<HTMLDivElement>();
  let crepe: Editor | null = null;
  let replaceAll: ((md: string, flush?: boolean) => unknown) | null = null;
  let ready = $state(false);
  let status = $state<"saved" | "dirty" | "saving" | "conflict" | "error">("saved");
  let error = $state("");
  let lastSaved = untrack(() => body ?? ""); // the file's body as we last saw or wrote it
  let pending: string | null = null; // what we are writing right now
  let applying = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Saving needs a real edit: opening the page must never rewrite the file
  let touched = false;
  // Milkdown writes markdown its own way; unchanged sections keep the file's text
  let baseline = ""; // the editor's serialization of what is in the file
  let original = untrack(() => body ?? ""); // the file's own text for that baseline

  /** `## Heading` sections, keyed by heading (with a counter for repeats); "" is the text before the first heading */
  function sections(md: string) {
    const out: { key: string; head: string; text: string }[] = [{ key: "", head: "", text: "" }];
    const seen = new Map<string, number>();
    for (const line of md.split("\n")) {
      const m = line.match(/^##\s+(.*)$/);
      if (m) {
        const n = (seen.get(m[1]) ?? 0) + 1;
        seen.set(m[1], n);
        out.push({ key: `${m[1]}#${n}`, head: line, text: "" });
      } else out[out.length - 1].text += `${line}\n`;
    }
    return out;
  }
  /** the new document, with every section the user didn't touch taken verbatim from the file */
  function merge(md: string) {
    const base = new Map(sections(baseline).map((s) => [s.key, s.text.trim()]));
    const orig = new Map(sections(original).map((s) => [s.key, s.text]));
    return sections(md)
      .map((s) => {
        const keep = base.get(s.key) === s.text.trim() && orig.has(s.key);
        const text = keep ? orig.get(s.key)! : s.text;
        return s.head ? `${s.head}\n${text.replace(/^\n+/, "\n").replace(/\s+$/, "")}` : text.replace(/\s+$/, "");
      })
      .filter((x, i) => i > 0 || x.trim())
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  onMount(() => {
    let gone = false;
    (async () => {
      const [{ Crepe }, core, utils] = await Promise.all([
        import("@milkdown/crepe"),
        import("@milkdown/kit/core"),
        import("@milkdown/kit/utils"),
        import("@milkdown/crepe/theme/common/style.css"),
        import("@milkdown/crepe/theme/frame.css"),
      ]);
      if (gone || !root) return;
      replaceAll = utils.replaceAll as never;
      const c = new Crepe({
        root,
        defaultValue: unwrap(body ?? ""),
        features: {
          [Crepe.Feature.CodeMirror]: false,
          [Crepe.Feature.ImageBlock]: false,
          [Crepe.Feature.Latex]: false,
          [Crepe.Feature.AI]: false,
          [Crepe.Feature.TopBar]: false,
        },
        featureConfigs: { [Crepe.Feature.Placeholder]: { text: t.cm.placeholder, mode: "doc" } },
      });
      if (readonly) c.setReadonly(true);
      // write lists the way the files have them
      c.editor.config((ctx) => ctx.update(core.remarkStringifyOptionsCtx, (prev) => ({ ...prev, bullet: "-" as const, listItemIndent: "one" as const })));
      c.on((l) =>
        l.markdownUpdated((_ctx, md) => {
          measure();
          if (applying || !touched) return;
          if (norm(md) === norm(baseline)) return;
          status = "dirty";
          clearTimeout(timer);
          timer = setTimeout(save, 1000);
        }),
      );
      await c.create();
      if (gone) return void c.destroy();
      crepe = c as unknown as Editor;
      baseline = crepe.getMarkdown().replace(/\s+$/, "");
      ready = true;
      measure();
    })();
    const ro = new ResizeObserver(() => measure());
    if (wrap) ro.observe(wrap);
    return () => {
      gone = true;
      ro.disconnect();
      clearTimeout(timer);
      if (status === "dirty" && touched) save();
      crepe?.destroy();
    };
  });

  async function save(overwrite = false) {
    if (!crepe || readonly || (!touched && !overwrite)) return;
    clearTimeout(timer);
    const md = crepe.getMarkdown().replace(/\s+$/, "");
    if (!overwrite && norm(md) === norm(baseline)) return void (status = "saved");
    const content = merge(md);
    status = "saving";
    pending = content;
    try {
      await api.editText(scope, { file, content, expect: lastSaved });
      lastSaved = content;
      original = content;
      baseline = md;
      status = "saved";
    } catch (e) {
      if (e instanceof ApiError && e.conflict) status = "conflict";
      else ((status = "error"), (error = (e as Error).message));
    } finally {
      pending = null;
    }
  }

  function load(md: string) {
    if (!crepe || !replaceAll) return;
    applying = true;
    crepe.editor.action(replaceAll(unwrap(md), true));
    applying = false;
    lastSaved = md;
    original = md;
    baseline = crepe.getMarkdown().replace(/\s+$/, "");
    touched = false;
    status = "saved";
    measure();
  }

  // someone else changed the file (an agent, another tab)
  $effect(() => {
    const next = body ?? "";
    if (!ready || norm(next) === norm(lastSaved) || (pending && norm(next) === norm(pending))) return;
    if (status === "saved") load(next);
    else status = "conflict";
  });

  function addSection(h: string) {
    if (!crepe || !replaceAll) return;
    touched = true;
    const md = `${crepe.getMarkdown().replace(/\s+$/, "")}\n\n## ${h}\n\n…`;
    applying = true;
    crepe.editor.action(replaceAll(md, true));
    applying = false;
    save();
  }
  const missing = $derived(readonly ? [] : recommend.filter((h) => !new RegExp(`^##\\s+${h}`, "mi").test(body ?? "")));

  // ---------- comments in the margin ----------
  interface Block {
    el: HTMLElement;
    top: number;
    height: number;
    text: string;
  }
  let blocks = $state<Block[]>([]);
  let hover = $state(-1);
  function measure() {
    requestAnimationFrame(() => {
      const pm = root?.querySelector<HTMLElement>(".ProseMirror");
      if (!pm || !wrap) return;
      const box = wrap.getBoundingClientRect();
      const out: Block[] = [];
      for (const el of Array.from(pm.children) as HTMLElement[]) {
        const items = /^(UL|OL)$/.test(el.tagName) ? (Array.from(el.querySelectorAll(":scope > li")) as HTMLElement[]) : [el];
        for (const it of items) {
          const r = it.getBoundingClientRect();
          if (!r.height) continue;
          out.push({ el: it, top: r.top - box.top, height: r.height, text: it.innerText.trim() });
        }
      }
      blocks = out;
      paint();
    });
  }
  const mine = $derived(comments.threads.filter((th) => th.target.kind === "text" && th.target.file === file && th.status === "open"));
  const byBlock = $derived.by(() => {
    const map = new Map<number, AnchoredThread[]>();
    blocks.forEach((b, i) => {
      const tb = flat(b.text);
      const ths = mine.filter((th) => {
        const q = flat((th.target as { quote: string }).quote);
        return q && (tb.includes(q) || (q.includes(tb) && tb.length > 12));
      });
      if (ths.length) map.set(i, ths);
    });
    return map;
  });
  const lost = $derived(mine.filter((th) => ![...byBlock.values()].some((ths) => ths.includes(th))));

  // highlights without touching the editor's DOM (CSS Custom Highlight API)
  const ranges = new Map<string, Range[]>();
  function paint() {
    const H = (globalThis as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    ranges.clear();
    blocks.forEach((b, i) => {
      for (const th of byBlock.get(i) ?? []) {
        const q = (th.target as { quote: string }).quote.replace(/\s+/g, " ").trim();
        const found: Range[] = [];
        const walker = document.createTreeWalker(b.el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
          const at = n.data.indexOf(q);
          if (at < 0) continue;
          const r = document.createRange();
          r.setStart(n, at);
          r.setEnd(n, at + q.length);
          found.push(r);
          break;
        }
        if (!found.length) {
          const r = document.createRange();
          r.selectNodeContents(b.el);
          found.push(r);
        }
        ranges.set(th.id, found);
      }
    });
    if (!H || !reg) return;
    const all = [...ranges.entries()];
    reg.set("omgp-comment", new H(...all.filter(([id]) => id !== activeThread).flatMap(([, r]) => r)));
    reg.set("omgp-comment-active", new H(...(ranges.get(activeThread ?? "") ?? [])));
  }
  $effect(() => {
    void byBlock;
    void activeThread;
    paint();
  });
  $effect(() => {
    if (!activeThread) return;
    const r = ranges.get(activeThread)?.[0];
    r?.startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  function onClick(e: MouseEvent) {
    for (const [id, rs] of ranges)
      for (const r of rs)
        for (const rect of Array.from(r.getClientRects()))
          if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            if (window.getSelection()?.isCollapsed) onopen(id);
            return;
          }
  }

  // commenting on selected words
  let pick = $state<{ x: number; y: number; quote: string; section?: string } | null>(null);
  function onSelect() {
    if (readonly) return;
    const sel = getSelection();
    const pm = root?.querySelector(".ProseMirror");
    if (!sel || sel.isCollapsed || !pm || !wrap || !pm.contains(sel.anchorNode)) return (pick = null);
    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (text.length < 2) return (pick = null);
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const box = wrap.getBoundingClientRect();
    pick = { x: r.left - box.left + r.width / 2, y: r.bottom - box.top + 10, quote: text, section: sectionAt(sel.anchorNode) };
  }
  function sectionAt(node: Node | null) {
    let el = node instanceof HTMLElement ? node : node?.parentElement;
    while (el && el.parentElement && !el.parentElement.classList.contains("ProseMirror")) el = el.parentElement;
    for (let p = el as Element | null; p; p = p.previousElementSibling) if (p.tagName === "H2") return p.textContent ?? undefined;
    return undefined;
  }
  const target = (quote: string, section?: string): CommentTargetT => ({ kind: "text", file, quote, ...(section ? { section } : {}) });
  function blockAt(e: MouseEvent) {
    if (!wrap) return;
    const y = e.clientY - wrap.getBoundingClientRect().top;
    hover = blocks.findIndex((b) => y >= b.top - 4 && y <= b.top + b.height + 4);
  }
</script>

<div class="doc">
  <div class="status">
    {#if lost.length}<button class="chip warn" onclick={() => onopen(lost[0].id)}>{lost.length} × {t.cm.outdated}</button>{/if}
    <span class="grow"></span>
    {#if status === "saving"}<span class="muted">{t.cm.saving}</span>
    {:else if status === "dirty"}<span class="muted">…</span>
    {:else if status === "saved" && ready && !readonly}<span class="ok">✓ {t.cm.savedState}</span>
    {:else if status === "error"}<span class="err">{error}</span>{/if}
  </div>
  {#if status === "conflict"}
    <div class="conflict">
      <span>{t.cm.changedElsewhere}</span>
      <button class="btn small" onclick={() => load(body)}>{t.cm.takeTheirs}</button>
      <button class="btn small primary" onclick={() => ((lastSaved = body), save(true))}>{t.cm.keepMine}</button>
    </div>
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="wrap" bind:this={wrap} onmousemove={blockAt} onmouseleave={() => (hover = -1)} onmouseup={onSelect} onkeyup={onSelect} onclick={onClick}
    onbeforeinput={() => (touched = true)} oninput={() => (touched = true)} onpaste={() => (touched = true)} oncut={() => (touched = true)} ondrop={() => (touched = true)}
    onkeydown={(e) => {
      if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace" || e.key === "Delete" || e.key === "Tab") touched = true;
    }}>
    <div class="surface" class:loading={!ready} bind:this={root}></div>
    <div class="margin">
      {#each blocks as b, i (i)}
        {@const ths = byBlock.get(i) ?? []}
        {#if ths.length}
          <button class="bubble on" style="top:{b.top}px" onclick={() => onopen(ths[0].id)} title={ths.map((x) => x.comments[0].text).join("\n")}>{ths.length}</button>
        {:else if hover === i && !readonly}
          <button class="bubble" style="top:{b.top}px" onclick={() => ondraft(target(b.text, sectionAt(b.el)), b.text)} title={t.cm.comment}>+</button>
        {/if}
      {/each}
    </div>
    {#if pick}
      <button class="pick" style="left:{pick.x}px;top:{pick.y}px" onmousedown={(e) => e.preventDefault()}
        onclick={() => (ondraft(target(pick!.quote, pick!.section), pick!.quote), (pick = null))}>💬 {t.cm.comment}</button>
    {/if}
  </div>

  {#if missing.length}
    <div class="missing">
      {#each missing as h}<button class="btn small ghost" onclick={() => addSection(h)}>+ {h}</button>{/each}
    </div>
  {/if}
</div>

<style>
  .doc {
    max-width: 48rem;
    display: grid;
    gap: 0.4rem;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.4rem;
    font-size: 0.8rem;
  }
  .grow {
    flex: 1;
  }
  .ok {
    color: var(--should);
    font-weight: 650;
  }
  .err {
    color: var(--block);
    font-weight: 650;
  }
  .warn {
    background: var(--must-soft);
    color: #7a5600;
    border: 0;
  }
  .conflict {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.6rem 0.8rem;
    border-radius: var(--r-card);
    background: var(--must-soft);
    font-weight: 650;
  }
  .wrap {
    position: relative;
    padding-right: 2.6rem;
  }
  .surface.loading {
    min-height: 20rem;
    border-radius: 10px;
    background: linear-gradient(90deg, transparent, var(--paper-2), transparent);
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  /* the document looks like the page, not like a form field */
  .surface :global(.milkdown) {
    --crepe-color-background: transparent;
    --crepe-color-on-background: var(--ink);
    --crepe-color-surface: var(--paper);
    --crepe-color-surface-low: var(--paper-2);
    --crepe-color-on-surface: var(--ink);
    --crepe-color-on-surface-variant: var(--ink-2);
    --crepe-color-outline: var(--fog);
    --crepe-color-primary: var(--ink);
    --crepe-color-secondary: var(--beacon-soft);
    --crepe-color-hover: var(--paper-2);
    --crepe-color-selected: var(--beacon-soft);
    --crepe-font-default: var(--font-ui);
    --crepe-font-title: var(--font-display);
    --crepe-font-code: var(--font-code);
    background: transparent;
  }
  .surface :global(.milkdown .ProseMirror) {
    padding: 0 0 0 0;
    font-size: 1.06rem;
    line-height: 1.6;
    outline: none;
  }
  .surface :global(.milkdown .ProseMirror h2) {
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 650;
    margin: 1.6rem 0 0.5rem;
  }
  .surface :global(.milkdown .ProseMirror h2:first-child) {
    margin-top: 0;
  }
  .surface :global(.milkdown .ProseMirror h3) {
    font-family: var(--font-display);
    font-size: 1.12rem;
    margin: 1.1rem 0 0.3rem;
  }
  .surface :global(.milkdown .ProseMirror p) {
    margin: 0.35rem 0;
  }
  .margin {
    position: absolute;
    top: 0;
    right: 0;
    width: 2.2rem;
    height: 100%;
  }
  .bubble {
    position: absolute;
    right: 0.3rem;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50% 50% 50% 4px;
    border: 1.5px solid var(--line);
    background: var(--card);
    color: var(--ink-3);
    font-size: 0.85rem;
    font-weight: 800;
  }
  .bubble.on {
    background: var(--beacon);
    border-color: var(--beacon);
    color: var(--ink);
  }
  .pick {
    position: absolute;
    transform: translateX(-50%);
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
  .missing {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px dashed var(--line);
  }
  .missing .btn {
    border: 1.5px dashed var(--fog);
    color: var(--ink-3);
  }
</style>
