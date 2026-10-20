<script lang="ts">
  import { store } from "./lib/store.svelte";
  import { router, href } from "./lib/router.svelte";
  import Roadmap from "./views/Roadmap.svelte";
  import Project from "./views/Project.svelte";
  import Session from "./views/Session.svelte";
  import Summary from "./views/Summary.svelte";
  import ProtoView from "./views/ProtoView.svelte";
  import Join from "./views/Join.svelte";
  import Pulse from "./views/Pulse.svelte";
  import AgentDock from "./components/AgentDock.svelte";
  import DemoBadge from "./components/DemoBadge.svelte";
  import { isStatic } from "./lib/static";
  import { agent } from "./lib/agent.svelte";

  store.load();
  store.connect();
  agent.start();

  $effect(() => {
    document.documentElement.lang = store.ws?.config.locale ?? "en";
    const r = router.route;
    const p = "project" in r ? store.project(r.project) : null;
    document.title = [p?.name, store.ws?.config.name, "omg·product"].filter(Boolean).join(" · ");
  });
  const r = $derived(router.route);
</script>

{#if r.name === "roadmap"}
  <Roadmap />
{:else if r.name === "project"}
  <Project project={r.project} />
{:else if r.name === "session"}
  <Session project={r.project} session={r.session} step={r.step} />
{:else if r.name === "summary"}
  <Summary project={r.project} session={r.session} />
{:else if r.name === "proto"}
  <ProtoView project={r.project} file={r.file} />
{:else if r.name === "join"}
  <Join project={r.project} session={r.session} />
{:else if r.name === "pulse"}
  <Pulse results={r.results} />
{:else}
  <div style="padding:2rem"><a href={href("/")}>← Roadmap</a></div>
{/if}

{#if r.name !== "join" && r.name !== "pulse"}{#if isStatic}<DemoBadge />{:else}<AgentDock />{/if}{/if}
