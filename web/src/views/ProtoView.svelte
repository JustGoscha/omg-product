<script lang="ts">
  import { store } from "../lib/store.svelte";
  import { href } from "../lib/router.svelte";
  import PrototypeFrame from "../visuals/PrototypeFrame.svelte";
  import { Comments } from "../lib/comments.svelte";
  import { provideComments } from "../lib/comments-context";
  import { isStatic } from "../lib/static";

  let { project, file }: { project: string; file: string } = $props();
  const comments = $derived(new Comments(project));
  $effect(() => {
    const c = comments;
    c.start();
    return () => c.stop();
  });
  // without comments around (static demo) the prototype is just shown, nothing to pin
  if (!isStatic) provideComments(() => comments);
  const p = $derived(store.project(project));
  const src = $derived(`prototypes/${file}`);
  const proto = $derived(p?.prototypes.find((x) => x.file === src));
</script>

<div class="pv">
  <header>
    <a href={href(`/p/${project}`)}>← {p?.name ?? project}</a>
    <h1>{proto?.title ?? file}</h1>
    {#if proto?.description}<p class="muted">{proto.description}</p>{/if}
  </header>
  <div class="frame"><PrototypeFrame {project} {src} height={Math.max(480, innerHeight - 170)} /></div>
</div>

<style>
  .pv {
    padding: 1rem clamp(1rem, 3vw, 2rem);
    display: grid;
    gap: 0.8rem;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 1.2rem;
    flex-wrap: wrap;
  }
  header a {
    text-decoration: none;
    color: var(--ink-3);
    font-weight: 600;
  }
  h1 {
    font-size: 1.5rem;
  }
</style>
