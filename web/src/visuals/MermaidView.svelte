<script lang="ts">
  let { code }: { code: string } = $props();
  let svg = $state("");
  let error = $state("");
  let n = 0;

  $effect(() => {
    const src = code;
    const id = `mmd-${Math.random().toString(36).slice(2)}-${n++}`;
    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: "Atkinson Hyperlegible Next Variable, system-ui",
        themeVariables: {
          primaryColor: "#ffffff",
          primaryBorderColor: "#1b2430",
          primaryTextColor: "#1b2430",
          lineColor: "#44505e",
          secondaryColor: "#fff1c7",
          tertiaryColor: "#e8ecea",
          fontSize: "15px",
        },
      });
      try {
        svg = (await mermaid.render(id, src)).svg;
        error = "";
      } catch (e) {
        error = (e as Error).message;
        document.getElementById(id)?.remove();
      }
    });
  });
</script>

{#if error}
  <pre class="err">{error}</pre>
{:else}
  <div class="mermaid">{@html svg}</div>
{/if}

<style>
  .mermaid :global(svg) {
    max-width: 100%;
    height: auto;
  }
  .err {
    color: var(--block);
    white-space: pre-wrap;
    font-size: 0.8rem;
  }
</style>
