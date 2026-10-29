<script lang="ts">
  import type { MatrixVisualT } from "../lib/types";
  import { mdInline } from "../lib/md";

  let { visual, highlight, compact = false }: { visual: MatrixVisualT & { changed?: Set<string> }; highlight?: string; compact?: boolean } = $props();
  const hi = $derived(highlight ?? visual.highlight);
</script>

<div class="wrap" class:compact>
  <table>
    <thead>
      <tr>
        <th></th>
        {#each visual.columns as col}
          <th class:hi={col === hi}>{col}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each visual.rows as row}
        <tr>
          <th scope="row" data-el="row:{row[0]}" data-label={String(row[0] ?? "")}>{@html mdInline(String(row[0] ?? ""))}</th>
          {#each visual.columns as col, ci}
            {@const v = row[ci + 1]}
            <td class:hi={col === hi} class:changed={visual.changed?.has(`${row[0]}|${col}`)} data-el="cell:{row[0]}|{col}" data-label="{row[0]} · {col}">
              {#if v === true}
                <span class="yes" aria-label="yes">✓</span>
              {:else if v === false || v === null || v === undefined || v === ""}
                <span class="no" aria-label="no">–</span>
              {:else}
                <span class="txt">{@html mdInline(String(v))}</span>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .wrap {
    overflow-x: auto;
  }
  .compact table {
    font-size: 0.78rem;
  }
  .compact th,
  .compact td {
    padding: 0.3rem 0.4rem;
  }
  .compact thead th {
    font-size: 0.82rem;
  }
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: 0.95rem;
  }
  th,
  td {
    padding: 0.55rem 0.8rem;
    border-bottom: 1px solid var(--line);
    text-align: center;
    vertical-align: middle;
  }
  thead th {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 650;
    border-bottom: 2px solid var(--ink);
  }
  tbody th {
    text-align: left;
    font-weight: 500;
    color: var(--ink);
    max-width: 22rem;
  }
  .hi {
    background: var(--beacon-soft);
  }
  thead th.hi {
    background: var(--beacon);
    border-radius: 8px 8px 0 0;
  }
  .changed {
    box-shadow: inset 0 0 0 2px var(--changed);
  }
  .yes {
    color: var(--should);
    font-weight: 800;
    font-size: 1.15rem;
  }
  .no {
    color: var(--fog);
    font-weight: 700;
  }
  .txt {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
</style>
