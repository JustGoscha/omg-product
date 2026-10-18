<script lang="ts">
  import { store } from "../lib/store.svelte";
  import { href, router } from "../lib/router.svelte";
  import { api } from "../lib/api";
  import { addDays, daysBetween, iso, sizeWeeks, toDate } from "../../../src/core/time";
  import type { ProjectInfo, Span } from "../lib/types";
  import { STAGES, stageColor } from "../lib/stages";
  import StageBoard from "../components/StageBoard.svelte";
  import { isStatic } from "../lib/static";

  // One row per project, grouped by initiative or stream. Time runs left to right and
  // always fits the screen; zoom changes how much time fits, never the page width.
  type Zoom = "weeks" | "months" | "quarters" | "years";
  type LaneMode = "initiative" | "stream" | "stage";
  type View = "stages" | "time";
  type Order = "stage" | "start" | "priority";
  // Never more than a handful at once: at most 7 groups, at most 3 projects per group
  // in "current" (5 otherwise), at most 3 lighthouses. The rest sits behind "+N".
  type Focus = "now" | "planned" | "all";
  type Phase = "discover" | "align" | "deliver" | "learn";
  const MAX_GROUPS = 7;
  const MAX_BEACONS = 3;
  const PHASE_OF: Record<string, Phase> = { idea: "discover", exploring: "discover", prototyping: "discover", kickoff: "align", scoped: "align", building: "deliver", rollout: "deliver", measuring: "learn", done: "learn" };
  const WINDOW: Record<Zoom, { before: number; days: number }> = {
    weeks: { before: 14, days: 70 },
    months: { before: 30, days: 245 },
    quarters: { before: 45, days: 730 },
    years: { before: 90, days: 1460 },
  };
  const ROW = 44;
  const MORE = 30;
  const GROUP = 58;
  const BAR = 24;

  const t = $derived(store.t);
  const ws = $derived(store.ws);
  const read = (k: string, d: string) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  };
  const write = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  };

  let zoom = $state<Zoom>((["weeks", "months", "quarters", "years"].includes(read("omgp:zoom", "")) ? read("omgp:zoom", "") : "months") as Zoom);
  let laneMode = $state<LaneMode>(read("omgp:lanes", "initiative") as LaneMode);
  let collapsed = $state<Set<string>>(new Set(JSON.parse(read("omgp:collapsed", "[]"))));
  let view = $state<View>(read("omgp:view", "stages") === "time" ? "time" : "stages");
  let order = $state<Order>((["stage", "start", "priority"].includes(read("omgp:order", "")) ? read("omgp:order", "") : "stage") as Order);
  let focus = $state<Focus>((["now", "planned", "all"].includes(read("omgp:focus", "")) ? read("omgp:focus", "") : "now") as Focus);
  type Filter = { initiatives: string[]; phases: Phase[]; streams: string[] };
  const noFilter = (): Filter => ({ initiatives: [], phases: [], streams: [] });
  let only = $state<Filter>((() => {
    try {
      return { ...noFilter(), ...JSON.parse(read("omgp:filter", "{}")) };
    } catch {
      return noFilter();
    }
  })());
  let filterOpen = $state(false);
  let expanded = $state<Set<string>>(new Set());
  let allGroups = $state(false);
  let offset = $state(0);
  let selected = $state<string | null>(null);
  let hovered = $state<string | null>(null);
  let drawer = $state(false);
  let width = $state(900);
  let labelW = $state(300);
  let LABEL_W = $derived(labelW);
  let body = $state<HTMLDivElement>();
  let toast = $state<string | null>(null);
  $effect(() => write("omgp:zoom", zoom));
  $effect(() => write("omgp:lanes", laneMode));
  $effect(() => write("omgp:collapsed", JSON.stringify([...collapsed])));
  $effect(() => write("omgp:focus", focus));
  $effect(() => write("omgp:view", view));
  $effect(() => write("omgp:order", order));
  $effect(() => write("omgp:filter", JSON.stringify(only)));

  $effect(() => {
    if (!body) return;
    const ro = new ResizeObserver(() => {
      const w = body!.clientWidth;
      labelW = Math.round(Math.min(300, Math.max(190, w * 0.26)));
      width = Math.max(280, w - labelW - 24);
    });
    ro.observe(body);
    return () => ro.disconnect();
  });

  // ---------- time window ----------
  const today = $derived(ws?.today ?? iso(new Date()));
  const winStart = $derived(addDays(today, -WINDOW[zoom].before + offset));
  const winDays = $derived(WINDOW[zoom].days);
  const winEnd = $derived(addDays(winStart, winDays));
  const ppd = $derived(width / winDays);
  const x = (d: string) => daysBetween(winStart, d) * ppd;
  const pan = (dir: number) => (offset += Math.round((winDays / 3) * dir));

  // ---------- optimistic schedule changes ----------
  let pending = $state<Record<string, Span>>({});
  const spanOf = (p: ProjectInfo): Span | null => pending[p.id] ?? p.span;
  $effect(() => {
    // drop overrides once the files caught up
    for (const p of ws?.projects ?? []) {
      const o = pending[p.id];
      if (o && p.span && p.span.start === o.start) {
        const { [p.id]: _, ...rest } = pending;
        pending = rest;
      }
    }
  });
  async function reschedule(p: ProjectInfo, span: Span, patch: Record<string, unknown>) {
    pending = { ...pending, [p.id]: span };
    try {
      await api.patchProject(p.id, patch);
    } catch (e) {
      const { [p.id]: _, ...rest } = pending;
      pending = rest;
      toast = `${t.saveFailed}: ${(e as Error).message}`;
    }
  }

  // ---------- groups and rows ----------
  const closed = (p: ProjectInfo) => ["done", "dropped"].includes(p.stage);
  // current = in motion: being built, being prototyped or kicked off, a meeting within a week
  // back or two weeks ahead, or dated work that touches the next two weeks
  const isCurrent = (p: ProjectInfo) => {
    if (closed(p) || p.stage === "paused") return false;
    const soon = addDays(today, 14), recent = addDays(today, -7);
    if (p.sessions.some((x) => x.status === "live" || (!!x.date && x.date >= recent && x.date <= soon))) return true;
    const sp = spanOf(p);
    if (p.stage === "building" || p.stage === "rollout") return !sp || sp.start <= soon; // also when the planned end has passed
    if (p.stage === "prototyping" || p.stage === "kickoff") return true;
    return !!sp && sp.start <= soon && sp.end >= today;
  };
  const inFocus = (p: ProjectInfo, f: Focus) => (f === "all" ? true : f === "planned" ? !closed(p) && !!spanOf(p) : isCurrent(p));
  const filtered = (p: ProjectInfo) =>
    (!only.initiatives.length || p.initiatives.some((i) => only.initiatives.includes(i))) &&
    (!only.phases.length || only.phases.includes(PHASE_OF[p.stage])) &&
    (!only.streams.length || (!!p.stream && only.streams.includes(p.stream)));
  const filterCount = $derived(only.initiatives.length + only.phases.length + only.streams.length);
  const countFor = (f: Focus) => (ws?.projects ?? []).filter((p) => inFocus(p, f) && filtered(p)).length;
  const visible = $derived((ws?.projects ?? []).filter((p) => inFocus(p, focus) && filtered(p)));
  const activeChips = $derived([
    ...only.initiatives.map((id) => ({ key: `i-${id}`, label: ws?.initiatives.find((i) => i.id === id)?.name ?? id, remove: () => toggleIn("initiatives", id) })),
    ...only.phases.map((ph) => ({ key: `p-${ph}`, label: t.rm.phases[ph], remove: () => toggleIn("phases", ph) })),
    ...only.streams.map((id) => ({ key: `s-${id}`, label: ws?.config.roadmap.streams.find((x) => x.id === id)?.name ?? id, remove: () => toggleIn("streams", id) })),
  ]);
  const toggleIn = <K extends keyof Filter>(k: K, v: Filter[K][number]) => {
    const list = only[k] as string[];
    only = { ...only, [k]: list.includes(v as string) ? list.filter((x) => x !== v) : [...list, v] };
  };
  const lanes = $derived.by(() => {
    if (!ws) return [];
    if (laneMode === "stage")
      return [...STAGES, "paused", "dropped"].map((st) => ({ id: st, name: t.rm.stages[st] ?? st, color: stageColor(st), sub: "", span: null as Span | null, capacity: 0 }));
    if (laneMode === "stream")
      return [
        ...ws.config.roadmap.streams.map((s) => ({ id: s.id, name: s.name, color: s.color, sub: `${s.capacity} FTE`, span: null as Span | null, capacity: s.capacity })),
        { id: "__none", name: t.noStream, color: undefined, sub: "", span: null, capacity: 0 },
      ];
    return [
      ...ws.initiatives
        .filter((i) => i.status !== "dropped" && (focus === "all" || i.status !== "done"))
        .map((i) => ({
          id: i.id,
          name: i.name,
          color: i.color,
          sub: i.metric ? `${i.metric.name}: ${i.metric.baseline ?? "?"} → ${i.metric.target ?? "?"}` : (i.summary ?? ""),
          span: i.span,
          capacity: 0,
        })),
      { id: "__none", name: t.noInitiative, color: undefined, sub: "", span: null, capacity: 0 },
    ];
  });
  const laneOf = (p: ProjectInfo) => {
    const ids = new Set(lanes.map((l) => l.id));
    const key = laneMode === "stage" ? p.stage : laneMode === "stream" ? p.stream : p.initiatives.find((i) => ids.has(i));
    return key && ids.has(key) ? key : "__none";
  };
  const prio = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
  const byStart = (a: ProjectInfo, b: ProjectInfo) => {
    const sa = spanOf(a), sb = spanOf(b);
    if (sa && sb) return sa.start.localeCompare(sb.start);
    if (sa || sb) return sa ? -1 : 1;
    return prio[a.priority] - prio[b.priority];
  };
  const stageIdx = (p: ProjectInfo) => {
    const i = (STAGES as readonly string[]).indexOf(p.stage);
    return i < 0 ? 99 : i;
  };
  // the order people pick: by stage (furthest along first), by start, by priority
  const ordered = (a: ProjectInfo, b: ProjectInfo) =>
    order === "stage" ? stageIdx(b) - stageIdx(a) || byStart(a, b) : order === "priority" ? prio[a.priority] - prio[b.priority] || byStart(a, b) : byStart(a, b);
  // which projects of a group come first when not all fit: a meeting soon, a conflict, running now, priority
  const relevance = (p: ProjectInfo) => {
    const soon = addDays(today, 21), sp = spanOf(p);
    return [
      p.sessions.some((x) => x.status === "live" || (!!x.date && x.date >= today && x.date <= soon)) ? 0 : 1,
      ws?.analysis.conflicts.some((c) => c.project === p.id) ? 0 : 1,
      ["building", "rollout", "kickoff", "prototyping"].includes(p.stage) ? 0 : 1,
      sp && sp.start <= today && sp.end >= today ? 0 : 1,
      prio[p.priority],
    ];
  };
  const byRelevance = (a: ProjectInfo, b: ProjectInfo) => {
    const ra = relevance(a), rb = relevance(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return byStart(a, b);
  };
  const perGroup = $derived(focus === "now" ? 3 : 5);
  const allLaneGroups = $derived(
    lanes
      .map((lane) => ({ lane, projects: visible.filter((p) => laneOf(p) === lane.id).sort(ordered) }))
      .filter((g) => g.projects.length || (focus === "all" && !filterCount && laneMode === "initiative" && g.lane.id !== "__none")),
  );
  const groups = $derived.by(() => {
    // at most 7 groups: the ones with the most going on, in their usual order
    const keep = new Set([...allLaneGroups].sort((a, b) => b.projects.length - a.projects.length).slice(0, MAX_GROUPS).map((g) => g.lane.id));
    return allLaneGroups
      .filter((g) => allGroups || keep.has(g.lane.id))
      .map((g) => {
        const top = expanded.has(g.lane.id) ? g.projects : new Set([...g.projects].sort(byRelevance).slice(0, perGroup));
        const shown = top instanceof Set ? g.projects.filter((p) => top.has(p)) : top;
        return { ...g, shown, hidden: g.projects.length - shown.length };
      });
  });
  const hiddenGroups = $derived(allLaneGroups.length - groups.length);
  const toggleMore = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  };

  const layout = $derived.by(() => {
    const rows: { kind: "group" | "project" | "more"; y: number; group: (typeof groups)[number]; p?: ProjectInfo }[] = [];
    const rowY = new Map<string, number>();
    let y = 0;
    for (const g of groups) {
      rows.push({ kind: "group", y, group: g });
      y += GROUP;
      if (collapsed.has(g.lane.id)) continue;
      for (const p of g.shown) {
        rows.push({ kind: "project", y, group: g, p });
        rowY.set(p.id, y + ROW / 2);
        y += ROW;
      }
      if (g.hidden || expanded.has(g.lane.id) && g.projects.length > perGroup) {
        rows.push({ kind: "more", y, group: g });
        y += MORE;
      }
      y += 10;
    }
    return { rows, rowY, height: y + (hiddenGroups || allGroups ? 60 : 40), end: y };
  });

  // ---------- axis ----------
  const locale = $derived(ws?.config.locale === "de" ? "de-DE" : "en-GB");
  const ticks = $derived.by(() => {
    const out: { x: number; label: string; major: boolean }[] = [];
    const s = toDate(winStart);
    if (zoom === "weeks") {
      const d = toDate(winStart);
      d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
      for (; iso(d) <= winEnd; d.setUTCDate(d.getUTCDate() + 7)) {
        const first = d.getUTCDate() <= 7;
        out.push({
          x: x(iso(d)),
          label: first ? d.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" }) : `${ws?.config.locale === "de" ? "KW" : "W"} ${isoWeek(d)}`,
          major: first,
        });
      }
      return out;
    }
    const step = zoom === "years" ? 3 : 1;
    const d = new Date(Date.UTC(s.getUTCFullYear(), Math.floor(s.getUTCMonth() / step) * step, 1));
    if (iso(d) < winStart) d.setUTCMonth(d.getUTCMonth() + step);
    for (; iso(d) <= winEnd; d.setUTCMonth(d.getUTCMonth() + step)) {
      const m = d.getUTCMonth();
      const y = d.getUTCFullYear();
      let label = "";
      let major = false;
      if (zoom === "months") {
        label = m === 0 ? String(y) : d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" });
        major = m === 0;
      } else if (zoom === "quarters") {
        major = m % 3 === 0;
        label = major ? `Q${m / 3 + 1}${m === 0 ? ` ${y}` : ""}` : "";
      } else {
        major = m === 0;
        label = major ? String(y) : `Q${m / 3 + 1}`;
      }
      out.push({ x: x(iso(d)), label, major });
    }
    return out;
  });
  function isoWeek(d: Date) {
    const t2 = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = t2.getUTCDay() || 7;
    t2.setUTCDate(t2.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t2.getUTCFullYear(), 0, 1));
    return Math.ceil(((t2.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  }
  const short = (d: string) => toDate(d).toLocaleDateString(locale, { month: "short", year: "2-digit", timeZone: "UTC" });

  // lighthouses on the horizon row; what doesn't fit gathers in one chip at the right edge
  const beacons = $derived.by(() => {
    const ls = (ws?.vision?.lighthouses ?? []).filter((l) => l.span).sort((a, b) => a.span!.start.localeCompare(b.span!.start));
    const placed: { l: (typeof ls)[number]; x: number; w: number }[] = [];
    const overflow: (typeof ls)[number][] = [];
    const reserve = 70;
    let right = -Infinity;
    for (const l of ls) {
      const want = x(l.span!.start);
      if (want > width || placed.length >= MAX_BEACONS) {
        overflow.push(l);
        continue;
      }
      const at = Math.max(0, want, right + 14);
      const w = Math.min(240, l.name.length * 6.6 + 24, width - reserve - at);
      if (w < 80) {
        overflow.push(l);
        continue;
      }
      placed.push({ l, x: at, w });
      right = at + w;
    }
    return { placed, overflow };
  });

  // ---------- bars ----------
  const fuzz = (p: ProjectInfo, s: Span | null) => {
    const res = { day: 0, month: 0.22, quarter: 0.45, half: 0.62, year: 0.8 }[s?.resolution ?? "day"];
    const conf = { high: 0, medium: 0.08, low: 0.25 }[p.confidence];
    const dist = Math.min(1, Math.max(0, daysBetween(today, s?.start ?? today) / 365)) * 0.45;
    return Math.min(1, res + conf + dist + (p.stage === "idea" ? 0.12 : 0));
  };
  const colorOf = (p: ProjectInfo) => ws?.initiatives.find((i) => p.initiatives.includes(i.id))?.color ?? "var(--ink-3)";
  const bar = (p: ProjectInfo) => {
    const s = shifted(p);
    if (!s) return null;
    const x1 = x(s.start), x2 = x(addDays(s.end, 1));
    if (x2 < 0) return { off: "left" as const, s };
    if (x1 > width) return { off: "right" as const, s };
    return { off: null, s, left: Math.max(0, x1), w: Math.max(6, Math.min(width, x2) - Math.max(0, x1)), cutL: x1 < 0, cutR: x2 > width };
  };

  // say where a date comes from, so a guess never reads like a commitment
  const dateNote = (p: ProjectInfo, sp: Span) => {
    const de = ws?.config.locale === "de";
    const src = sp.from === "linear" ? "Linear" : sp.from === "manual" ? (de ? "von Hand gesetzt" : "set by hand") : sp.from === "estimate" ? (de ? "geschätzt" : "estimate") : "";
    const guess =
      sp.derivedSide === "end"
        ? de ? `Ende geschätzt aus Größe ${p.size ?? "m"}` : `end estimated from size ${p.size ?? "m"}`
        : sp.derivedSide === "start"
          ? de ? `Start geschätzt aus Größe ${p.size ?? "m"}` : `start estimated from size ${p.size ?? "m"}`
          : "";
    return `${p.name}: ${sp.start} → ${sp.end}${sp.resolution !== "day" ? ` (${sp.resolution})` : ""}${src ? ` · ${src}` : ""}${guess ? ` · ${guess}` : ""}`;
  };

  const badges = (id: string) => ({
    bottleneck: ws?.analysis.bottlenecks.find((b) => b.project === id),
    delegatable: ws?.analysis.delegatable.includes(id),
    conflict: ws?.analysis.conflicts.some((c) => c.project === id),
  });

  // ---------- dependencies ----------
  const edges = $derived.by(() => {
    const out: { from: string; to: string; kind: string; d: string; conflict: boolean }[] = [];
    for (const p of visible) {
      const y2 = layout.rowY.get(p.id);
      const sp = spanOf(p);
      if (y2 == null || !sp) continue;
      for (const dep of p.dependsOn) {
        const y1 = layout.rowY.get(dep.on);
        const depP = ws?.projects.find((q) => q.id === dep.on);
        const sd = depP && spanOf(depP);
        if (y1 == null || !sd) continue;
        const x1 = Math.min(width, Math.max(0, x(addDays(sd.end, 1))));
        const x2 = Math.min(width, Math.max(0, x(sp.start)));
        const k = Math.max(24, Math.abs(x2 - x1) / 2);
        const conflict = !!ws?.analysis.conflicts.some((c) => c.project === p.id && c.on === dep.on);
        out.push({ from: dep.on, to: p.id, kind: dep.kind, conflict, d: `M${x1},${y1} C${x1 + k},${y1} ${x2 - k},${y2} ${x2 - 3},${y2}` });
      }
    }
    return out;
  });
  const chain = $derived.by(() => {
    const focus = hovered ?? selected;
    if (!focus || !ws) return null;
    const set = new Set([focus]);
    const walk = (id: string, dir: "up" | "down") => {
      for (const p of ws!.projects) {
        if (dir === "up" && p.id === id) for (const d of p.dependsOn) if (!set.has(d.on)) (set.add(d.on), walk(d.on, "up"));
        if (dir === "down" && p.dependsOn.some((d) => d.on === id) && !set.has(p.id)) (set.add(p.id), walk(p.id, "down"));
      }
    };
    walk(focus, "up");
    walk(focus, "down");
    return set;
  });

  // ---------- stream load sparkline ----------
  const loadPath = (laneId: string, capacity: number) => {
    const weeks = ws?.analysis.load[laneId];
    if (!weeks?.length || !capacity) return null;
    const max = Math.max(capacity * 1.6, ...weeks.map((w) => w.load));
    const h = GROUP - 18;
    const yv = (v: number) => GROUP - 8 - (v / max) * h;
    let d = "";
    const over: string[] = [];
    for (const w of weeks) {
      const x1 = x(w.week), x2 = x(addDays(w.week, 7));
      if (x2 < 0 || x1 > width) continue;
      d += `M${x1},${GROUP - 8} V${yv(w.load)} H${x2} V${GROUP - 8} Z `;
      if (w.load > capacity + 0.01) over.push(`M${x1},${yv(capacity)} V${yv(w.load)} H${x2} V${yv(capacity)} Z`);
    }
    return { d, over: over.join(" "), cap: yv(capacity) };
  };

  // ---------- drag to reschedule ----------
  let drag = $state<{ id: string; dx: number; startX: number; moved: boolean; from: "bar" | "nodate"; x0?: number } | null>(null);
  const shifted = (p: ProjectInfo): Span | null => {
    const s = spanOf(p);
    if (drag?.id !== p.id || !drag.moved) return s;
    const days = Math.round(drag.dx / ppd);
    if (drag.from === "bar" && s) return { ...s, start: addDays(s.start, days), end: addDays(s.end, days) };
    if (drag.from === "nodate") {
      const start = addDays(winStart, Math.round(((drag.x0 ?? 0) + drag.dx) / ppd));
      return { start, end: addDays(start, Math.max(1, Math.round((sizeWeeks[p.size ?? "m"] ?? 2) * 7) - 1)), resolution: "day", derived: true };
    }
    return s;
  };
  function startDrag(e: PointerEvent, p: ProjectInfo, from: "bar" | "nodate") {
    if (e.button !== 0) return;
    const s = spanOf(p);
    // a static demo cannot write project.md: bars only select
    if (isStatic || (from === "bar" && s?.resolution !== "day")) {
      selected = selected === p.id ? null : p.id;
      return;
    }
    e.preventDefault();
    const timeLeft = (e.currentTarget as HTMLElement).closest(".lane")!.getBoundingClientRect().left;
    drag = { id: p.id, dx: 0, startX: e.clientX, moved: false, from, x0: from === "nodate" ? e.clientX - timeLeft : undefined };
    const move = (ev: PointerEvent) => {
      if (!drag) return;
      const dx = ev.clientX - drag.startX;
      drag = { ...drag, dx, moved: drag.moved || Math.abs(dx) > 4 };
    };
    const up = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      const d = drag;
      const next = d?.moved ? shifted(p) : null;
      drag = null;
      if (!d?.moved || !next) {
        selected = selected === p.id ? null : p.id;
        return;
      }
      const original = spanOf(p);
      if (original && next.start === original.start) return;
      const when: Record<string, string> = { start: next.start, from: "manual" };
      if (d.from === "bar" && original && !original.derived) when.end = next.end;
      reschedule(p, next, { when });
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  }

  function toggle(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    collapsed = next;
  }
  function reveal(id: string) {
    selected = id;
    const p = ws?.projects.find((q) => q.id === id);
    if (p && collapsed.has(laneOf(p))) toggle(laneOf(p));
    const s = p && spanOf(p);
    if (s && (s.start > winEnd || s.end < winStart)) offset += daysBetween(winStart, s.start) - Math.round(winDays / 4);
    requestAnimationFrame(() => {
      const y = layout.rowY.get(id);
      if (y != null && body) body.scrollTo({ top: Math.max(0, y - 200), behavior: "smooth" });
    });
  }

  const sel = $derived(selected ? ws?.projects.find((p) => p.id === selected) : null);
  const name = (id: string) => ws?.projects.find((p) => p.id === id)?.name ?? id;
  const findingsCount = $derived(ws ? ws.analysis.conflicts.length + ws.analysis.cycles.length + ws.analysis.overload.length + ws.analysis.bottlenecks.length : 0);
  const excerpt = (p: ProjectInfo) => {
    const k = Object.keys(p.sections).find((s) => s.startsWith("problem"));
    return (k ? p.sections[k] : (p.summary ?? "")).replace(/[#*_>`-]/g, "").trim().slice(0, 280);
  };
</script>

<svelte:window
  onkeydown={(e) => {
    if ((e.target as HTMLElement).closest("input, textarea")) return;
    const order: Zoom[] = ["weeks", "months", "quarters", "years"];
    if (e.key === "+" || e.key === "=") zoom = order[Math.max(0, order.indexOf(zoom) - 1)];
    if (e.key === "-") zoom = order[Math.min(3, order.indexOf(zoom) + 1)];
    if (e.key === "[") pan(-1);
    if (e.key === "]") pan(1);
    if (e.key === "Escape") (selected = null), (drawer = false), (filterOpen = false);
  }}
  onpointerdown={(e) => {
    if (filterOpen && !(e.target as HTMLElement).closest(".filters, .filterbtn")) filterOpen = false;
  }}
/>

<div class="roadmap">
  <header class="bar">
    <div class="brand">
      <span class="dot" aria-hidden="true"></span>
      <strong>{ws?.config.name ?? "…"}</strong>
      <span class="muted">{t.roadmap}</span>
    </div>
    <div class="seg" role="group" aria-label="view">
      {#each ["stages", "time"] as const as v}
        <button class:on={view === v} onclick={() => (view = v)}>{t.rm.view[v]}</button>
      {/each}
    </div>
    <div class="seg" role="group" aria-label={t.rm.filter}>
      {#each ["now", "planned", "all"] as const as f}
        <button class:on={focus === f} title={t.rm.focusHint[f]} onclick={() => ((focus = f), (expanded = new Set()), (allGroups = false))}>{t.rm.focus[f]} <small class="cnt">{countFor(f)}</small></button>
      {/each}
    </div>
    <button class="btn small filterbtn" class:on={filterOpen} aria-expanded={filterOpen} onclick={() => (filterOpen = !filterOpen)}>{t.rm.filter}{#if filterCount}&nbsp;<b>{filterCount}</b>{/if}</button>
    {#each activeChips.slice(0, 3) as c (c.key)}
      <button class="fchip on" onclick={c.remove} aria-label="{c.label} ×">{c.label} <span aria-hidden="true">×</span></button>
    {/each}
    {#if activeChips.length > 3}<span class="muted">+{activeChips.length - 3}</span>{/if}
    <span class="grow"></span>
    {#if view === "time"}
      <div class="seg" role="group" aria-label="zoom">
        {#each ["weeks", "months", "quarters", "years"] as const as z}
          <button class:on={zoom === z} onclick={() => ((zoom = z), (offset = 0))}>{t.zoom[z]}</button>
        {/each}
      </div>
      <div class="nav">
        <button class="btn small ghost" onclick={() => pan(-1)} aria-label={t.pan.back}>‹</button>
        <button class="btn small" onclick={() => (offset = 0)}>{t.today}</button>
        <button class="btn small ghost" onclick={() => pan(1)} aria-label={t.pan.forward}>›</button>
      </div>
    {/if}
    {#if ws?.issues.some((i) => i.level === "error")}
      <span class="chip bad" title={ws.issues.map((i) => `${i.file}: ${i.message}`).join("\n")}>{ws.issues.filter((i) => i.level === "error").length} errors</span>
    {/if}
    <button class="btn small" class:on={drawer} onclick={() => ((drawer = !drawer), (selected = null))}>{t.findings} <b>{findingsCount}</b></button>
    {#if !isStatic}<span class="live" class:on={store.connected} title={store.connected ? "live" : "offline"}></span>{/if}
  </header>
  {#if filterOpen && ws}
    <div class="filters" role="dialog" aria-label={t.rm.filter}>
      <section>
        <h3>{t.byInitiative}</h3>
        <div class="fchips">
          {#each ws.initiatives.filter((i) => i.status !== "dropped") as i (i.id)}
            <button class="fchip" class:on={only.initiatives.includes(i.id)} onclick={() => toggleIn("initiatives", i.id)}><i style="background:{i.color ?? 'var(--ink-3)'}"></i>{i.name}</button>
          {/each}
        </div>
      </section>
      <section>
        <h3>{t.rm.phase}</h3>
        <div class="fchips">
          {#each ["discover", "align", "deliver", "learn"] as const as ph}
            <button class="fchip" class:on={only.phases.includes(ph)} onclick={() => toggleIn("phases", ph)}>{t.rm.phases[ph]}</button>
          {/each}
        </div>
      </section>
      {#if ws.config.roadmap.streams.length}
        <section>
          <h3>{t.byStream}</h3>
          <div class="fchips">
            {#each ws.config.roadmap.streams as st (st.id)}
              <button class="fchip" class:on={only.streams.includes(st.id)} onclick={() => toggleIn("streams", st.id)}>{st.name}</button>
            {/each}
          </div>
        </section>
      {/if}
      <section class="two">
        <div>
          <h3>{t.rm.order}</h3>
          <div class="seg">
            {#each ["stage", "start", "priority"] as const as o}<button class:on={order === o} onclick={() => (order = o)}>{t.rm.orders[o]}</button>{/each}
          </div>
        </div>
        {#if view === "time"}
          <div>
            <h3>{t.groupBy}</h3>
            <div class="seg">
              <button class:on={laneMode === "initiative"} onclick={() => (laneMode = "initiative")}>{t.byInitiative}</button>
              <button class:on={laneMode === "stage"} onclick={() => (laneMode = "stage")}>{t.rm.byStage}</button>
              {#if ws.config.roadmap.streams.length}<button class:on={laneMode === "stream"} onclick={() => (laneMode = "stream")}>{t.byStream}</button>{/if}
            </div>
          </div>
        {/if}
      </section>
      <footer>
        <button class="btn small ghost" disabled={!filterCount} onclick={() => (only = noFilter())}>{t.rm.reset}</button>
        <button class="btn small primary" onclick={() => (filterOpen = false)}>OK</button>
      </footer>
    </div>
  {/if}
  {#if ws?.vision?.northStar}
    <div class="north"><span>{t.northStar}</span>{ws.vision.northStar}</div>
  {/if}

  <div class="body" bind:this={body}>
    {#if ws && !visible.length}
      <div class="nothing">
        <p>{filterCount ? t.rm.nothingFiltered : t.rm.nothing}</p>
        <button class="btn small" onclick={() => (filterCount ? (only = noFilter()) : (focus = "all"))}>{filterCount ? t.rm.reset : t.rm.showAll}</button>
      </div>
    {:else if ws && view === "stages"}
      <StageBoard projects={visible} {today} perColumn={5} {spanOf} order={ordered} pick={byRelevance} />
    {:else if ws}
      <div class="axis" style="--lw:{LABEL_W}px">
        <div class="axis-time" style="width:{width}px">
          {#each ticks as tk}
            <span class="tk" class:major={tk.major} style="left:{tk.x}px">{tk.label}</span>
          {/each}
          {#if x(today) >= 0 && x(today) <= width}
            <span class="today-pill" style="left:{x(today)}px">{t.today}</span>
          {/if}
        </div>
        <div class="horizon" style="width:{width}px">
          {#each beacons.placed as b (b.l.id)}
            <div class="beacon" style="left:{b.x}px;max-width:{b.w}px" title="{b.l.when}: {b.l.name}{b.l.description ? ` — ${b.l.description}` : ''}"><i></i><span>{b.l.name}</span></div>
          {/each}
          {#if beacons.overflow.length}
            <div class="beacon more" title={beacons.overflow.map((l) => `${l.when}: ${l.name}`).join("\n")}><i></i><span>→ +{beacons.overflow.length}</span></div>
          {/if}
        </div>
      </div>

      <div class="plane" style="height:{layout.height}px;--lw:{LABEL_W}px">
        <div class="grid" style="left:{LABEL_W}px;width:{width}px">
          {#each ticks as tk}<span class="gl" class:major={tk.major} style="left:{tk.x}px"></span>{/each}
          {#if x(today) < width}
            <div class="fog" style="left:{Math.max(0, x(today))}px"></div>
          {/if}
          {#if x(today) >= 0 && x(today) <= width}<span class="now" style="left:{x(today)}px"></span>{/if}
        </div>

        {#each layout.rows as r (r.kind === "project" ? r.p!.id : `${r.kind}-${r.group.lane.id}`)}
          {#if r.kind === "group"}
            {@const g = r.group}
            {@const load = laneMode === "stream" ? loadPath(g.lane.id, g.lane.capacity) : null}
            <div class="group row" style="top:{r.y}px;height:{GROUP}px;--c:{g.lane.color ?? 'var(--ink-3)'}">
              <button class="ghead" onclick={() => toggle(g.lane.id)} aria-expanded={!collapsed.has(g.lane.id)}>
                <span class="chev" class:closed={collapsed.has(g.lane.id)}>▾</span>
                <i></i>
                <span class="gtext">
                  <strong>{g.lane.name} <small>{g.projects.length}</small></strong>
                  {#if g.lane.sub}<span>{g.lane.sub}</span>{/if}
                </span>
              </button>
              <div class="lane" style="width:{width}px">
                {#if g.lane.span}
                  {@const a = Math.max(0, x(g.lane.span.start))}
                  {@const b = Math.min(width, x(addDays(g.lane.span.end, 1)))}
                  {#if b > a}<div class="ispan" style="left:{a}px;width:{b - a}px"></div>{/if}
                {/if}
                {#if load}
                  <svg class="load" width={width} height={GROUP}>
                    <path d={load.d} class="fill" />
                    <path d={load.over} class="over" />
                    <line x1="0" x2={width} y1={load.cap} y2={load.cap} class="cap" />
                  </svg>
                {/if}
                {#if collapsed.has(g.lane.id)}
                  {#each g.projects as p (p.id)}
                    {@const b = bar(p)}
                    {#if b && !b.off}<span class="mini" style="left:{b.left}px;width:{b.w}px;background:{colorOf(p)}"></span>{/if}
                  {/each}
                {/if}
              </div>
            </div>
          {:else if r.kind === "more"}
            <div class="row morerow" style="top:{r.y}px;height:{MORE}px">
              <button class="more" onclick={() => toggleMore(r.group.lane.id)}>{r.group.hidden ? `+${r.group.hidden} ${t.rm.more}` : t.rm.less}</button>
            </div>
          {:else}
            {@const p = r.p!}
            {@const b = bar(p)}
            {@const bd = badges(p.id)}
            {@const f = fuzz(p, b?.s ?? null)}
            <div class="row prow" role="group" aria-label={p.name} class:sel={selected === p.id} class:dim={chain && !chain.has(p.id)} style="top:{r.y}px;height:{ROW}px"
              onpointerenter={() => (hovered = p.id)} onpointerleave={() => (hovered = null)}>
              <a class="label" href={href(`/p/${p.id}`)} style="--c:{colorOf(p)}">
                <span class="pname">{p.name}</span>
                <span class="pmeta">
                  <span class="stage" style="color:{stageColor(p.stage)}">{t.rm.stages[p.stage] ?? p.stage}</span>
                  {#if p.size}<span>{p.size}</span>{/if}
                  {#if p.priority === "urgent" || p.priority === "high"}<span class="prio">{p.priority}</span>{/if}
                  {#if bd.conflict}<span class="bd bad" title={t.conflict}>⛔</span>{/if}
                  {#if bd.bottleneck}<span class="bd warn" title={t.bottleneck}>⧗ {bd.bottleneck.dependents.length}</span>{/if}
                  {#if bd.delegatable}<span class="bd ok" title={t.delegatable}>solo</span>{/if}
                  {#each p.sessions as s}<span class="bd sess" title={s.title}>▶ {s.id}</span>{/each}
                </span>
              </a>
              <div class="lane" style="width:{width}px">
                {#if !b}
                  <button class="nodate" class:dragging={drag?.id === p.id} onpointerdown={(e) => startDrag(e, p, "nodate")}>{t.noDate}</button>
                {:else if b.off === "right"}
                  <button class="offchip right" onclick={() => reveal(p.id)} style="--c:{colorOf(p)}">→ {short(b.s.start)}</button>
                {:else if b.off === "left"}
                  <button class="offchip left" onclick={() => reveal(p.id)} style="--c:{colorOf(p)}">← {short(b.s.end)}</button>
                {:else}
                  <div
                    class="pbar"
                    class:fuzzy={f > 0.35}
                    class:conflict={bd.conflict}
                    class:cutl={b.cutL}
                    class:cutr={b.cutR}
                    class:drag={drag?.id === p.id && drag.moved}
                    class:movable={b.s.resolution === "day" && !isStatic}
                    class:pending={!!pending[p.id]}
                    class:fade-end={b.s.derivedSide === "end"}
                    class:fade-start={b.s.derivedSide === "start"}
                    class:estimate={b.s.from === "estimate"}
                    style="left:{b.left}px;width:{b.w}px;--c:{colorOf(p)};--f:{f}"
                    title={dateNote(p, b.s)}
                    onpointerdown={(e) => startDrag(e, p, "bar")}
                    ondblclick={() => router.go(`/p/${p.id}`)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => e.key === "Enter" && router.go(`/p/${p.id}`)}
                  >
                    {#if drag?.id === p.id && drag.moved}<span class="dates">{b.s.start} → {b.s.end}</span>{/if}
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
        {#if allLaneGroups.length > MAX_GROUPS}
          <div class="row morerow" style="top:{layout.end}px;height:{MORE + 10}px">
            <button class="more groups" onclick={() => (allGroups = !allGroups)}>{allGroups ? t.rm.less : `+${hiddenGroups} ${t.rm.moreGroups}`}</button>
          </div>
        {/if}

        <svg class="deps" style="left:{LABEL_W}px" width={width} height={layout.height}>
          <defs>
            <marker id="dep-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-2)" /></marker>
            <marker id="dep-arrow-bad" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--block)" /></marker>
          </defs>
          {#each edges as e}
            <path class="dep k-{e.kind}" class:bad={e.conflict} class:dim={chain && !(chain.has(e.from) && chain.has(e.to))} class:lit={chain && chain.has(e.from) && chain.has(e.to)}
              d={e.d} marker-end={e.kind === "loose" ? "" : e.conflict ? "url(#dep-arrow-bad)" : "url(#dep-arrow)"} />
          {/each}
        </svg>
      </div>
    {:else if store.error}
      <p class="err">{store.error}</p>
    {/if}
  </div>

  {#if drawer || sel}
    <aside class="drawer">
      <button class="btn small ghost close" onclick={() => ((drawer = false), (selected = null))} aria-label="close">×</button>
      {#if sel}
        <div class="inspect">
          <h2>{sel.name}</h2>
          <div class="chips"><span class="chip">{sel.stage}</span><span class="chip">{sel.priority}</span>{#if sel.size}<span class="chip">{sel.size}</span>{/if}<span class="chip">{sel.confidence}</span></div>
          {#if spanOf(sel)}<p class="muted">{spanOf(sel)!.start} → {spanOf(sel)!.end}</p>{/if}
          {#if excerpt(sel)}<p class="ex">{excerpt(sel)}</p>{/if}
          {#if sel.dependsOn.length}
            <h3>{t.dependsOn}</h3>
            <ul>{#each sel.dependsOn as d}<li><button class="link" onclick={() => reveal(d.on)}>{name(d.on)}</button> <span class="muted">{t.depKinds[d.kind]}</span></li>{/each}</ul>
          {/if}
          {#if ws}
            {@const down = ws.projects.filter((x) => x.dependsOn.some((d) => d.on === sel.id))}
            {#if down.length}
              <h3>{t.blocks}</h3>
              <ul>{#each down as x}<li><button class="link" onclick={() => reveal(x.id)}>{x.name}</button></li>{/each}</ul>
            {/if}
          {/if}
          <a class="btn primary" href={href(`/p/${sel.id}`)}>{t.open}</a>
        </div>
      {:else if ws}
        {@const a = ws.analysis}
        <div class="findings">
          <h2>{t.findings}</h2>
          {#if a.conflicts.length}
            <h3 class="bad">{t.conflict}</h3>
            {#each a.conflicts as c}<button class="finding" onclick={() => reveal(c.project)}>{c.message}</button>{/each}
          {/if}
          {#if a.cycles.length}
            <h3 class="bad">Cycles</h3>
            {#each a.cycles as cy}<p class="finding">{cy.map(name).join(" → ")}</p>{/each}
          {/if}
          {#if a.overload.length}
            <h3 class="warn">{t.overload}</h3>
            {#each a.overload as o}
              <button class="finding" onclick={() => ((laneMode = "stream"), reveal(o.projects[0]))}>
                <strong>{ws.config.roadmap.streams.find((s) => s.id === o.stream)?.name ?? o.stream}</strong> {o.from} → {o.to}: {o.peak} / {o.capacity}
                <span class="muted">{o.projects.map(name).join(", ")}</span>
              </button>
            {/each}
          {/if}
          {#if a.bottlenecks.length}
            <h3 class="warn">{t.bottleneck}</h3>
            {#each a.bottlenecks as b}
              <button class="finding" onclick={() => reveal(b.project)}><strong>{name(b.project)}</strong> <span class="muted">← {b.dependents.map(name).join(", ")}</span></button>
            {/each}
          {/if}
          {#if a.unscheduled.length}
            <h3>High priority, no date</h3>
            {#each a.unscheduled as id}<button class="finding" onclick={() => reveal(id)}>{name(id)}</button>{/each}
          {/if}
          {#if a.delegatable.length}
            <h3 class="ok">{t.delegatable}</h3>
            <p class="muted small">No hard or tight links. Good for one person or a part-time stream.</p>
            {#each a.delegatable as id}<button class="finding" onclick={() => reveal(id)}>{name(id)}</button>{/each}
          {/if}
        </div>
      {/if}
    </aside>
  {/if}

  {#if toast}<button class="toast" onclick={() => (toast = null)}>{toast} ×</button>{/if}
</div>

<style>
  .roadmap {
    position: relative;
    display: grid;
    grid-template-rows: auto auto 1fr;
    height: 100dvh;
    overflow: hidden;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.7rem 1.2rem;
    border-bottom: 1.5px solid var(--line);
    flex-wrap: wrap;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .brand strong {
    font-family: var(--font-display);
    font-size: 1.25rem;
  }
  .dot {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 50%;
    background: var(--beacon);
    box-shadow: 0 0 0 3px var(--ink);
  }
  .seg {
    display: inline-flex;
    background: var(--paper-2);
    border-radius: 999px;
    padding: 3px;
  }
  .seg button {
    border: 0;
    background: transparent;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    font-weight: 650;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .seg button.on {
    background: var(--card);
    color: var(--ink);
    box-shadow: 0 1px 3px rgba(27, 36, 48, 0.15);
  }
  .nav {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
  }
  .cnt {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--ink-3);
    margin-left: 0.15rem;
  }
  .fchip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    height: 1.9rem;
    padding: 0 0.75rem;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: var(--card);
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--ink-2);
  }
  .fchip i {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 2px;
  }
  .fchip.on {
    background: var(--ink);
    border-color: var(--ink);
    color: #fff;
  }
  .filters {
    position: absolute;
    z-index: 30;
    top: 3.6rem;
    left: 1.2rem;
    width: min(40rem, calc(100vw - 2.4rem));
    display: grid;
    gap: 1rem;
    padding: 1.1rem 1.2rem;
    border-radius: var(--r-panel);
    background: var(--card);
    border: 1.5px solid var(--line);
    box-shadow: var(--shadow-lift);
  }
  .filters h3 {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--ink-3);
    margin-bottom: 0.45rem;
  }
  .fchips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .filters .two {
    display: flex;
    flex-wrap: wrap;
    gap: 1.4rem;
  }
  .filters footer {
    display: flex;
    justify-content: space-between;
  }
  .nothing {
    display: grid;
    justify-items: center;
    gap: 0.8rem;
    padding: 5rem 1rem;
    color: var(--ink-3);
    font-size: 1.05rem;
  }
  .morerow {
    display: flex;
    align-items: center;
    padding-left: 1.2rem;
  }
  .more {
    border: 0;
    background: none;
    padding: 0.2rem 0.4rem;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--ink-3);
  }
  .more:hover {
    color: var(--ink);
    text-decoration: underline;
  }
  .more.groups {
    font-size: 0.92rem;
    color: var(--ink-2);
  }
  .grow {
    flex: 1;
  }
  .btn.on {
    background: var(--ink);
    color: #fff;
    border-color: var(--ink);
  }
  .chip.bad {
    background: var(--block-soft);
    color: var(--block);
  }
  .live {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: var(--fog);
  }
  .live.on {
    background: var(--should);
  }
  .north {
    padding: 0.45rem 1.2rem;
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--ink-2);
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .north span {
    font-family: var(--font-ui);
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--ink-3);
    margin-right: 0.6rem;
  }

  .body {
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }
  .axis {
    position: sticky;
    top: 0;
    z-index: 6;
    background: var(--paper);
    border-bottom: 1px solid var(--line);
    padding-left: var(--lw);
  }
  .axis-time {
    position: relative;
    height: 30px;
  }
  .tk {
    position: absolute;
    top: 8px;
    transform: translateX(4px);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ink-3);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .tk.major {
    color: var(--ink);
    font-weight: 750;
  }
  .today-pill {
    position: absolute;
    top: 5px;
    transform: translateX(-50%);
    background: var(--beacon);
    color: var(--ink);
    font-weight: 800;
    font-size: 0.72rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    z-index: 1;
  }
  .horizon {
    position: relative;
    height: 30px;
  }
  .beacon {
    position: absolute;
    top: 4px;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    max-width: 280px;
    font-size: 0.78rem;
    font-weight: 650;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .beacon span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .beacon i {
    flex: none;
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: var(--beacon);
    box-shadow: 0 0 12px 5px rgba(255, 201, 60, 0.45);
  }
  .beacon.more {
    right: 0;
    color: var(--ink-3);
  }

  .plane {
    position: relative;
  }
  .grid {
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
  }
  .gl {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px solid rgba(27, 36, 48, 0.05);
  }
  .gl.major {
    border-left-color: rgba(27, 36, 48, 0.13);
  }
  .fog {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(to right, rgba(201, 209, 211, 0) 0, rgba(201, 209, 211, 0.16) 35%, rgba(201, 209, 211, 0.5) 100%);
  }
  .now {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 2.5px solid var(--beacon);
    z-index: 3;
  }

  .row {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
  }
  .lane {
    position: relative;
    height: 100%;
    flex: none;
  }
  .group {
    align-items: stretch;
    border-top: 1px solid var(--line);
  }
  .ghead {
    width: var(--lw);
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.6rem 0 0.8rem;
    border: 0;
    background: transparent;
    text-align: left;
  }
  .ghead i {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 3px;
    background: var(--c);
    flex: none;
  }
  .chev {
    font-size: 0.8rem;
    color: var(--ink-3);
    transition: transform 0.2s;
  }
  .chev.closed {
    transform: rotate(-90deg);
  }
  .gtext {
    display: grid;
    min-width: 0;
    line-height: 1.25;
  }
  .gtext strong {
    font-family: var(--font-display);
    font-size: 1.02rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gtext small {
    font-family: var(--font-ui);
    font-weight: 600;
    color: var(--ink-3);
    font-size: 0.78rem;
    margin-left: 0.2rem;
  }
  .gtext span {
    font-size: 0.76rem;
    color: var(--ink-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ispan {
    position: absolute;
    top: 10px;
    bottom: 10px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--c) 9%, transparent);
    border: 1px dashed color-mix(in srgb, var(--c) 40%, transparent);
  }
  .load {
    position: absolute;
    inset: 0;
  }
  .load .fill {
    fill: color-mix(in srgb, var(--ink-3) 22%, transparent);
  }
  .load .over {
    fill: var(--block);
    opacity: 0.75;
  }
  .load .cap {
    stroke: var(--ink-2);
    stroke-dasharray: 4 3;
    stroke-width: 1;
  }
  .mini {
    position: absolute;
    top: calc(50% - 3px);
    height: 6px;
    border-radius: 3px;
    opacity: 0.55;
  }

  .prow {
    transition: opacity 0.15s;
  }
  .prow:hover,
  .prow.sel {
    background: rgba(27, 36, 48, 0.035);
  }
  .prow.dim {
    opacity: 0.3;
  }
  .label {
    width: var(--lw);
    flex: none;
    display: grid;
    align-content: center;
    padding: 0 0.8rem 0 1.5rem;
    text-decoration: none;
    position: relative;
    min-width: 0;
  }
  .label::before {
    content: "";
    position: absolute;
    left: 0.85rem;
    top: 9px;
    bottom: 9px;
    width: 3px;
    border-radius: 2px;
    background: var(--c);
  }
  .pname {
    font-weight: 700;
    font-size: 0.92rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pmeta {
    display: flex;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: var(--ink-3);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
  }
  .prio {
    color: var(--block);
  }
  .bd {
    padding: 0 0.35rem;
    border-radius: 999px;
    background: var(--paper-2);
  }
  .bd.bad {
    background: var(--block-soft);
  }
  .bd.warn {
    background: var(--must-soft);
    color: #7a5600;
  }
  .bd.ok {
    background: var(--should-soft);
    color: var(--should);
  }
  .bd.sess {
    background: var(--ink);
    color: #fff;
  }

  .pbar {
    position: absolute;
    top: calc(50% - 12px);
    height: 24px;
    border-radius: 7px;
    background: color-mix(in srgb, var(--c) calc(30% - var(--f) * 18%), var(--card));
    border: 1.5px solid color-mix(in srgb, var(--c) 75%, transparent);
    opacity: calc(1 - var(--f) * 0.4);
    filter: blur(calc(max(var(--f) - 0.5, 0) * 2px));
    cursor: pointer;
    z-index: 2;
    transition: left 0.35s var(--ease), width 0.35s var(--ease), opacity 0.2s, filter 0.2s, box-shadow 0.15s;
    display: flex;
    align-items: center;
    overflow: visible;
  }
  .pbar.movable {
    cursor: grab;
  }
  .pbar.fuzzy {
    border-style: dashed;
  }
  .pbar.cutl {
    border-left-style: dotted;
    border-radius: 0 7px 7px 0;
  }
  .pbar.cutr {
    border-right-style: dotted;
    border-radius: 7px 0 0 7px;
  }
  /* an estimated end or start fades out: it is not a date anyone committed to */
  .pbar.fade-end {
    border-right-color: transparent;
    mask-image: linear-gradient(to right, #000 55%, transparent);
  }
  .pbar.fade-start {
    border-left-color: transparent;
    mask-image: linear-gradient(to left, #000 55%, transparent);
  }
  .pbar.estimate {
    border-style: dashed;
  }
  .pbar.conflict {
    box-shadow: 0 0 0 2px var(--block);
  }
  .pbar:hover,
  .prow.sel .pbar {
    filter: none;
    opacity: 1;
    box-shadow: 0 0 0 2px var(--ink);
  }
  .pbar.drag {
    transition: none;
    cursor: grabbing;
    box-shadow: 0 0 0 2px var(--beacon), 0 10px 24px -10px rgba(27, 36, 48, 0.5);
    z-index: 5;
  }
  .pbar.pending {
    box-shadow: 0 0 0 2px var(--beacon);
  }
  .dates {
    position: absolute;
    left: 0;
    bottom: calc(100% + 4px);
    background: var(--ink);
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 6px;
    white-space: nowrap;
  }
  .nodate {
    position: absolute;
    left: 8px;
    top: calc(50% - 12px);
    height: 24px;
    padding: 0 0.7rem;
    border-radius: 7px;
    border: 1.5px dashed var(--fog);
    background: transparent;
    color: var(--ink-3);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: grab;
    z-index: 2;
  }
  .nodate.dragging {
    opacity: 0.35;
  }
  .offchip {
    position: absolute;
    top: calc(50% - 11px);
    height: 22px;
    padding: 0 0.55rem;
    border-radius: 999px;
    border: 1.5px solid color-mix(in srgb, var(--c) 60%, transparent);
    background: var(--card);
    color: var(--ink-2);
    font-size: 0.72rem;
    font-weight: 700;
    z-index: 2;
  }
  .offchip.right {
    right: 0;
  }
  .offchip.left {
    left: 0;
  }

  .deps {
    position: absolute;
    top: 0;
    pointer-events: none;
    z-index: 3;
    overflow: visible;
  }
  .dep {
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 1.6;
    opacity: 0.55;
    transition: opacity 0.2s;
  }
  .dep.k-tight {
    stroke: var(--must);
    stroke-dasharray: 6 4;
  }
  .dep.k-loose {
    stroke: var(--ink-3);
    stroke-dasharray: 2 4;
    stroke-linecap: round;
    opacity: 0.4;
  }
  .dep.bad {
    stroke: var(--block);
    stroke-width: 2.2;
    opacity: 0.95;
  }
  .dep.dim {
    opacity: 0.06;
  }
  .dep.lit {
    opacity: 1;
    stroke-width: 2.4;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(24rem, 92vw);
    z-index: 20;
    background: var(--paper);
    border-left: 1.5px solid var(--line);
    box-shadow: -20px 0 40px -24px rgba(27, 36, 48, 0.4);
    padding: 1.2rem;
    overflow: auto;
    animation: slide 0.22s var(--ease);
  }
  @keyframes slide {
    from {
      transform: translateX(24px);
      opacity: 0;
    }
  }
  .close {
    position: absolute;
    right: 0.8rem;
    top: 0.8rem;
  }
  .findings,
  .inspect {
    display: grid;
    gap: 0.45rem;
  }
  .drawer h2 {
    font-size: 1.4rem;
    padding-right: 2rem;
  }
  .drawer h3 {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    font-weight: 800;
    margin-top: 0.8rem;
  }
  h3.bad {
    color: var(--block);
  }
  h3.warn {
    color: #7a5600;
  }
  h3.ok {
    color: var(--should);
  }
  .finding {
    display: grid;
    gap: 0.15rem;
    text-align: left;
    border: 0;
    background: var(--card);
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    font-size: 0.86rem;
    margin: 0;
  }
  .finding:hover {
    box-shadow: 0 0 0 1.5px var(--ink-3);
  }
  .small {
    font-size: 0.82rem;
  }
  .chips {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .inspect ul {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.9rem;
  }
  .ex {
    font-size: 0.92rem;
    color: var(--ink-2);
  }
  .link {
    border: 0;
    background: none;
    padding: 0;
    text-decoration: underline;
    font-weight: 600;
  }
  .toast {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    translate: -50% 0;
    z-index: 40;
    border: 0;
    background: var(--block);
    color: #fff;
    padding: 0.6rem 1rem;
    border-radius: 10px;
    font-weight: 650;
  }
  .err {
    padding: 2rem;
    color: var(--block);
  }
</style>
