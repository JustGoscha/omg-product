<script lang="ts">
  // The project lifecycle: four phases, one column per stage, all on one grid so
  // phase names, bars, chips and evidence line up.
  import { STAGES, evidence, stageColor, stageSoft } from "../lib/stages";
  import type { ProjectInfo } from "../lib/types";

  let { project: p, locale = "en" }: { project: ProjectInfo; locale?: string } = $props();

  const phases = [
    { en: "Discover", de: "Entdecken", stages: ["idea", "exploring", "prototyping"] },
    { en: "Align", de: "Abstimmen", stages: ["kickoff", "scoped"] },
    { en: "Deliver", de: "Liefern", stages: ["building", "rollout"] },
    { en: "Learn", de: "Lernen", stages: ["measuring", "done"] },
  ] as const;
  // stage columns with a narrow spacer column between phases
  const cols = phases.map((ph) => ph.stages.map(() => "minmax(0, 1fr)").join(" ")).join(" 14px ");
  const columnOf = (s: string) => {
    let c = 1;
    for (const ph of phases) {
      const i = (ph.stages as readonly string[]).indexOf(s);
      if (i >= 0) return c + i;
      c += ph.stages.length + 1;
    }
    return c;
  };
  const at = $derived(STAGES.indexOf(p.stage as (typeof STAGES)[number]));
  const off = $derived(p.stage === "paused" || p.stage === "dropped");
  const state = (s: string) => {
    if (p.stage === "done") return "past";
    const i = STAGES.indexOf(s as (typeof STAGES)[number]);
    return i < at ? "past" : i === at ? "now" : "next";
  };
</script>

<div class="track" class:off style="grid-template-columns:{cols}" aria-label="stage: {p.stage}">
  {#each phases as ph}
    {@const c = columnOf(ph.stages[0])}
    <span class="pname" style="grid-column:{c} / span {ph.stages.length};color:{stageColor(ph.stages[0])}">{locale === "de" ? ph.de : ph.en}</span>
  {/each}
  {#each STAGES as s}
    {@const st = state(s)}
    {@const ev = st !== "next" ? evidence(p, s) : null}
    <span class="bar {st}" style="grid-column:{columnOf(s)};--c:{stageColor(s)}"></span>
    <span class="chip {st}" title={s} style="grid-column:{columnOf(s)};--c:{stageColor(s)};--soft:{stageSoft(s)}">
      {#if st === "past"}<i>✓</i>{/if}<span class="sname">{s}</span>
    </span>
    {#if ev}<span class="ev {st}" style="grid-column:{columnOf(s)}">{ev}</span>{/if}
  {/each}
  {#if off}<span class="offchip">{p.stage}</span>{/if}
</div>

<style>
  .track {
    position: relative;
    display: grid;
    grid-template-rows: auto 6px auto auto;
    column-gap: 4px;
    row-gap: 0.4rem;
    max-width: 56rem;
    margin-top: 0.5rem;
    align-items: start;
    container-type: inline-size;
  }
  .track.off {
    opacity: 0.55;
  }
  .pname {
    grid-row: 1;
    font-size: 0.75rem;
    font-weight: 750;
  }
  .bar {
    grid-row: 2;
    height: 6px;
    border-radius: 3px;
    background: var(--line);
  }
  .bar.past {
    background: var(--c);
  }
  .bar.now {
    background: repeating-linear-gradient(-45deg, var(--c) 0 6px, color-mix(in srgb, var(--c) 50%, #fff) 6px 12px);
  }
  .chip {
    grid-row: 3;
    justify-self: start;
    max-width: 100%;
    height: 1.55rem;
    padding: 0 0.5rem;
    gap: 0.2rem;
    font-size: 0.76rem;
    font-weight: 650;
    border: 1.5px solid var(--line);
    background: transparent;
    color: var(--fog);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chip i {
    font-style: normal;
    font-weight: 900;
  }
  .sname {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* narrow: finished stages shrink to their tick, the name stays on hover */
  @container (max-width: 760px) {
    .chip.past .sname {
      display: none;
    }
  }
  .chip.past {
    background: var(--soft);
    border-color: transparent;
    color: var(--c);
  }
  .chip.now {
    background: var(--c);
    border-color: var(--c);
    color: #fff;
    font-weight: 800;
    box-shadow: 0 0 0 3px var(--beacon);
  }
  .ev {
    grid-row: 4;
    font-size: 0.7rem;
    color: var(--ink-3);
    padding-left: 0.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ev.now {
    color: var(--ink-2);
    font-weight: 700;
  }
  .offchip {
    position: absolute;
    right: 0;
    top: 0;
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--no);
  }
  @media (max-width: 640px) {
    .chip.past,
    .chip.next,
    .ev {
      display: none;
    }
  }
</style>
