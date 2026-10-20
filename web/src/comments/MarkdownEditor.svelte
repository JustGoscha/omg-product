<script lang="ts">
  // WYSIWYG editing that reads and writes markdown (Milkdown). Formatting shows as
  // formatting; "- " starts a list, "**" bold, "/" opens the block menu, selecting
  // text shows a toolbar. Loaded on first use, it is a large bundle.
  import { onMount } from "svelte";
  import { store } from "../lib/store.svelte";
  import { unwrap } from "../lib/unwrap";

  let {
    value,
    onsave,
    oncancel,
    placeholder = "",
    compact = false,
  }: {
    value: string | undefined;
    onsave: (markdown: string) => Promise<unknown> | unknown;
    oncancel: () => void;
    placeholder?: string;
    compact?: boolean;
  } = $props();

  const t = $derived(store.t);

  let root = $state<HTMLDivElement>();
  let crepe: { getMarkdown(): string; destroy(): Promise<unknown>; editor: unknown } | null = null;
  let ready = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);

  onMount(() => {
    let gone = false;
    (async () => {
      const [{ Crepe }] = await Promise.all([
        import("@milkdown/crepe"),
        import("@milkdown/crepe/theme/common/style.css"),
        import("@milkdown/crepe/theme/frame.css"),
      ]);
      if (gone || !root) return;
      const c = new Crepe({
        root,
        defaultValue: unwrap(value ?? ""),
        features: {
          [Crepe.Feature.CodeMirror]: false,
          [Crepe.Feature.ImageBlock]: false,
          [Crepe.Feature.Latex]: false,
          [Crepe.Feature.AI]: false,
          [Crepe.Feature.TopBar]: false,
        },
        featureConfigs: { [Crepe.Feature.Placeholder]: { text: placeholder, mode: "block" } },
      });
      await c.create();
      if (gone) return void c.destroy();
      crepe = c;
      ready = true;
      requestAnimationFrame(() => root?.querySelector<HTMLElement>(".ProseMirror")?.focus());
    })();
    return () => {
      gone = true;
      crepe?.destroy();
    };
  });

  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  async function save() {
    if (!crepe) return;
    const md = crepe.getMarkdown().replace(/\s+$/, "");
    if (norm(md) === norm(value ?? "")) return oncancel();
    busy = true;
    error = null;
    try {
      await onsave(md);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  function keys(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.preventDefault(), save());
    if (e.key === "Escape") (e.preventDefault(), oncancel());
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="me" class:compact onkeydown={keys}>
  <div class="surface" bind:this={root} class:loading={!ready}></div>
  <div class="bar">
    {#if error}<span class="err">{error}</span>{/if}
    <span class="grow"></span>
    <span class="kbd">⌘↵</span>
    <button class="btn small ghost" onclick={oncancel}>{t.cm.cancel}</button>
    <button class="btn small primary" onclick={save} disabled={busy || !ready}>{t.cm.save}</button>
  </div>
</div>

<style>
  .me {
    display: grid;
    gap: 0.45rem;
  }
  .surface {
    border-radius: 10px;
    border: 1.5px solid var(--beacon);
    box-shadow: 0 0 0 3px var(--beacon-soft);
    background: var(--card);
    min-height: 4rem;
  }
  .surface.loading {
    background: linear-gradient(90deg, var(--card), var(--paper-2), var(--card));
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  /* Milkdown in the studio's type and colors */
  .surface :global(.milkdown) {
    --crepe-color-background: var(--card);
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
    border-radius: 10px;
  }
  .surface :global(.milkdown .ProseMirror) {
    padding: 0.8rem 1rem 0.8rem 3.2rem;
    font-size: 1rem;
    line-height: 1.55;
    outline: none;
  }
  .compact .surface :global(.milkdown .ProseMirror) {
    padding: 0.5rem 0.7rem 0.5rem 2.6rem;
  }
  .surface :global(.milkdown .ProseMirror h2),
  .surface :global(.milkdown .ProseMirror h3) {
    font-family: var(--font-display);
    margin: 0.6em 0 0.3em;
  }
  .surface :global(.milkdown .ProseMirror p) {
    margin: 0.35em 0;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .grow {
    flex: 1;
  }
  .err {
    color: var(--block);
    font-size: 0.85rem;
    font-weight: 650;
  }
</style>
