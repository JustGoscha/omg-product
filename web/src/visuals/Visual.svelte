<script lang="ts">
  import type { AnnotationT, VisualT } from "../lib/types";
  import { diffVisual } from "../lib/diff";
  import { md } from "../lib/md";
  import { projectFileUrl } from "../lib/api";
  import StatesDiagram from "./StatesDiagram.svelte";
  import FlowDiagram from "./FlowDiagram.svelte";
  import TablesDiagram from "./TablesDiagram.svelte";
  import SequenceDiagram from "./SequenceDiagram.svelte";
  import MatrixTable from "./MatrixTable.svelte";
  import MermaidView from "./MermaidView.svelte";
  import PrototypeFrame from "./PrototypeFrame.svelte";
  import { store } from "../lib/store.svelte";

  type NewAnnotation = Omit<AnnotationT, "id" | "at">;

  let {
    visual,
    project,
    base,
    compact = false,
    annotations = [],
    oncomment,
    ondelete,
    author,
    highlight,
    caption = true,
    onelement,
    marked,
  }: {
    visual: VisualT;
    project: string;
    base?: VisualT;
    compact?: boolean;
    annotations?: AnnotationT[];
    oncomment?: (a: NewAnnotation) => void;
    ondelete?: (id: string) => void;
    author?: string;
    highlight?: string;
    caption?: boolean;
    /** click on a diagram part (state, column, node, cell…) to comment on it */
    onelement?: (element: string, label: string) => void;
    /** diagram parts that already have open comments, by element key */
    marked?: Set<string>;
  } = $props();

  let fig = $state<HTMLElement>();

  // scenario: walk through the diagram step by step
  type StoryStep = { at: string; text: string };
  const story = $derived(!compact && "story" in visual ? ((visual as { story?: StoryStep[] }).story ?? []) : []);
  const prefix: Record<string, string> = { states: "state:", flow: "node:", sequence: "message:", tables: "table:" };
  const keyOf = (at: string) => (at.includes(":") ? at : `${prefix[visual.type] ?? ""}${at}`);
  let storyAt = $state(-1);
  let playing = $state(false);
  $effect(() => {
    void visual;
    storyAt = -1;
    playing = false;
  });
  $effect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (storyAt >= story.length - 1) playing = false;
      else storyAt++;
    }, 2600);
    return () => clearInterval(timer);
  });
  $effect(() => {
    const i = storyAt;
    if (!fig) return;
    const on = new Set<string>();
    if (i >= 0 && story[i]) {
      on.add(keyOf(story[i].at));
      const prev = story[i - 1];
      if (prev && visual.type === "states") on.add(`transition:${prev.at}>${story[i].at}`);
      if (prev && visual.type === "flow") on.add(`edge:${prev.at}>${story[i].at}`);
    }
    requestAnimationFrame(() => {
      fig!.classList.toggle("storying", i >= 0);
      for (const el of fig!.querySelectorAll("[data-el]")) el.classList.toggle("story-on", on.has(el.getAttribute("data-el")!));
    });
  });
  function pick(e: MouseEvent) {
    if (!onelement) return;
    const el = (e.target as Element).closest("[data-el]");
    if (!el || !fig?.contains(el)) return;
    e.stopPropagation();
    onelement(el.getAttribute("data-el")!, el.getAttribute("data-label") ?? el.getAttribute("data-el")!);
  }
  $effect(() => {
    void visual;
    void base;
    const keys = marked;
    if (!fig) return;
    requestAnimationFrame(() => {
      for (const el of fig!.querySelectorAll("[data-el]")) el.classList.toggle("marked", !!keys?.has(el.getAttribute("data-el")!));
    });
  });

  // structured visuals always render through the diff shape; without a base nothing is marked
  const shown = $derived(base && base.type === visual.type ? diffVisual(base, visual) : visual) as any;
  const pins = $derived(
    visual.type === "prototype"
      ? annotations
          .map((a, i) => ({ ...a, n: i + 1 }))
          .filter((a) => a.src.split("#")[0] === visual.src.split("#")[0])
      : [],
  );
</script>

