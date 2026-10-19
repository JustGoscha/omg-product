<script lang="ts">
  import { store } from "../lib/store.svelte";
  import { href, router } from "../lib/router.svelte";
  import { fileUrl } from "../lib/api";
  import { md } from "../lib/md";
  import { pulse } from "../lib/pulse.svelte";
  import StatusPicker from "../components/StatusPicker.svelte";
  import NextTasks from "../components/NextTasks.svelte";
  import PrototypeFrame from "../visuals/PrototypeFrame.svelte";
  import LiveDoc from "../comments/LiveDoc.svelte";
  import StageTrack from "../components/StageTrack.svelte";
  import ThreadsPanel from "../comments/ThreadsPanel.svelte";
  import { Comments } from "../lib/comments.svelte";
  import { provideComments } from "../lib/comments-context";
  import { isStatic } from "../lib/static";
  import type { AnchoredThread, CommentTargetT } from "../lib/types";

  let { project: id }: { project: string } = $props();
  const t = $derived(store.t);
  const p = $derived(store.project(id));
  const ws = $derived(store.ws);

  // comments and the handoff document
  const comments = $derived(new Comments(id));
  $effect(() => {
    const c = comments;
    c.start();
    return () => c.stop();
  });
  provideComments(() => comments);
  let tab = $state<"brief" | "handoff">("brief");
  let panel = $state(false);
  let active = $state<string | null>(null);
  let draft = $state<{ target: CommentTargetT; quote?: string } | null>(null);
  let handoff = $state("");
  $effect(() => {
    if (!p?.handoff || tab !== "handoff") return;
    void ws; // refetch when files change
    fetch(fileUrl(`${p.dir}/handoff.md`)).then((r) => r.text()).then((x) => (handoff = x));
  });
  const openCount = $derived(comments.threads.filter((x) => x.status === "open").length);
  const openThread = (tid: string) => ((active = tid), (draft = null), (panel = true));
  const startDraft = (target: CommentTargetT, quote?: string) => ((draft = { target, quote }), (active = null), (panel = true));
  function focusThread(th: AnchoredThread) {
    active = th.id;
    if (th.target.kind === "prototype") return router.go(`/p/${id}/proto/${th.target.file.split("#")[0].replace(/^prototypes\//, "")}`);
    if (th.target.kind === "step" || th.target.kind === "element") {
      const session = th.target.file.match(/sessions\/(.+)\.ya?ml$/)?.[1];
      if (session) return router.go(`/p/${id}/s/${session}?step=${encodeURIComponent(th.target.step ?? "")}`);
    }
    if (th.target.kind === "text") tab = th.target.file === "handoff.md" ? "handoff" : "brief";
    requestAnimationFrame(() => document.querySelector(".block.active, mark.cq")?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }
  const blocks = $derived(ws?.projects.filter((x) => x.dependsOn.some((d) => d.on === id)) ?? []);
  const issues = $derived(ws?.issues.filter((i) => i.file.startsWith(`projects/${id}/`)) ?? []);
  const name = (pid: string) => ws?.projects.find((x) => x.id === pid)?.name ?? pid;
  const initiative = (iid: string) => ws?.initiatives.find((i) => i.id === iid);
  const flags = $derived({
    bottleneck: ws?.analysis.bottlenecks.find((b) => b.project === id),
    delegatable: ws?.analysis.delegatable.includes(id),
    conflicts: ws?.analysis.conflicts.filter((c) => c.project === id) ?? [],
  });
  pulse.start();
</script>

{#if p && panel}
  <ThreadsPanel {comments} {active} {draft} onclose={() => ((panel = false), (draft = null), (active = null))}
    ondraftdone={(tid) => ((draft = null), (active = tid))} onfocus={focusThread} />
{/if}

{#if !p}
  <div class="pad"><a href={href("/")}>← {t.roadmap}</a><p class="muted">{ws ? "Project not found." : "…"}</p></div>
{:else}
  <div class="page">
    <header class="head">
      <div class="toprow">
        <a class="crumb" href={href("/")}>← {t.roadmap}</a>
        {#if !isStatic || comments.threads.length}
          <button class="btn small" class:has={openCount} onclick={() => ((panel = !panel), (draft = null))}>💬 {t.cm.comments} {openCount || ""}</button>
        {/if}
      </div>
      <div class="inits">
        {#each p.initiatives as iid}
          {@const i = initiative(iid)}
          <span class="chip" style={i?.color ? `background:${i.color}22;color:${i.color}` : ""}>{i?.name ?? iid}</span>
        {/each}
      </div>
      <h1>{p.name}</h1>
      <StatusPicker project={p} />
      {#if p.summary}<p class="lead">{p.summary}</p>{/if}
      <div class="nexttasks"><NextTasks project={p} /></div>
      <StageTrack project={p} locale={ws?.config.locale} />
      <dl class="facts">
        {#if pulse.positions.get(p.id)}
          {@const r = pulse.positions.get(p.id)!}
          <div><dt><a href={href("/pulse/results")}>{t.pulse.title}</a></dt><dd>#{r.pos} · {r.rating} · {t.pulse.record(r.wins, r.losses)}</dd></div>
        {/if}
        <div><dt>{t.facts.priority}</dt><dd>{p.priority}</dd></div>
        {#if p.size}<div><dt>{t.facts.size}</dt><dd>{p.size}</dd></div>{/if}
        <div><dt>{t.facts.confidence}</dt><dd>{p.confidence}</dd></div>
        {#if p.stream}<div><dt>{t.facts.stream}</dt><dd>{ws?.config.roadmap.streams.find((s) => s.id === p.stream)?.name ?? p.stream}</dd></div>{/if}
        {#if p.span}<div><dt>{t.facts.when}</dt><dd>{p.span.start} → {p.span.end}{p.span.resolution !== "day" ? ` (${p.span.resolution})` : ""}</dd></div>{/if}
        {#if p.owner}<div><dt>{t.owner}</dt><dd>{p.owner}</dd></div>{/if}
        {#if p.linear?.url}<div><dt>Linear</dt><dd><a href={p.linear.url} target="_blank" rel="noreferrer">{p.linear.id ?? "open"}</a></dd></div>{/if}
      </dl>
      {#if flags.bottleneck || flags.delegatable || flags.conflicts.length}
        <div class="flags">
          {#if flags.bottleneck}<span class="chip warn">{t.bottleneck}: {flags.bottleneck.dependents.map(name).join(", ")}</span>{/if}
          {#if flags.delegatable}<span class="chip ok">{t.delegatable}</span>{/if}
          {#each flags.conflicts as c}<span class="chip bad">{c.message}</span>{/each}
        </div>
      {/if}
    </header>

    <div class="cols">
      <article class="doc">
        {#if p.handoff}
          <div class="tabs">
            <button class:on={tab === "brief"} onclick={() => (tab = "brief")}>{t.cm.brief}</button>
            <button class:on={tab === "handoff"} onclick={() => (tab = "handoff")}>{t.cm.handoff}</button>
          </div>
        {/if}
        {#if tab === "handoff" && p.handoff}
          {#key handoff === "" ? "loading" : "handoff"}
            {#if handoff}<LiveDoc scope={p.id} file="handoff.md" body={handoff} {comments} activeThread={active} readonly={isStatic} ondraft={startDraft} onopen={openThread} />{/if}
          {/key}
        {:else}
          <LiveDoc scope={p.id} file="project.md" body={p.body} {comments} activeThread={active} readonly={isStatic} ondraft={startDraft} onopen={openThread}
            recommend={["Problem", "For whom", "Metric", "Solution", "Done when", "Out of scope"]} />
        {/if}
      </article>

      <aside class="side">
        <section>
          <h2>{t.sessions}</h2>
          {#each p.sessions as s}
            <div class="session">
              <div class="s-top">
                <strong>{s.title}</strong>
                <span class="chip">{s.kind}</span>
              </div>
              <div class="muted small">{s.date ?? ""} {s.status}</div>
              <div class="meter"><span style="width:{s.steps ? (s.answered / s.steps) * 100 : 0}%"></span></div>
              <div class="s-actions">
                <a class="btn small primary" href={href(`/p/${p.id}/s/${s.id}`)}>{s.answered ? t.resume : t.start}</a>
                <a class="btn small" href={href(`/p/${p.id}/s/${s.id}/summary`)}>{t.summary}</a>
                <span class="muted small">{s.answered}/{s.steps}</span>
              </div>
            </div>
          {:else}
            <p class="muted small">No sessions yet. Ask your agent to prepare a kickoff (skill omgp-kickoff).</p>
          {/each}
          {#if p.handoff}<a class="btn small" href={fileUrl(`${p.dir}/handoff.md`)} target="_blank" rel="noreferrer">handoff.md</a>{/if}
        </section>

        {#if p.prototypes.length}
          <section>
            <h2>{t.prototypes}</h2>
            <div class="protos">
              {#each p.prototypes as proto}
                <a class="proto" href={href(`/p/${p.id}/proto/${proto.file.replace(/^prototypes\//, "")}`)}>
                  <PrototypeFrame project={p.id} src={proto.file} compact />
                  <strong>{proto.title}</strong>
                  {#if proto.description}<span class="muted small">{proto.description}</span>{/if}
                </a>
              {/each}
            </div>
          </section>
        {/if}

        {#if p.dependsOn.length || blocks.length}
          <section>
            {#if p.dependsOn.length}
              <h2>{t.dependsOn}</h2>
              <ul class="deps">
                {#each p.dependsOn as d}
                  <li><a href={href(`/p/${d.on}`)}>{name(d.on)}</a> <span class="chip dep-{d.kind}">{t.depKinds[d.kind]}</span>{#if d.note}<div class="muted small">{d.note}</div>{/if}</li>
                {/each}
              </ul>
            {/if}
            {#if blocks.length}
              <h2>{t.blocks}</h2>
              <ul class="deps">
                {#each blocks as b}
                  {@const d = b.dependsOn.find((x) => x.on === id)!}
                  <li><a href={href(`/p/${b.id}`)}>{b.name}</a> <span class="chip dep-{d.kind}">{t.depKinds[d.kind]}</span></li>
                {/each}
              </ul>
            {/if}
          </section>
        {/if}

        {#if p.metrics.length}
          <section>
            <h2>{t.metrics}</h2>
            {#each p.metrics as m}
              <div class="metric"><strong>{m.name}</strong><span class="muted">{m.baseline ?? "?"} → {m.target ?? "?"}{m.current ? ` · now ${m.current}` : ""}</span></div>
            {/each}
          </section>
        {/if}

        {#if p.stakeholders.length}
          <section>
            <h2>{t.facts.stakeholders}</h2>
            <ul class="people">{#each p.stakeholders as s}<li><strong>{s.name}</strong> <span class="muted">{s.role ?? ""}</span></li>{/each}</ul>
          </section>
        {/if}

        {#if issues.length}
          <section>
            <h2>{t.problems}</h2>
            <ul class="issues">{#each issues as i}<li class={i.level}><code>{i.file.replace(`projects/${id}/`, "")}</code> {i.message}</li>{/each}</ul>
          </section>
        {/if}
      </aside>
    </div>
  </div>
{/if}

<style>
  .pad {
    padding: 2rem;
  }
  .page {
    max-width: 84rem;
    margin: 0 auto;
    padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem;
  }
  .head {
    display: grid;
    gap: 0.8rem;
    padding-bottom: 1.6rem;
    border-bottom: 1.5px solid var(--line);
  }
  .toprow {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .btn.has {
    background: var(--beacon);
    border-color: var(--beacon);
  }
  .doc {
    min-width: 0;
  }
  .tabs {
    display: inline-flex;
    background: var(--paper-2);
    border-radius: 999px;
    padding: 3px;
    margin-bottom: 1rem;
  }
  .tabs button {
    border: 0;
    background: transparent;
    padding: 0.35rem 0.9rem;
    border-radius: 999px;
    font-weight: 650;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .tabs button.on {
    background: var(--card);
    color: var(--ink);
    box-shadow: 0 1px 3px rgba(27, 36, 48, 0.15);
  }
  .crumb {
    text-decoration: none;
    color: var(--ink-3);
    font-weight: 600;
  }
  .inits {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  h1 {
    font-size: clamp(2.2rem, 1.4rem + 2.6vw, 3.6rem);
  }
  .lead {
    font-size: 1.2rem;
    color: var(--ink-2);
    max-width: 48rem;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.8rem;
    margin: 0.3rem 0 0;
  }
  .facts div {
    display: grid;
  }
  dt {
    font-size: 0.78rem;
    color: var(--ink-3);
  }
  dd {
    margin: 0;
    font-weight: 650;
  }
  .flags {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .warn {
    background: var(--must-soft);
    color: #7a5600;
  }
  .ok {
    background: var(--should-soft);
    color: var(--should);
  }
  .bad {
    background: var(--block-soft);
    color: var(--block);
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 26rem);
    gap: 3rem;
    padding-top: 2rem;
  }
  .brief {
    font-size: 1.08rem;
    max-width: 44rem;
  }
  .brief :global(h2) {
    font-size: 1.5rem;
    margin: 2rem 0 0.6rem;
  }
  .brief :global(h2:first-child) {
    margin-top: 0;
  }
  .brief :global(h3) {
    font-size: 1.15rem;
    margin: 1.4rem 0 0.4rem;
  }
  .side {
    display: grid;
    gap: 1.6rem;
    align-content: start;
  }
  .side h2 {
    font-size: 1.1rem;
    margin-bottom: 0.6rem;
  }
  .session {
    display: grid;
    gap: 0.45rem;
    padding: 1rem;
    background: var(--card);
    border-radius: var(--r-card);
    box-shadow: var(--shadow-lift);
    margin-bottom: 0.7rem;
  }
  .s-top {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    align-items: start;
  }
  .small {
    font-size: 0.85rem;
  }
  .meter {
    height: 6px;
    border-radius: 3px;
    background: var(--paper-2);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    background: var(--ink-2);
  }
  .s-actions {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  .protos {
    display: grid;
    gap: 0.9rem;
  }
  .proto {
    display: grid;
    gap: 0.35rem;
    text-decoration: none;
    padding: 0.6rem;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow-lift);
  }
  .deps,
  .people,
  .issues {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  .dep-hard {
    background: var(--block-soft);
    color: var(--block);
  }
  .dep-tight {
    background: var(--must-soft);
    color: #7a5600;
  }
  .metric {
    display: grid;
    margin-bottom: 0.5rem;
  }
  .issues li {
    font-size: 0.85rem;
  }
  .issues li.error {
    color: var(--block);
  }
  @media (max-width: 960px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
  .nexttasks {
    margin: 1rem 0 0.5rem;
  }
</style>
