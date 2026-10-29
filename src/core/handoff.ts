import { join } from "node:path";
import type { AnnotationT, ChoiceStepT, ResultsT, StepT } from "./schema.ts";
import { writeText } from "./files.ts";
import { allSteps, loadResults, loadSession, type LoadedSession, type ProjectInfo, type Workspace } from "./workspace.ts";
import { labels } from "./i18n.ts";
import { scaleValues, triageScales, type TriageScale } from "./scales.ts";
import { anchorThreads, loadComments } from "./comments.ts";
import { targetLabel } from "./comment-ops.ts";

// Compiles meeting results into a handoff for implementing agents. Deterministic:
// the same files always give the same document, so agents can enrich it safely.

const q = (s?: string) => (s ?? "").trim();
const bullet = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

function optionLabel(step: ChoiceStepT, id?: string) {
  if (!id) return "";
  const o = step.options.find((o) => o.id === id);
  return o ? o.label : id;
}

export function compileHandoff(ws: Workspace, project: ProjectInfo, sessionIds?: string[]) {
  const t = labels(ws.config.locale);
  const ids = sessionIds?.length ? sessionIds : project.sessions.map((s) => s.id);
  const sessions = ids
    .map((id) => ({ s: loadSession(ws.root, project.id, id), r: loadResults(ws.root, project.id, id) }))
    .filter((x): x is { s: LoadedSession; r: ResultsT } => !!x.s);

  const out: string[] = [];
  out.push(`# ${t.handoff}: ${project.name}`, "");
  out.push(
    `> ${t.handoffGenerated} ${sessions.map((x) => `\`${x.s.file}\``).join(", ") || "—"}. ${t.handoffEnrich}`,
    "",
  );

  for (const key of ["problem", "for whom", "metric", "solution", "done when", "out of scope"]) {
    const k = Object.keys(project.sections).find((s) => s.startsWith(key) || s.startsWith(t.sectionAlias[key] ?? "\u0000"));
    if (k && project.sections[k]) out.push(`## ${k[0].toUpperCase()}${k.slice(1)}`, "", project.sections[k], "");
  }
  if (project.metrics.length)
    out.push(
      `## ${t.metrics}`,
      "",
      bullet(project.metrics.map((m) => `${m.name}${m.baseline ? ` — ${t.baseline} ${m.baseline}` : ""}${m.target ? `, ${t.target} ${m.target}` : ""}`)),
      "",
    );

  const decided: string[] = [];
  const deferred: string[] = [];
  const open: string[] = [];
  // triage results per scale: scope for features, pain for problems, …
  const triaged = new Map<TriageScale, Map<string, string[]>>();
  const answers: string[] = [];
  const agreed: string[] = []; // checkpoints: where the room agrees, with its concerns
  const polls: string[] = [];
  const annotations: { a: AnnotationT; session: string }[] = [];

  for (const { s, r } of sessions) {
    for (const a of r.annotations) annotations.push({ a, session: s.id });
    for (const step of allSteps(s)) {
      if (step.type === "broken" || step.type === "slide") continue;
      const res = r.steps[step.id];
      const note = q(res?.note) ? `\n  ${t.note}: ${q(res?.note)}` : "";
      if (res?.status === "deferred" || res?.status === "escalated") {
        deferred.push(
          `**${step.title}** — ${res.status === "deferred" ? t.deferred : t.escalated}${q(res.reason) ? `: ${q(res.reason)}` : ""}${note}`,
        );
        continue;
      }
      if (step.type === "choice") {
        if (!res?.value) {
          open.push(`**${step.title}**${step.recommended ? ` (${t.recommended}: ${optionLabel(step, step.recommended)})` : ""}`);
          continue;
        }
        decided.push(renderDecision(step, res.value, res, t, decided.length + 1));
      } else if (step.type === "triage") {
        const scale = (step.scale ?? "priority") as TriageScale;
        if (res?.value && scaleValues[scale].includes(res.value)) {
          if (!triaged.has(scale)) triaged.set(scale, new Map(scaleValues[scale].map((v) => [v, [] as string[]])));
          triaged.get(scale)!.get(res.value)!.push(`${step.title}${q(res.note) ? ` — ${q(res.note)}` : ""}`);
        } else open.push(`**${step.title}** (${t.notTriaged})`);
      } else if (step.type === "question") {
        if (q(res?.value)) answers.push(`**${step.title}**\n  ${q(res?.value).replace(/\n/g, "\n  ")}${note}`);
        else open.push(`**${step.title}**`);
      } else if (step.type === "checkpoint") {
        const v = res?.value as keyof typeof t.agree.values | undefined;
        if (v) agreed.push(`**${step.title}** → ${t.agree.values[v]?.[0] ?? v}${q(res?.note) ? `\n  ${q(res?.note)}` : ""}${tallyCheckpoint(res?.votes, t)}`);
        else open.push(`**${step.title}**`);
      } else if (step.type === "poll") {
        const votes = Object.entries(res?.votes ?? {});
        const tally = votes.length ? tallyVotes(step.answers, votes.map(([, v]) => v)) : "";
        if (res?.value || votes.length)
          polls.push(`**${step.title}** → ${res?.value ?? "—"}${tally ? ` (${tally})` : ""}${note}`);
        else open.push(`**${step.title}**`);
      }
    }
  }

  if (agreed.length) out.push(`## ${t.agree.title}`, "", bullet(agreed), "");
  if (decided.length) out.push(`## ${t.decisions}`, "", decided.join("\n\n"), "");
  for (const scale of triageScales) {
    const buckets = triaged.get(scale);
    if (!buckets) continue;
    out.push(`## ${t.scaleTitles[scale]}`, "");
    for (const [v, items] of buckets) if (items.length) out.push(`### ${t.scales[scale][v]?.[0] ?? v}`, "", bullet(items), "");
  }
  if (polls.length) out.push(`## ${t.polls}`, "", bullet(polls), "");
  if (answers.length) out.push(`## ${t.answers}`, "", bullet(answers), "");
  if (annotations.length) {
    out.push(`## ${t.changeRequests}`, "");
    for (const { a } of annotations)
      out.push(`- [${t.annotationKinds[a.kind]}] \`${a.src}\`${a.label ? ` · ${a.label}` : ""}${a.author ? ` · ${a.author}` : ""}: ${a.text}`);
    out.push("");
  }
  // review comments people left in the studio that nobody resolved yet
  const threads = anchorThreads(ws.root, project.id, loadComments(ws.root, project.id)).filter((th) => th.status === "open");
  if (threads.length)
    out.push(
      `## ${t.cm.comments}`,
      "",
      bullet(
        threads.map((th) => {
          const where = th.target.kind === "text" ? { ...th.target, line: th.line ?? undefined } : th.target;
          const [first, ...rest] = th.comments;
          return `\`${targetLabel(where)}\` · ${first.author}: ${first.text}${rest.length ? ` (+${rest.length})` : ""}${th.outdated ? " _(outdated)_" : ""}`;
        }),
      ),
      "",
    );
  if (deferred.length) out.push(`## ${t.deferredTitle}`, "", bullet(deferred), "");
  if (open.length) out.push(`## ${t.openTitle}`, "", bullet(open), "");
  if (project.prototypes.length)
    out.push(
      `## ${t.prototypes}`,
      "",
      bullet(project.prototypes.map((p) => `[${p.title}](${p.file})${p.description ? ` — ${p.description}` : ""}`)),
      "",
    );
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function tallyCheckpoint(votes: Record<string, string> | undefined, t: ReturnType<typeof labels>) {
  const all = Object.entries(votes ?? {});
  if (!all.length) return "";
  return ` (${all.map(([who, v]) => `${who}: ${t.agree.values[v as keyof typeof t.agree.values]?.[0] ?? v}`).join(", ")})`;
}