{#if story.length}
  <div class="story">
    {#if storyAt < 0}
      <button class="btn small beacon" onclick={() => ((storyAt = 0), (playing = true))}>▶ {store.t.playStory}</button>
      <span class="muted">{story.length} {story.length === 1 ? "step" : "steps"}</span>
    {:else}
      <button class="btn small ghost" onclick={() => ((playing = false), (storyAt = Math.max(0, storyAt - 1)))} aria-label="previous">‹</button>
      <span class="count">{storyAt + 1}/{story.length}</span>
      <button class="btn small ghost" onclick={() => ((playing = false), (storyAt = Math.min(story.length - 1, storyAt + 1)))} aria-label="next">›</button>
      <p class="cap">{story[storyAt].text}</p>
      <button class="btn small ghost" onclick={() => (playing = !playing)}>{playing ? "❚❚" : "▶"}</button>
      <button class="btn small ghost" onclick={() => ((storyAt = -1), (playing = false))}>×</button>
    {/if}
  </div>
{/if}
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<figure class="visual" class:compact class:pickable={!!onelement && !compact} class:scroll={!compact && ["states", "flow", "tables", "sequence"].includes(visual.type)} bind:this={fig} onclick={pick}>
  {#if visual.type === "states"}
    <StatesDiagram visual={shown} {compact} />
  {:else if visual.type === "flow"}
    <FlowDiagram visual={shown} {compact} />
  {:else if visual.type === "tables"}
    <TablesDiagram visual={shown} {compact} />
  {:else if visual.type === "sequence"}
    <SequenceDiagram visual={shown} {compact} />
  {:else if visual.type === "matrix"}
    <MatrixTable visual={shown} {highlight} {compact} />
  {:else if visual.type === "mermaid"}
    <MermaidView code={visual.code} />
  {:else if visual.type === "prototype"}
    <PrototypeFrame {project} src={visual.src} focus={visual.focus} height={visual.height} {compact} {pins} {oncomment} {ondelete} {author} />
  {:else if visual.type === "image"}
    <img src={projectFileUrl(project, visual.src)} alt={visual.alt ?? visual.caption ?? ""} />
  {:else if visual.type === "html"}
    <iframe class="html" sandbox="allow-scripts" srcdoc={visual.html} title={visual.caption ?? "visual"} style="height:{visual.height ?? (compact ? 220 : 380)}px"></iframe>
  {:else if visual.type === "markdown"}
    <div class="md">{@html md(visual.text)}</div>
  {/if}
  {#if caption && visual.caption && !compact}
    <figcaption>{visual.caption}</figcaption>
  {/if}
</figure>

<style>
  .visual {
    margin: 0;
    min-width: 0;
  }
  .visual :global(.diagram) {
    margin: 0 auto;
  }
  .scroll {
    overflow-x: auto;
  }
  img {
    display: block;
    max-width: 100%;
    border-radius: var(--r-small);
    margin: 0 auto;
  }
  .html {
    width: 100%;
    border: 0;
    border-radius: var(--r-small);
    background: #fff;
    display: block;
  }
  figcaption {
    margin-top: 0.6rem;
    font-size: 0.85rem;
    color: var(--ink-3);
    text-align: center;
  }
  .compact {
    pointer-events: none;
  }
  .story {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.6rem;
    min-height: 2.4rem;
    font-size: 0.85rem;
  }
  .story .count {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--ink-3);
  }
  .story .cap {
    flex: 1;
    margin: 0;
    padding: 0.45rem 0.8rem;
    border-radius: 10px;
    background: var(--beacon-soft);
    border-left: 4px solid var(--beacon);
    font-size: 1rem;
    font-weight: 650;
    color: var(--ink);
    animation: capin 0.3s var(--ease);
  }
  @keyframes capin {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }
  .visual:global(.storying) :global([data-el]) {
    opacity: 0.28;
    transition: opacity 0.35s;
  }
  .visual:global(.storying) :global([data-el].story-on) {
    opacity: 1;
  }
  .visual:global(.storying) :global(g.story-on rect:not(.hit):not(.rowbg)),
  .visual:global(.storying) :global(g.story-on path.shape) {
    stroke: var(--beacon) !important;
    stroke-width: 4px !important;
    filter: drop-shadow(0 0 6px rgba(255, 201, 60, 0.8));
  }
  .visual:global(.storying) :global(.edge) {
    opacity: 0.25;
  }
  .pickable :global([data-el]) {
    cursor: pointer;
  }
  .pickable :global(g[data-el]:hover rect:not(.hit)),
  .pickable :global(g[data-el]:hover path.shape) {
    stroke: var(--beacon) !important;
    stroke-width: 3px !important;
  }
  .pickable :global(g[data-el].rowbg),
  .pickable :global(g[data-el^="column:"]:hover .rowbg) {
    fill: var(--beacon-soft) !important;
  }
  .pickable :global(td[data-el]:hover),
  .pickable :global(th[data-el]:hover) {
    box-shadow: inset 0 0 0 2px var(--beacon);
  }
  .visual :global(g.marked rect:not(.hit):not(.rowbg)),
  .visual :global(g.marked path.shape) {
    stroke: var(--beacon) !important;
    stroke-width: 3.5px !important;
  }
  .visual :global(g.marked .rowbg),
  .visual :global(td.marked),
  .visual :global(th.marked) {
    fill: var(--beacon-soft) !important;
    background: var(--beacon-soft);
  }
</style>
