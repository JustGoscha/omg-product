import { existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { ProductConfigT, RequestT } from "./schema.ts";
import {
  appendLog,
  claimRequest,
  clearHeartbeat,
  getRequest,
  listRequests,
  requeueStale,
  requestPrompt,
  fixPrompt,
  setRequestStatus,
  writeHeartbeat,
} from "./requests.ts";
import { loadWorkspace } from "./workspace.ts";
import { checkPrototype, prototypeTargets } from "./proto-check.ts";
import { BIN_DIR, SKILLS_DIR } from "./paths.ts";

// Builds live requests by starting a headless coding agent for each one, streaming
// what it does into the request's log, and checking the files when it exits.
// Runs inside `omgp serve` or as `omgp work`.

export type AgentConfig = NonNullable<ProductConfigT["agent"]>;
type Entry = Omit<RequestT["log"][number], "at">;

const omgpBin = BIN_DIR;
const skillsDir = SKILLS_DIR;

export function describeAgent(cfg: AgentConfig) {
  return cfg.preset ? `${cfg.preset}${cfg.model ? ` (${cfg.model})` : ""}` : (cfg.command ?? "agent");
}

export function invocation(cfg: AgentConfig, prompt: string): { cmd: string[]; stdin?: string; parse: "claude" | "lines" } {
  switch (cfg.preset) {
    case "claude":
      return {
        cmd: [
          "claude", "-p",
          "--output-format", "stream-json", "--verbose",
          "--permission-mode", "acceptEdits",
          "--allowedTools", "Read", "Edit", "Write", "Glob", "Grep", "Bash(omgp:*)",
          "--add-dir", skillsDir,
          ...(cfg.model ? ["--model", cfg.model] : []),
        ],
        stdin: prompt,
        parse: "claude",
      };
    case "codex":
      return { cmd: ["codex", "exec", "--full-auto", ...(cfg.model ? ["--model", cfg.model] : []), prompt], parse: "lines" };
    case "opencode":
      return { cmd: ["opencode", "run", ...(cfg.model ? ["--model", cfg.model] : []), prompt], parse: "lines" };
    case "pi":
      return { cmd: ["pi", "-p", prompt], parse: "lines" };
    default:
      return { cmd: ["sh", "-c", cfg.command ?? "false"], stdin: prompt, parse: "lines" };
  }
}

// ---------- turning agent output into progress lines ----------

const words = (locale: string) =>
  locale === "de"
    ? { read: "Liest", edit: "Bearbeitet", write: "Schreibt", run: "Führt aus", search: "Sucht", find: "Sucht Dateien", skill: "Nutzt Skill", plan: "Plant", check: "Prüft die Dateien" }
    : { read: "Reading", edit: "Editing", write: "Writing", run: "Running", search: "Searching for", find: "Looking for", skill: "Using skill", plan: "Planning", check: "Checking the files" };

function describeTool(name: string, input: Record<string, unknown>, locale: string): string {
  const w = words(locale);
  const file = (p: unknown) => (typeof p === "string" ? basename(p) : "");
  switch (name) {
    case "Read":
      return `${w.read} ${file(input.file_path)}`;
    case "Edit":
    case "MultiEdit":
      return `${w.edit} ${file(input.file_path)}`;
    case "Write":
      return `${w.write} ${file(input.file_path)}`;
    case "Grep":
      return `${w.search} “${String(input.pattern ?? "").slice(0, 40)}”`;
    case "Glob":
      return `${w.find} ${String(input.pattern ?? "")}`;
    case "Bash": {
      const cmd = String(input.command ?? "");
      if (/omgp\s+validate/.test(cmd)) return w.check;
      return typeof input.description === "string" && input.description ? input.description : `${w.run} ${cmd.slice(0, 60)}`;
    }
    case "Skill":
      return `${w.skill} ${String(input.skill ?? input.name ?? "")}`;
    case "TodoWrite": {
      const todos = (input.todos as { content: string; status: string }[] | undefined) ?? [];
      const now = todos.find((t) => t.status === "in_progress") ?? todos[0];
      return now ? `${w.plan}: ${now.content}` : w.plan;
    }
    default:
      return name;
  }
}

const sentence = (s: string, max = 180) => {
  const t = s.replace(/\s+/g, " ").trim();
  const cut = t.match(/^.{20,}?[.!?](\s|$)/)?.[0] ?? t;
  return cut.length > max ? cut.slice(0, max - 1) + "…" : cut;
};

export function parseClaudeLine(line: string, locale: string): Entry[] {
  let ev: Record<string, any>;
  try {
    ev = JSON.parse(line);
  } catch {
    return line.trim() ? [{ kind: "text", text: sentence(line) }] : [];
  }
  const out: Entry[] = [];
  if (ev.type === "assistant")
    for (const c of ev.message?.content ?? []) {
      if (c.type === "text" && c.text?.trim()) out.push({ kind: "text", text: sentence(c.text) });
      if (c.type === "tool_use") out.push({ kind: "tool", text: describeTool(c.name, c.input ?? {}, locale) });
    }
  if (ev.type === "result" && ev.subtype !== "success") out.push({ kind: "error", text: `agent stopped: ${ev.subtype}` });
  return out;
}

// ---------- the runner ----------

interface Running {
  proc: ReturnType<typeof Bun.spawn>;
  started: number;
  buffer: Entry[];
  stderr: string[];
}

export interface RunnerOptions {
  mode: "server" | "worker";
  onEntry?: (r: RequestT, e: Entry) => void;
  onFinish?: (r: RequestT) => void;
}

export class Runner {
  private running = new Map<string, Running>();
  private timers: ReturnType<typeof setInterval>[] = [];
  private startedAt = new Date().toISOString();

  constructor(
    private root: string,
    private cfg: AgentConfig,
    private locale: string,
    private opts: RunnerOptions,
  ) {}

  start() {
    requeueStale(this.root);
    this.beat();
    this.timers.push(setInterval(() => this.tick(), 700));
    this.timers.push(setInterval(() => this.beat(), 3000));
    this.timers.push(setInterval(() => this.flush(), 400));
    this.timers.push(setInterval(() => requeueStale(this.root), 30_000));
  }

  stop() {
    for (const t of this.timers) clearInterval(t);
    for (const [id, run] of this.running) {
      run.proc.kill();
      appendLog(this.root, id, [{ kind: "status", text: "worker stopped" }]);
      setRequestStatus(this.root, id, "open");
    }
    clearHeartbeat(this.root, process.pid);
  }

  private beat() {
    writeHeartbeat(this.root, {
      pid: process.pid,
      mode: this.opts.mode,
      agent: describeAgent(this.cfg),
      startedAt: this.startedAt,
      busy: [...this.running.keys()],
    });
  }

  private flush() {
    for (const [id, run] of this.running) {
      if (!run.buffer.length) continue;
      appendLog(this.root, id, run.buffer.splice(0));
    }
  }

  private tick() {
    // cancelled from the studio: stop the agent
    for (const [id, run] of this.running)
      if (getRequest(this.root, id)?.status === "cancelled") {
        run.proc.kill();
        this.running.delete(id);
      }
    if (this.running.size >= this.cfg.concurrency) return;
    const next = listRequests(this.root).find((r) => r.status === "open");
    if (next) this.run(next);
  }

  private async run(r: RequestT) {
    const claimed = claimRequest(this.root, r.id, { mode: this.opts.mode, pid: process.pid, agent: describeAgent(this.cfg) });
    if (!claimed) return;
    const run: Running = { proc: null as never, started: Date.now(), buffer: [], stderr: [] };
    this.running.set(r.id, run);
    const push = (e: Entry) => {
      run.buffer.push(e);
      this.opts.onEntry?.(claimed, e);
    };
    // the periodic flush only covers running requests; this one also works after exit
    const flushRun = () => run.buffer.length && appendLog(this.root, r.id, run.buffer.splice(0));
    const end = (status: "done" | "failed", note?: string) => {
      flushRun();
      this.running.delete(r.id);
      setRequestStatus(this.root, r.id, status, note);
      this.opts.onFinish?.(getRequest(this.root, r.id)!);
    };
    const de = this.locale === "de";

    let code = await this.exec(claimed, requestPrompt(claimed, "worker"), run, push);
    if (code === null) return end("failed", `could not start the agent. Is it installed and on PATH?`);
    const now = getRequest(this.root, r.id);
    // cancelled in the studio, or the agent already called `omgp done`
    if (now && now.status !== "working") {
      flushRun();
      this.running.delete(r.id);
      return this.finish(r.id);
    }
    if (code !== 0) {
      push({ kind: "error", text: run.stderr.at(-1) ?? `exit code ${code}` });
      return end("failed", run.stderr.slice(-3).join(" ") || `agent exited with code ${code}`);
    }

    // look at what it built: every prototype it changed has to render without errors.
    // If one doesn't, the agent gets one more round with the errors in hand.
    let broken = await this.brokenPrototypes(claimed, run.started);
    if (broken.length) {
      push({ kind: "status", text: de ? `Prototyp hat ${broken.length} Fehler, der Agent repariert sie` : `prototype has ${broken.length} problems, the agent fixes them` });
      for (const b of broken.slice(0, 3)) push({ kind: "error", text: b });
      code = await this.exec(claimed, fixPrompt(claimed, broken), run, push);
      broken = code === 0 ? await this.brokenPrototypes(claimed, run.started) : broken;
      if (broken.length) {
        for (const b of broken.slice(0, 3)) push({ kind: "error", text: b });
        return end("failed", `prototype still broken: ${broken[0]}`);
      }
      push({ kind: "status", text: de ? "Prototyp läuft wieder ohne Fehler" : "prototype renders without errors again" });
    }

    // and the files have to be valid
    const errors = loadWorkspace(this.root).issues.filter((i) => i.level === "error" && i.file.startsWith(`projects/${r.project}/`));
    if (errors.length) {
      for (const e of errors.slice(0, 3)) push({ kind: "error", text: `${e.file}: ${e.message}` });
      return end("failed", `${errors.length} validation errors left`);
    }
    push({ kind: "status", text: `done in ${Math.round((Date.now() - run.started) / 1000)}s` });
    end("done");
  }

  /** start the agent with a prompt, stream what it does, resolve with its exit code (null if it can't start) */
  private async exec(r: RequestT, prompt: string, run: Running, push: (e: Entry) => void): Promise<number | null> {
    const { cmd, stdin, parse } = invocation(this.cfg, prompt);
    push({ kind: "status", text: `${describeAgent(this.cfg)} started` });
    try {
      run.proc = Bun.spawn(cmd, {
        cwd: this.root,
        stdin: stdin ? new Blob([stdin]) : "ignore",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PATH: `${omgpBin}:${process.env.PATH}`, OMGP_DIR: this.root, OMGP_REQUEST: r.id },
      });
    } catch (e) {
      push({ kind: "error", text: `could not start ${cmd[0]}: ${(e as Error).message}` });
      return null;
    }
    const timeout = setTimeout(() => {
      push({ kind: "error", text: `timed out after ${this.cfg.timeout}s` });
      run.proc.kill();
    }, this.cfg.timeout * 1000);

    const lines = async (stream: ReadableStream<Uint8Array>, each: (l: string) => void) => {
      const dec = new TextDecoder();
      const reader = stream.getReader();
      let rest = "";
      for (;;) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        rest += dec.decode(chunk, { stream: true });
        const parts = rest.split("\n");
        rest = parts.pop()!;
        for (const l of parts) each(l);
      }
      if (rest) each(rest);
    };
    await Promise.all([
      lines(run.proc.stdout as ReadableStream<Uint8Array>, (l) => {
        if (parse === "claude") for (const e of parseClaudeLine(l, this.locale)) push(e);
        else if (l.trim()) push({ kind: "text", text: sentence(l, 200) });
      }),
      lines(run.proc.stderr as ReadableStream<Uint8Array>, (l) => {
        if (l.trim()) run.stderr.push(l.trim());
        run.stderr.splice(0, Math.max(0, run.stderr.length - 20));
      }),
    ]);
    const code = await run.proc.exited;
    clearTimeout(timeout);
    return code;
  }

  /** problems in the project's prototypes that changed since `since` */
  private async brokenPrototypes(r: RequestT, since: number): Promise<string[]> {
    const ws = loadWorkspace(this.root);
    const project = ws.projects.find((p) => p.id === r.project);
    if (!project) return [];
    const out: string[] = [];
    for (const t of prototypeTargets(ws, project)) {
      if (!existsSync(t.abs) || statSync(t.abs).mtimeMs < since) continue;
      const res = await checkPrototype(t.abs, t.states);
      for (const p of res.problems) out.push(`${t.rel}${p.state ? `#${p.state}` : ""} ${p.kind}: ${p.text}`);
    }
    return out;
  }

  private finish(id: string) {
    this.opts.onFinish?.(getRequest(this.root, id)!);
  }
}
