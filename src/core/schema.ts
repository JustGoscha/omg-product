import { z } from "zod";
import { checkpointValues, scaleValues, triageScales } from "./scales.ts";
import { reaches } from "./pulse.ts";

// The file format lives in skills/omgp/references/format.md. Keep both in sync.

const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._-]*$/i, "ids are kebab-case: letters, digits, - _ .");
const text = z.string();
const strList = z.array(z.coerce.string());
const timeValue = z.union([z.string(), z.number()]).transform(String);

export const levels = ["product", "ux", "tech", "business"] as const;
export const stages = [
  "idea",
  "exploring",
  "prototyping",
  "kickoff",
  "scoped",
  "building",
  "rollout",
  "measuring",
  "done",
  "paused",
  "dropped",
] as const;
export const sizes = ["xs", "s", "m", "l", "xl"] as const;
export { reaches } from "./pulse.ts";
export const triageValues = ["must", "should", "nice", "no"] as const;
export const phases = ["context", "problem", "solution", "decisions", "wrapup"] as const;

export const Participant = z.object({
  name: z.string(),
  role: z.string().optional(),
  kind: z.enum(["user", "decider", "tech", "expert", "facilitator"]).optional(),
});

// ---------- visuals ----------

const visualBase = { caption: text.optional(), height: z.number().optional() };
// a scenario played through a diagram: `at` is a state, node or message id (or a full element key)
const story = z.array(z.object({ at: z.coerce.string(), text })).optional();

export const StatesVisual = z.object({
  type: z.literal("states"),
  ...visualBase,
  story,
  direction: z.enum(["LR", "TB"]).optional(),
  states: z
    .array(
      z.object({
        id,
        label: text.optional(),
        kind: z.enum(["initial", "final", "normal"]).optional(),
        note: text.optional(),
      }),
    )
    .min(1),
  transitions: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: text.optional(),
        by: text.optional(),
        note: text.optional(),
      }),
    )
    .default([]),
});

export const TablesVisual = z.object({
  type: z.literal("tables"),
  ...visualBase,
  tables: z
    .array(
      z.object({
        name: z.string(),
        note: text.optional(),
        columns: z
          .array(
            z.object({
              name: z.string(),
              type: text.optional(),
              pk: z.boolean().optional(),
              fk: z.string().optional(),
              nullable: z.boolean().optional(),
              note: text.optional(),
            }),
          )
          .default([]),
      }),
    )
    .min(1),
});

export const flowKinds = ["system", "external", "ai", "human", "store"] as const;
export const FlowVisual = z.object({
  type: z.literal("flow"),
  ...visualBase,
  story,
  direction: z.enum(["LR", "TB"]).optional(),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: text.optional(),
        sub: text.optional(),
        kind: z.enum(flowKinds).optional(),
      }),
    )
    .min(1),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: text.optional(),
        dashed: z.boolean().optional(),
      }),
    )
    .default([]),
});

export const SequenceVisual = z.object({
  type: z.literal("sequence"),
  ...visualBase,
  story,
  actors: strList.min(2),
  messages: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: text.optional(),
        dashed: z.boolean().optional(),
        note: text.optional(),
      }),
    )
    .default([]),
});

const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const MatrixVisual = z.object({
  type: z.literal("matrix"),
  ...visualBase,
  columns: strList.min(1),
  rows: z.array(z.array(cell).min(1)).default([]),
  highlight: z.coerce.string().optional(),
});

export const PrototypeVisual = z.object({
  type: z.literal("prototype"),
  ...visualBase,
  src: z.string(),
  focus: z.string().optional(),
});
export const MermaidVisual = z.object({ type: z.literal("mermaid"), ...visualBase, code: z.string() });
export const ImageVisual = z.object({ type: z.literal("image"), ...visualBase, src: z.string(), alt: text.optional() });
export const HtmlVisual = z.object({ type: z.literal("html"), ...visualBase, html: z.string() });
export const MarkdownVisual = z.object({ type: z.literal("markdown"), ...visualBase, text: z.string() });

