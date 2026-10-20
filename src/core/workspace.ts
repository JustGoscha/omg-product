import { existsSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import {
  ChoiceStep,
  Initiative,
  Option,
  PollStep,
  CheckpointStep,
  ProductConfig,
  Project,
  QuestionStep,
  Results,
  Section,
  SessionHeader,
  SlideStep,
  Step,
  TriageStep,
  Vision,
  type InitiativeT,
  type LighthouseT,
  type ProductConfigT,
  type ProjectT,
  type ResultsT,
  type SessionHeaderT,
  type StepT,
  type VisualT,
} from "./schema.ts";
import { htmlMeta, isDir, listDir, markdownSections, parseYaml, readText, splitFrontmatter } from "./files.ts";
import { parseTime, resolveSpan, todayIso, type Span } from "./time.ts";
import { analyze, type Analysis } from "./analysis.ts";

export interface Issue {
  file: string;
  level: "error" | "warning";
  message: string;
}

export interface SessionSummary {
  id: string;
  file: string;
  title: string;
  kind: string;
  status: string;
  date?: string;
  steps: number;
  answered: number;
}

export interface PrototypeInfo {
  file: string; // relative to the project folder
  title: string;
  description?: string;
}

export interface ProjectInfo extends ProjectT {
  file: string;
  dir: string;
  body: string;
  sections: Record<string, string>;
  span: Span | null;
  prototypes: PrototypeInfo[];
  sessions: SessionSummary[];
  handoff: boolean;
}

export interface InitiativeInfo extends InitiativeT {
  file: string;
  body: string;
  span: Span | null;
}

export interface LighthouseInfo extends LighthouseT {
  span: Span | null;
}

export interface Workspace {
  root: string;
  config: ProductConfigT;
  today: string;
  vision: { northStar?: string; lighthouses: LighthouseInfo[]; body: string } | null;
  initiatives: InitiativeInfo[];
  projects: ProjectInfo[];
  issues: Issue[];
  analysis: Analysis;
  rules: string | null; // rules.md: how this team wants omgp to work, learned from corrections
}

export interface BrokenStep {
  type: "broken";
  id: string;
  title: string;
  errors: string[];
}

export type LoadedStep = StepT | BrokenStep;

export interface LoadedSession extends SessionHeaderT {
  project: string;
  file: string;
  sections: { id: string; title: string; phase: string; steps: LoadedStep[] }[];
  issues: Issue[];
}

const fmtZod = (err: z.ZodError) =>
  err.issues.map((i) => `${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`);

function readMarkdownEntity<T extends z.ZodTypeAny>(
  root: string,
  rel: string,
  schema: T,
  issues: Issue[],
): { data: z.infer<T>; body: string } | null {
  let src: string;
  try {
    src = readText(join(root, rel));
  } catch {
    return null;
  }
  const { yaml, body } = splitFrontmatter(src);
  let raw: unknown;
  try {
    raw = parseYaml(yaml) ?? {};
  } catch (e) {
    issues.push({ file: rel, level: "error", message: `frontmatter is not valid YAML: ${(e as Error).message}` });
    return null;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    for (const m of fmtZod(parsed.error)) issues.push({ file: rel, level: "error", message: m });
    return null;
  }
  return { data: parsed.data, body };
}

function readYamlFile(root: string, rel: string, issues: Issue[]): unknown {
  try {
    return parseYaml(readText(join(root, rel)));
  } catch (e) {
    issues.push({ file: rel, level: "error", message: `not valid YAML: ${(e as Error).message}` });
    return undefined;
  }
}

// ---------- sessions ----------

const stepSchemas: Record<string, z.ZodObject<any>> = {
  slide: SlideStep,
  triage: TriageStep,
  choice: ChoiceStep,
  question: QuestionStep,
  poll: PollStep,
  checkpoint: CheckpointStep,
};

function unknownKeys(raw: unknown, schema: z.ZodObject<any>): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const known = new Set(Object.keys(schema.shape));
  return Object.keys(raw).filter((k) => !known.has(k));
}

