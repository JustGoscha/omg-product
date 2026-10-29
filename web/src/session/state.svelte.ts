import { api } from "../lib/api";
import { store } from "../lib/store.svelte";
import { applyOp } from "../../../src/core/ops";
import { checkpointScope } from "../../../src/core/checkpoint";
import type { LoadedSession, LoadedStep, RequestT, ResultOp, ResultsT, StepResultT } from "../lib/types";

export interface FlatStep {
  step: LoadedStep;
  section: { id: string; title: string; phase: string };
  index: number;
}

const AUTHOR_KEY = "omgp:author";
const readAuthor = () => {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? "";
  } catch {
    return "";
  }
};

export class SessionState {
  project: string;
  id: string;
  session = $state<LoadedSession | null>(null);
  results = $state<ResultsT>({ session: "", steps: {}, annotations: [] });
  requests = $state<RequestT[]>([]);
  error = $state<string | null>(null);
  author = $state(readAuthor());
  steps = $derived<FlatStep[]>(
    (this.session?.sections ?? []).flatMap((sec) =>
      sec.steps.map((step) => ({ step, section: { id: sec.id, title: sec.title, phase: sec.phase }, index: 0 })),
    ).map((s, i) => ({ ...s, index: i })),
  );
  private off: (() => void) | null = null;

  constructor(project: string, id: string) {
    this.project = project;
    this.id = id;
  }

  async load() {
    try {
      const d = await api.session(this.project, this.id);
      this.session = d.session;
      this.results = d.results;
      this.requests = d.requests;
      this.error = null;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  start() {
    this.load();
    // editors and agents often write via a temp file, so match folders, not exact names
    const dirs = [`projects/${this.project}/sessions/`, `projects/${this.project}/prototypes/`, ".omgp/requests"];
    this.off = store.on((ev) => {
      if (ev.type === "results" && ev.project === this.project && ev.session === this.id) this.results = ev.results as ResultsT;
      if (ev.type === "change" && (ev.paths ?? []).some((p) => dirs.some((d) => p.startsWith(d)))) this.load();
      if (ev.type === "request") this.load();
    });
  }

  stop() {
    this.off?.();
  }

  result(stepId: string): StepResultT | undefined {
    return this.results.steps[stepId];
  }

  async act(op: ResultOp) {
    this.results = applyOp(this.results, op);
    try {
      this.results = await api.op(this.project, this.id, op);
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  setAuthor(name: string) {
    this.author = name;
    try {
      localStorage.setItem(AUTHOR_KEY, name);
    } catch {
      /* private mode */
    }
  }

  /** the steps a checkpoint sums up */
  covered(at: number): FlatStep[] {
    return checkpointScope(this.steps.map((s) => ({ step: s.step, section: s.section.id })), at).map((i) => this.steps[i]);
  }

  answered(step: LoadedStep) {
    const r = this.results.steps[step.id];
    return !!r && (!!r.status || !!r.value);
  }
}