export const Visual = z.discriminatedUnion("type", [
  PrototypeVisual,
  StatesVisual,
  TablesVisual,
  FlowVisual,
  SequenceVisual,
  MatrixVisual,
  MermaidVisual,
  ImageVisual,
  HtmlVisual,
  MarkdownVisual,
]);

// ---------- session steps ----------

const stepBase = {
  id,
  title: text,
  body: text.optional(),
  visual: Visual.optional(),
  visuals: z.array(Visual).optional(),
  level: z.enum(levels).optional(),
  decider: z.union([z.string(), strList]).optional(),
  timing: z.enum(["now", "later"]).optional(),
  reversibility: z.enum(["one-way", "two-way"]).optional(),
  tags: strList.optional(),
  links: z.array(z.object({ label: text, url: z.string() })).optional(),
  notes: text.optional(),
  // the problem space of a decision, shown before the options
  problem: text.optional(), // what situation forces this decision, in plain words
  why: text.optional(), // why it matters: what goes wrong if we pick badly or don't decide
  facts: strList.optional(), // what is fixed: constraints, numbers, earlier decisions
};

export const Option = z.object({
  id,
  label: text,
  summary: text.optional(),
  body: text.optional(),
  visual: Visual.optional(),
  visuals: z.array(Visual).optional(),
  pros: strList.optional(),
  cons: strList.optional(),
  effort: z.coerce.string().optional(),
  consequence: text.optional(), // "if we pick this: …" in one line, for the people affected
  enables: strList.optional(),
  forecloses: strList.optional(),
  baseline: z.boolean().optional(),
  requestId: z.string().optional(),
});

export const SlideStep = z.object({ type: z.literal("slide"), ...stepBase });
export const TriageStep = z.object({ type: z.literal("triage"), ...stepBase, scale: z.enum(triageScales).default("priority") });
export { triageScales, scaleValues, checkpointValues };
export const ChoiceStep = z.object({
  type: z.literal("choice"),
  ...stepBase,
  options: z.array(Option).min(1),
  recommended: z.string().optional(),
  because: text.optional(),
  baseline: z.string().optional(),
  allowOther: z.boolean().default(true),
});
export const QuestionStep = z.object({
  type: z.literal("question"),
  ...stepBase,
  placeholder: text.optional(),
});
export const PollStep = z.object({
  type: z.literal("poll"),
  ...stepBase,
  answers: strList.min(2).default(["yes", "maybe", "no"]),
});

// the end of a part of the meeting: the room sees what it said and agrees, or says what's missing
export const CheckpointStep = z.object({
  type: z.literal("checkpoint"),
  ...stepBase,
  of: strList.optional(), // section ids to sum up; default: every step since the previous checkpoint
});

export const Step = z.discriminatedUnion("type", [SlideStep, TriageStep, ChoiceStep, QuestionStep, PollStep, CheckpointStep]);

export const SessionHeader = z.object({
  id,
  title: text,
  kind: z.enum(["exploration", "kickoff", "tech-review", "review", "rollout-review"]).default("kickoff"),
  status: z.enum(["draft", "planned", "live", "done"]).default("draft"),
  date: timeValue.optional(),
  duration: z.number().optional(),
  goal: text.optional(),
  participants: z.array(Participant).default([]),
});

export const Section = z.object({
  id,
  title: text,
  phase: z.enum(phases).default("decisions"),
  steps: z.array(z.unknown()).default([]),
});

// ---------- results ----------

export const StepResult = z.object({
  status: z.enum(["decided", "deferred", "escalated", "skipped"]).optional(),
  value: z.string().optional(),
  other: z
    .object({
      text: z.string().optional(),
      sketch: z.string().optional(),
      requestId: z.string().optional(),
    })
    .optional(),
  note: z.string().optional(),
  reason: z.string().optional(),
  votes: z.record(z.string(), z.string()).optional(),
  at: z.string().optional(),
});

export const Annotation = z.object({
  id: z.string(),
  step: z.string().optional(),
  src: z.string(),
  selector: z.string().optional(),
  label: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  kind: z.enum(["change", "question", "idea", "praise"]).default("change"),
  text: z.string(),
  author: z.string().optional(),
  at: z.string().optional(),
});