export function loadSession(root: string, project: string, sessionId: string): LoadedSession | null {
  const rel = `projects/${project}/sessions/${sessionId}.yaml`;
  if (!existsSync(join(root, rel))) return null;
  const issues: Issue[] = [];
  const raw = readYamlFile(root, rel, issues) as Record<string, unknown> | undefined;
  const header = SessionHeader.safeParse(raw ?? {});
  if (!header.success) for (const m of fmtZod(header.error)) issues.push({ file: rel, level: "error", message: m });
  const head: SessionHeaderT = header.success
    ? header.data
    : { id: sessionId, title: sessionId, kind: "kickoff", status: "draft", participants: [] };
  if (head.id !== sessionId) issues.push({ file: rel, level: "warning", message: `id "${head.id}" does not match file name "${sessionId}"` });

  const sections: LoadedSession["sections"] = [];
  const seen = new Set<string>();
  const rawSections = Array.isArray(raw?.sections) ? raw.sections : [];
  if (!rawSections.length) issues.push({ file: rel, level: "warning", message: "session has no sections" });
  rawSections.forEach((rs: unknown, si: number) => {
    const sec = Section.safeParse(rs);
    if (!sec.success) {
      for (const m of fmtZod(sec.error)) issues.push({ file: rel, level: "error", message: `sections.${si}.${m}` });
      return;
    }
    const steps: LoadedStep[] = [];
    sec.data.steps.forEach((rawStep, i) => {
      const where = `sections.${si}(${sec.data.id}).steps.${i}`;
      const r = rawStep as Record<string, unknown>;
      const parsed = Step.safeParse(rawStep);
      const sid = typeof r?.id === "string" ? r.id : `${sec.data.id}-${i}`;
      if (!parsed.success) {
        const errors = fmtZod(parsed.error);
        for (const m of errors) issues.push({ file: rel, level: "error", message: `${where}: ${m}` });
        steps.push({ type: "broken", id: sid, title: typeof r?.title === "string" ? r.title : sid, errors });
        return;
      }
      const step = parsed.data;
      if (seen.has(step.id)) issues.push({ file: rel, level: "error", message: `${where}: duplicate step id "${step.id}"` });
      seen.add(step.id);
      const schema = stepSchemas[step.type];
      for (const k of unknownKeys(r, schema))
        issues.push({ file: rel, level: "warning", message: `${where}(${step.id}): unknown field "${k}"` });
      if (step.type === "choice") {
        const ids = new Set(step.options.map((o) => o.id));
        if (ids.size !== step.options.length) issues.push({ file: rel, level: "error", message: `${where}(${step.id}): duplicate option ids` });
        if (step.recommended && !ids.has(step.recommended))
          issues.push({ file: rel, level: "error", message: `${where}(${step.id}): recommended "${step.recommended}" is not an option id` });
        if (step.baseline && !ids.has(step.baseline))
          issues.push({ file: rel, level: "error", message: `${where}(${step.id}): baseline "${step.baseline}" is not an option id` });
        (r.options as unknown[]).forEach((o, oi) => {
          for (const k of unknownKeys(o, Option))
            issues.push({ file: rel, level: "warning", message: `${where}(${step.id}).options.${oi}: unknown field "${k}"` });
        });
      }
      if (step.decider && head.participants.length) {
        const known = new Set(head.participants.flatMap((p) => [p.name, p.kind ?? ""]));
        for (const d of ([] as string[]).concat(step.decider))
          if (!known.has(d)) issues.push({ file: rel, level: "warning", message: `${where}(${step.id}): decider "${d}" is not a participant name or kind` });
      }
      if (step.type === "choice" && step.recommended && !step.because)
        issues.push({ file: rel, level: "warning", message: `${where}(${step.id}): recommended without a one-line "because"` });
      for (const v of stepVisuals(step)) checkVisual(root, project, rel, `${where}(${step.id})`, v, issues);
      steps.push(step);
    });
    sections.push({ id: sec.data.id, title: sec.data.title, phase: sec.data.phase, steps });
  });
  const sectionIds = new Set(sections.map((s) => s.id));
  for (const sec of sections)
    for (const step of sec.steps)
      if (step.type === "checkpoint")
        for (const ref of step.of ?? [])
          if (!sectionIds.has(ref)) issues.push({ file: rel, level: "error", message: `sections.${sec.id}(${step.id}): "of" names unknown section "${ref}"` });

  return { ...head, project, file: rel, sections, issues };
}

export function stepVisuals(step: StepT): VisualT[] {
  const out: VisualT[] = [];
  if (step.visual) out.push(step.visual);
  if (step.visuals) out.push(...step.visuals);
  if (step.type === "choice")
    for (const o of step.options) {
      if (o.visual) out.push(o.visual);
      if (o.visuals) out.push(...o.visuals);
    }
  return out;
}