function tallyVotes(answers: string[], values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...answers, ...[...counts.keys()].filter((k) => !answers.includes(k))]
    .filter((a) => counts.get(a))
    .map((a) => `${a} ${counts.get(a)}`)
    .join(" · ");
}

function renderDecision(
  step: ChoiceStepT,
  value: string,
  res: NonNullable<ResultsT["steps"][string]>,
  t: ReturnType<typeof labels>,
  n: number,
) {
  const lines: string[] = [];
  const meta = [step.level, step.reversibility, step.timing === "later" ? t.timingLater : ""].filter(Boolean).join(" · ");
  lines.push(`### D${n}. ${step.title}${meta ? ` _(${meta})_` : ""}`);
  if (step.problem) lines.push(`${t.ctx.problem}: ${q(step.problem)}`);
  if (step.why) lines.push(`${t.ctx.why}: ${q(step.why)}`);
  if (value === "other") {
    lines.push(`**${t.decision}:** ${t.ownOption}: ${q(res.other?.text) || "—"}`);
    if (res.other?.sketch) lines.push(`${t.sketch}: ${res.other.sketch}`);
  } else {
    const o = step.options.find((o) => o.id === value);
    lines.push(`**${t.decision}:** ${o?.label ?? value}${o?.summary ? ` — ${o.summary}` : ""}`);
    if (o?.consequence) lines.push(`${t.ctx.consequence}: ${o.consequence}`);
    if (o?.body) lines.push(o.body.trim());
    if (o?.enables?.length) lines.push(`${t.enables}: ${o.enables.join("; ")}`);
    if (o?.forecloses?.length) lines.push(`${t.forecloses}: ${o.forecloses.join("; ")}`);
    if (o?.effort) lines.push(`${t.effort}: ${o.effort}`);
  }
  if (step.recommended && step.recommended !== value) lines.push(`_${t.recommendedWas}: ${optionLabel(step, step.recommended)}_`);
  if (q(res.note)) lines.push(`${t.note}: ${q(res.note)}`);
  const votes = Object.entries(res.votes ?? {});
  if (votes.length) lines.push(`${t.votes}: ${votes.map(([who, v]) => `${who} → ${optionLabel(step, v)}`).join(", ")}`);
  const rejected = step.options.filter((o) => o.id !== value && !o.baseline);
  if (rejected.length)
    lines.push(
      `${t.rejected}: ${rejected.map((o) => `${o.label}${o.cons?.length ? ` (${o.cons.join("; ")})` : ""}`).join(" · ")}`,
    );
  return lines.join("\n");
}

export function writeHandoff(ws: Workspace, project: ProjectInfo, sessionIds?: string[]) {
  const md = compileHandoff(ws, project, sessionIds);
  writeText(join(ws.root, project.dir, "handoff.md"), md);
  return md;
}

export type { StepT };