export const Results = z.object({
  session: z.string(),
  startedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  current: z.string().optional(),
  steps: z.record(z.string(), StepResult).default({}),
  annotations: z.array(Annotation).default([]),
});

// ---------- workspace files ----------

export const Stream = z.object({
  id,
  name: text,
  capacity: z.number().positive().default(1),
  color: z.string().optional(),
});

export const ProductConfig = z.object({
  name: text,
  locale: z.enum(["en", "de"]).default("en"),
  today: timeValue.optional(),
  brand: z.object({ css: z.string().optional(), notes: z.string().optional() }).optional(),
  roadmap: z.object({ streams: z.array(Stream).default([]) }).default({ streams: [] }),
  integrations: z.record(z.string(), z.unknown()).optional(),
  agent: z
    .object({
      preset: z.enum(["claude", "codex", "opencode", "pi"]).optional(),
      command: z.string().optional(),
      model: z.string().optional(),
      timeout: z.number().default(900),
      concurrency: z.number().int().min(1).max(4).default(1),
    })
    .optional(),
  // who this workspace is for and what counts, written by the omgp-onboard interview
  profile: z
    .object({
      kind: z.enum(["personal", "company"]).optional(),
      goals: strList.optional(),
      // a project only counts as done once it is this far out in the world; never: nothing is
      // ever done, after the build come launch, marketing, customers, improving
      doneMeans: z.enum([...reaches, "never"]).optional(),
      // at most this many projects in exploring … rollout at once
      focus: z.number().int().min(1).optional(),
      capacity: text.optional(),
    })
    .optional(),
  // the swipe deck: cards per round, whether people may keep going after a round, votes
  // without names, how far one day moves a rating
  pulse: z
    .object({
      daily: z.number().int().min(1).optional(),
      more: z.boolean().optional(),
      anonymous: z.boolean().optional(),
      k: z.number().positive().optional(),
    })
    .optional(),
});

// where a date comes from: copied from Linear, set by hand (roadmap drag), or an agent's estimate
const When = z.object({ start: timeValue.optional(), end: timeValue.optional(), from: z.enum(["linear", "manual", "estimate"]).optional() });
const Metric = z.object({
  name: text,
  baseline: z.coerce.string().optional(),
  target: z.coerce.string().optional(),
  current: z.coerce.string().optional(),
  source: z.unknown().optional(),
});
const LinearRef = z.object({ id: z.string().optional(), url: z.string().optional() });

export const Lighthouse = z.object({ id, name: text, when: timeValue.optional(), description: text.optional() });
export const Vision = z.object({
  northStar: text.optional(),
  lighthouses: z.array(Lighthouse).default([]),
});

export const Initiative = z.object({
  id,
  name: text,
  summary: text.optional(),
  status: z.enum(["planned", "active", "done", "dropped"]).default("active"),
  when: When.optional(),
  lighthouse: z.string().optional(),
  metric: Metric.optional(),
  color: z.string().optional(),
  linear: LinearRef.optional(),
});