function checkVisual(root: string, project: string, file: string, where: string, v: VisualT, issues: Issue[]) {
  const warn = (message: string) => issues.push({ file, level: "warning", message: `${where}: ${message}` });
  if (v.type === "prototype" || v.type === "image") {
    if (/^https?:\/\//.test(v.src)) return;
    const path = v.src.split(/[#?]/)[0];
    const full = join(root, "projects", project, path);
    if (!existsSync(full)) return warn(`${v.type} "${path}" not found in projects/${project}/`);
    // a deep link to a state the prototype doesn't know silently shows its start page
    const hash = v.type === "prototype" ? v.src.split("#")[1] : undefined;
    if (hash) {
      const html = readText(full);
      const first = hash.split(/[/+?&]/)[0];
      if (first && !html.includes(first)) warn(`state "#${hash}" does not appear in ${path}`);
    }
    // simple focus selectors can be checked against the file; others are resolved in the browser
    const m = v.type === "prototype" && v.focus?.match(/^\[(data-[\w-]+)=["']?([^"'\]]+)["']?\]$|^#([\w-]+)$/);
    if (m) {
      const html = readText(full);
      // the value in quotes also counts: prototypes often build these attributes in script
      const name = m[3] ?? m[2];
      const found = (m[3] ? new RegExp(`id=["']${m[3]}["']`).test(html) : html.includes(`${m[1]}="${m[2]}"`) || html.includes(`${m[1]}='${m[2]}'`) || html.includes(`${m[1]}=${m[2]}`))
        || html.includes(`"${name}"`) || html.includes(`'${name}'`);
      if (!found) warn(`focus "${v.focus}" does not appear in ${path} (\`omgp check\` looks in the rendered page)`);
    }
  }
  if (v.type === "states") {
    const ids = new Set(v.states.map((s) => s.id));
    for (const t of v.transitions) {
      if (!ids.has(t.from)) warn(`transition from unknown state "${t.from}"`);
      if (!ids.has(t.to)) warn(`transition to unknown state "${t.to}"`);
    }
  }
  if (v.type === "flow") {
    const ids = new Set(v.nodes.map((n) => n.id));
    for (const e of v.edges) {
      if (!ids.has(e.from)) warn(`edge from unknown node "${e.from}"`);
      if (!ids.has(e.to)) warn(`edge to unknown node "${e.to}"`);
    }
  }
  if (v.type === "sequence") {
    const ids = new Set(v.actors);
    for (const m of v.messages) {
      if (!ids.has(m.from)) warn(`message from unknown actor "${m.from}"`);
      if (!ids.has(m.to)) warn(`message to unknown actor "${m.to}"`);
    }
  }
  if (v.type === "matrix") {
    for (const row of v.rows)
      if (row.length !== v.columns.length + 1)
        warn(`matrix row "${row[0]}" has ${row.length - 1} cells, expected ${v.columns.length}`);
  }
}

export function loadResults(root: string, project: string, sessionId: string): ResultsT {
  const path = join(root, `projects/${project}/sessions/${sessionId}.results.json`);
  const empty: ResultsT = { session: sessionId, steps: {}, annotations: [] };
  if (!existsSync(path)) return empty;
  try {
    const parsed = Results.safeParse(JSON.parse(readText(path)));
    return parsed.success ? parsed.data : empty;
  } catch {
    return empty;
  }
}

export function allSteps(s: LoadedSession): LoadedStep[] {
  return s.sections.flatMap((sec) => sec.steps);
}

function summarizeSession(root: string, project: string, id: string): SessionSummary | null {
  const s = loadSession(root, project, id);
  if (!s) return null;
  const results = loadResults(root, project, id);
  const steps = allSteps(s).filter((x) => x.type !== "slide" && x.type !== "broken");
  const answered = steps.filter((x) => {
    const r = results.steps[x.id];
    return r && (r.status || r.value);
  }).length;
  return {
    id,
    file: s.file,
    title: s.title,
    kind: s.kind,
    status: s.status,
    date: s.date,
    steps: steps.length,
    answered,
  };
}

// ---------- workspace ----------

export function loadWorkspace(root: string): Workspace {
  const issues: Issue[] = [];

  const rawConfig = readYamlFile(root, "product.yaml", issues);
  const cfg = ProductConfig.safeParse(rawConfig ?? {});
  if (!cfg.success) for (const m of fmtZod(cfg.error)) issues.push({ file: "product.yaml", level: "error", message: m });
  const config: ProductConfigT = cfg.success
    ? cfg.data
    : { name: "Untitled product", locale: "en", roadmap: { streams: [] } };
  const today = todayIso(config.today);

  let vision: Workspace["vision"] = null;
  if (existsSync(join(root, "vision.md"))) {
    const v = readMarkdownEntity(root, "vision.md", Vision, issues);
    if (v)
      vision = {
        northStar: v.data.northStar,
        body: v.body,
        lighthouses: v.data.lighthouses.map((l) => ({ ...l, span: rangeSpan(l.when) })),
      };
  }

  const initiatives: InitiativeInfo[] = [];
  for (const f of listDir(join(root, "initiatives")).filter((f) => f.endsWith(".md"))) {
    const rel = `initiatives/${f}`;
    const e = readMarkdownEntity(root, rel, Initiative, issues);
    if (!e) continue;
    if (e.data.id !== f.replace(/\.md$/, ""))
      issues.push({ file: rel, level: "warning", message: `id "${e.data.id}" does not match file name` });
    initiatives.push({ ...e.data, file: rel, body: e.body, span: resolveSpan(e.data.when) });
  }

  const projects: ProjectInfo[] = [];
  for (const dir of listDir(join(root, "projects"))) {
    const pdir = join(root, "projects", dir);
    if (!isDir(pdir)) continue;
    const rel = `projects/${dir}/project.md`;
    if (!existsSync(join(root, rel))) {
      issues.push({ file: `projects/${dir}`, level: "warning", message: "folder has no project.md" });
      continue;
    }
    const e = readMarkdownEntity(root, rel, Project, issues);
    if (!e) continue;
    if (e.data.id !== dir) issues.push({ file: rel, level: "error", message: `id "${e.data.id}" must match folder name "${dir}"` });
    for (const t of [e.data.when?.start, e.data.when?.end])
      if (t && !parseTime(t)) issues.push({ file: rel, level: "error", message: `"${t}" is not a time value (2026-10-26 · 2026-11 · 2026-Q1 · 2027-H1 · 2027)` });

    const prototypes: PrototypeInfo[] = listDir(join(pdir, "prototypes"))
      .filter((f) => f.endsWith(".html"))
      .map((f) => {
        const meta = htmlMeta(readText(join(pdir, "prototypes", f)));
        return { file: `prototypes/${f}`, title: meta.title || f.replace(/\.html$/, ""), description: meta.description };
      });

    const sessions = listDir(join(pdir, "sessions"))
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .map((f) => summarizeSession(root, dir, f.replace(/\.ya?ml$/, "")))
      .filter((s): s is SessionSummary => !!s)
      .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));

    projects.push({
      ...e.data,
      file: rel,
      dir: `projects/${dir}`,
      body: e.body,
      sections: markdownSections(e.body),
      span: resolveSpan(e.data.when, e.data.size),
      prototypes,
      sessions,
      handoff: existsSync(join(pdir, "handoff.md")),
    });
  }

  // references
  const initiativeIds = new Set(initiatives.map((i) => i.id));
  const projectIds = new Set(projects.map((p) => p.id));
  const streamIds = new Set(config.roadmap.streams.map((s) => s.id));
  const lighthouseIds = new Set(vision?.lighthouses.map((l) => l.id) ?? []);
  for (const i of initiatives)
    if (i.lighthouse && !lighthouseIds.has(i.lighthouse))
      issues.push({ file: i.file, level: "error", message: `lighthouse "${i.lighthouse}" is not in vision.md` });
  for (const p of projects) {
    for (const i of p.initiatives)
      if (!initiativeIds.has(i)) issues.push({ file: p.file, level: "error", message: `initiative "${i}" does not exist` });
    if (p.stream && streamIds.size && !streamIds.has(p.stream))
      issues.push({ file: p.file, level: "error", message: `stream "${p.stream}" is not in product.yaml roadmap.streams` });
    for (const d of p.dependsOn) {
      if (!projectIds.has(d.on)) issues.push({ file: p.file, level: "error", message: `dependsOn "${d.on}" is not a project` });
      if (d.on === p.id) issues.push({ file: p.file, level: "error", message: "project depends on itself" });
    }
    const past = !["idea", "dropped"].includes(p.stage);
    if (past)
      for (const need of ["problem", "metric"])
        if (!Object.keys(p.sections).some((k) => k.startsWith(need)))
          issues.push({ file: p.file, level: "warning", message: `missing "## ${need[0].toUpperCase()}${need.slice(1)}" section` });
    for (const s of p.sessions) {
      const full = loadSession(root, p.id, s.id);
      if (full) issues.push(...full.issues);
    }
  }

  const analysis = analyze({ today, config, projects });
  const rulesFile = join(root, "rules.md");
  const rules = existsSync(rulesFile) ? readText(rulesFile) : null;
  return { root, config, today, vision, initiatives, projects, issues, analysis, rules };
}

function rangeSpan(v?: string): Span | null {
  const r = parseTime(v);
  return r ? { ...r } : null;
}