export const depKinds = ["hard", "tight", "loose"] as const;
export const Project = z.object({
  id,
  name: text,
  summary: text.optional(),
  initiatives: strList.default([]),
  stage: z.enum(stages).default("idea"),
  priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
  reach: z.enum(reaches).optional(),
  // the next steps, most important first, at most 3: "Landing page", "Post in r/animation"
  next: z
    .union([text, z.array(z.coerce.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean).slice(0, 3))
    .optional(),
  size: z.enum(sizes).optional(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  stream: z.string().optional(),
  when: When.optional(),
  dependsOn: z
    .array(z.object({ on: z.string(), kind: z.enum(depKinds).default("loose"), note: text.optional() }))
    .default([]),
  owner: text.optional(),
  stakeholders: z.array(Participant).default([]),
  metrics: z.array(Metric).default([]),
  linear: LinearRef.optional(),
});

export const Request = z.object({
  id: z.string(),
  kind: z.enum(["option", "revise-option", "revise-step", "visual", "step", "prototype", "comment"]),
  project: z.string(),
  thread: z.string().optional(),
  threads: z.array(z.string()).optional(),
  session: z.string().optional(),
  step: z.string().optional(),
  option: z.string().optional(),
  text: z.string().default(""),
  sketch: z.string().optional(),
  author: z.string().optional(),
  status: z.enum(["open", "working", "done", "failed", "cancelled"]).default("open"),
  message: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  /** who works on it: the studio's worker, `omgp work`, or an agent that ran `omgp listen` */
  owner: z.object({ mode: z.enum(["server", "worker", "listen"]), pid: z.number().optional(), agent: z.string().optional() }).optional(),
  /** what the agent is doing, newest last */
  log: z
    .array(z.object({ at: z.string(), kind: z.enum(["text", "tool", "status", "error"]), text: z.string() }))
    .default([]),
});

// ---------- comments ----------
// Threads live in projects/<id>/comments.json (or comments.json at the root for
// initiatives and vision). A target says what the thread is about.

export const CommentTarget = z.discriminatedUnion("kind", [
  // a passage of a markdown file; `quote` is the anchor, `line` only a hint
  z.object({ kind: z.literal("text"), file: z.string(), quote: z.string(), line: z.number().optional(), section: z.string().optional() }),
  // a session step, or one option of it
  z.object({ kind: z.literal("step"), file: z.string(), step: z.string(), option: z.string().optional(), field: z.string().optional() }),
  // one element of a diagram: state:<id>, transition:<from>><to>, table:<name>, column:<table>.<col>,
  // node:<id>, edge:<from>><to>, message:<n>, actor:<name>, cell:<row>|<column>
  z.object({ kind: z.literal("element"), file: z.string(), step: z.string().optional(), option: z.string().optional(), element: z.string(), label: z.string().optional() }),
  // a spot in an HTML prototype
  z.object({ kind: z.literal("prototype"), file: z.string(), selector: z.string().optional(), label: z.string().optional(), x: z.number().optional(), y: z.number().optional() }),
  // the file as a whole
  z.object({ kind: z.literal("file"), file: z.string() }),
]);

export const Comment = z.object({
  id: z.string(),
  author: z.string().default("someone"),
  text: z.string(),
  at: z.string(),
  agent: z.boolean().optional(),
});

export const Thread = z.object({
  id: z.string(),
  target: CommentTarget,
  status: z.enum(["open", "resolved"]).default("open"),
  comments: z.array(Comment).min(1),
  createdAt: z.string(),
  resolvedAt: z.string().optional(),
  resolvedBy: z.string().optional(),
});

export const CommentsFile = z.object({ threads: z.array(Thread).default([]) });

export type CommentTargetT = z.infer<typeof CommentTarget>;
export type CommentT = z.infer<typeof Comment>;
export type ThreadT = z.infer<typeof Thread>;

export type ParticipantT = z.infer<typeof Participant>;
export type VisualT = z.infer<typeof Visual>;
export type StatesVisualT = z.infer<typeof StatesVisual>;
export type TablesVisualT = z.infer<typeof TablesVisual>;
export type FlowVisualT = z.infer<typeof FlowVisual>;
export type SequenceVisualT = z.infer<typeof SequenceVisual>;
export type MatrixVisualT = z.infer<typeof MatrixVisual>;
export type OptionT = z.infer<typeof Option>;
export type StepT = z.infer<typeof Step>;
export type ChoiceStepT = z.infer<typeof ChoiceStep>;
export type PollStepT = z.infer<typeof PollStep>;
export type CheckpointStepT = z.infer<typeof CheckpointStep>;
export type StepResultT = z.infer<typeof StepResult>;
export type AnnotationT = z.infer<typeof Annotation>;
export type ResultsT = z.infer<typeof Results>;
export type ProductConfigT = z.infer<typeof ProductConfig>;
export type StreamT = z.infer<typeof Stream>;
export type VisionT = z.infer<typeof Vision>;
export type LighthouseT = z.infer<typeof Lighthouse>;
export type InitiativeT = z.infer<typeof Initiative>;
export type ProjectT = z.infer<typeof Project>;
export type RequestT = z.infer<typeof Request>;
export type SessionHeaderT = z.infer<typeof SessionHeader>;
