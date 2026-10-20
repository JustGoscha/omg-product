import { appendFileSync, cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { PKG_ROOT, REPO, SKILLS_DIR, version } from "../core/paths.ts";
import { join, resolve } from "node:path";
import { findRoot, readText, writeText, yamlStringify } from "../core/files.ts";
import { todayIso } from "../core/time.ts";
import { allSteps, loadResults, loadSession, loadWorkspace, type Workspace } from "../core/workspace.ts";
import { writeHandoff } from "../core/handoff.ts";
import { updateResults } from "../core/results.ts";
import { anchorThreads, loadComments, ROOT_SCOPE, updateComments } from "../core/comments.ts";
import { newId, targetLabel } from "../core/comment-ops.ts";
import { appendLog, claimRequest, clearHeartbeat, listRequests, readHeartbeat, requeueStale, requestPrompt, setRequestStatus, getRequest, writeHeartbeat } from "../core/requests.ts";
import { Runner, describeAgent } from "../core/agent-runner.ts";
import { linearPull } from "./linear.ts";
import { checkPrototype, formatCheck, prototypeTargets } from "../core/proto-check.ts";
import * as tpl from "./templates.ts";
import { exportStatic } from "./export.ts";
import { loadPulse, pulseProjects } from "../core/pulse-files.ts";
import { localDate, nextTasks, rank } from "../core/pulse.ts";

const HELP = `omgp — product harness: roadmap, prototypes and decision sessions as files

  omgp init [dir] [--name "Product"]   scaffold a workspace
  omgp serve [--port 4747] [--host 0.0.0.0]   studio with live reload
             [--hosted] [--key k] [--data dir]
                                       for a team: read-only but the pulse, only via the link /k/<key>,
                                       duels written to <dir>/pulse (env OMGP_HOSTED, OMGP_KEY, OMGP_DATA, PORT)
  omgp validate [--json]               check files and references (exit 1 on errors)
  omgp check <project> [prototype] [--shots] [--state a,b]
                                       open the project's prototypes in headless Chrome, visit every #state its
                                       sessions use, report script errors, blank pages and missing focus targets;
                                       --shots saves a PNG per state to .omgp/shots to look at (exit 1 on problems)
  omgp roadmap [--json]                conflicts, bottlenecks, overload, delegatable work
  omgp pulse [--voter name] [--json]   what people swiped as most important (Elo, studio: #/pulse)
  omgp next [--json]                   what to do now: the first open task of the most important projects
  omgp status [project]                project and session progress
  omgp new project <id> --name "…" [--initiative id] [--stage idea]
  omgp new session <project> <id> [--title "…"] [--kind kickoff]
  omgp handoff <project> [--session id]…   compile results into handoff.md
  omgp work [--agent claude|codex|opencode|pi|"<cmd>"] [--model m]
                                       keep running: start an agent for every live request, show what it does
  omgp listen [--timeout 600]          for agents in a chat: wait for one request, claim it, print it, exit
  omgp progress <request-id> "…"       report what you're doing on a claimed request
  omgp done <request-id> [--fail "why"]
  omgp note <project> <session> <step> "text"   append to a step's meeting notes
  omgp comments [project] [--all]      open comment threads with what they point at
  omgp reply <thread> "text"           answer a thread as the agent
  omgp resolve <thread>                close a thread
  omgp requests                        list live requests
  omgp linear pull [--dry-run] [--from file.json] [--backlog]
                                       import initiatives + projects and sync dates (LINEAR_API_KEY, or a JSON
                                       file an agent wrote from a Linear MCP); dates marked from: manual stay
  omgp learn "rule" [--why "…"] [--upstream]
                                       add a team rule to rules.md (agents follow it over the skills);
                                       --upstream prints a proposal for the shared omgp skills instead
  omgp skills install [--target claude|agents|opencode|pi] [--dir path] [--link]
  omgp export [--out dir]              static read-only studio of the workspace (a demo for any static host)
  omgp update                          update a git checkout of omgp (the Claude Code plugin updates itself)
  omgp version

Workspace: nearest folder with product.yaml, or --dir <path>, or OMGP_DIR.`;

type Flags = Record<string, string | boolean | string[]>;

function parseArgs(argv: string[]) {
  const pos: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, inline] = a.slice(2).split("=", 2);
      const val = inline ?? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true);
      const prev = flags[k];
      flags[k] = prev === undefined ? val : ([] as string[]).concat(prev as string, val as string);
    } else pos.push(a);
  }
  return { pos, flags };
}

const str = (v: Flags[string] | undefined) => (Array.isArray(v) ? v[v.length - 1] : typeof v === "string" ? v : undefined);
const list = (v: Flags[string] | undefined) => (v === undefined || v === true ? [] : ([] as string[]).concat(v as string));

function rootOrDie(flags: Flags): string {
  const dir = str(flags.dir) ?? process.env.OMGP_DIR;
  const root = dir ? (existsSync(join(resolve(dir), "product.yaml")) ? resolve(dir) : null) : findRoot();
  if (!root) {
    console.error(`No product.yaml found${dir ? ` in ${dir}` : " here or above"}. Run \`omgp init\` or pass --dir.`);
    process.exit(1);
  }
  return root;
}

const c = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function main() {
  const { pos, flags } = parseArgs(process.argv.slice(2));
  const cmd = pos[0];

  if (!cmd || flags.help || cmd === "help") return console.log(HELP);

  if (cmd === "init") {
    const dir = resolve(pos[1] ?? ".");
    if (existsSync(join(dir, "product.yaml"))) return console.log(`${dir} already has a product.yaml`);
    const name = str(flags.name) ?? "My Product";
    writeText(join(dir, "product.yaml"), tpl.productYaml(name));
    writeText(join(dir, "vision.md"), tpl.visionMd);
    writeText(join(dir, "rules.md"), tpl.rulesMd);
    writeText(join(dir, "brand/tokens.css"), tpl.brandCss);
    writeText(join(dir, "brand/BRAND.md"), tpl.brandMd);
    writeText(join(dir, "initiatives/first-initiative.md"), tpl.initiativeMd("first-initiative", "First initiative"));
    writeText(join(dir, "projects/first-project/project.md"), tpl.projectMd("first-project", "First project", "first-initiative"));
    writeText(join(dir, "projects/first-project/sessions/kickoff.yaml"), tpl.sessionYaml("kickoff", "First project — kickoff", "kickoff"));
    console.log(`Workspace created in ${dir}\nNext: omgp skills install, then omgp serve`);
    return;
  }

  if (cmd === "version") return console.log(`omgp ${version()}`);

  if (cmd === "update") {
    // as a Claude Code plugin, Claude Code itself keeps omgp current
    if (!existsSync(join(PKG_ROOT, ".git")))
      return console.log(`omgp ${version()} is installed as a plugin: it updates itself (Claude Code: /plugin → omgp → Update now to do it right away).`);
    for (const cmd of [["git", "pull", "--ff-only"], ["bun", "install"], ["bun", "run", "build"]]) {
      console.log(`$ ${cmd.join(" ")}`);
      const r = Bun.spawnSync(cmd, { cwd: PKG_ROOT, stdout: "inherit", stderr: "inherit" });
      if (r.exitCode !== 0) process.exit(r.exitCode ?? 1);
    }
    return console.log(`omgp ${version()}. Skills you copied with \`omgp skills install\` need a re-run; linked ones (--link) are current.`);
  }

  if (cmd === "skills") {
    if (pos[1] !== "install") return console.log("usage: omgp skills install [--target claude|agents|opencode|pi] [--dir path]");
    const targets = list(flags.target).length ? list(flags.target) : ["claude", "agents"];
    const base = resolve(str(flags.dir) ?? process.cwd());
    const src = SKILLS_DIR;
    const dest: Record<string, string> = { claude: ".claude/skills", agents: ".agents/skills", opencode: ".opencode/skills", pi: ".pi/skills" };
    for (const t of targets) {
      if (!dest[t]) {
        console.error(`unknown target ${t}`);
        continue;
      }
      const to = join(base, dest[t]);
      mkdirSync(to, { recursive: true });
      for (const skill of new Bun.Glob("*/SKILL.md").scanSync(src)) {
        const name = skill.split("/")[0];
        rmSync(join(to, name), { recursive: true, force: true });
        // --link keeps installed skills in sync with this checkout
        if (flags.link) symlinkSync(join(src, name), join(to, name), "dir");
        else cpSync(join(src, name), join(to, name), { recursive: true });
      }
      console.log(`skills ${flags.link ? "linked" : "copied"} → ${to}`);
    }
    return;
  }

  const root = rootOrDie(flags);

  if (cmd === "serve") {
    const { serve } = await import("../server/server.ts");
    const env = process.env;
    const hosted = !!flags.hosted || !!env.OMGP_HOSTED;
    serve({
      root,
      port: Number(str(flags.port) ?? env.OMGP_PORT ?? env.PORT ?? 4747),
      host: str(flags.host) ?? (hosted ? "0.0.0.0" : "127.0.0.1"),
      hosted,
      key: str(flags.key) ?? env.OMGP_KEY ?? undefined,
      data: str(flags.data) ?? env.OMGP_DATA ?? undefined,
    });
    return;
  }

  if (cmd === "learn") {
    const rule = pos.slice(1).join(" ").trim();
    if (!rule) return console.error('usage: omgp learn "rule" [--why "…"] [--upstream]');
    const why = str(flags.why);
    if (flags.upstream) {
      // a proposal for everyone who uses omgp: a person reviews and posts it; never company data
      console.log(`Propose this for the shared omgp skills. Check it holds no company names or data, then open\nhttps://github.com/${REPO}/issues/new and paste:\n`);
      console.log(`Title: Rule: ${rule}\n\n${rule}${why ? `\n\nWhy: ${why}` : ""}\n\n(omgp ${version()})`);
      return;
    }
    const file = join(root, "rules.md");
    if (!existsSync(file)) writeText(file, tpl.rulesMd);
    const text = readText(file);
    appendFileSync(file, `${text.endsWith("\n") ? "" : "\n"}- ${rule}${why ? ` (${why})` : ""} · ${todayIso()}\n`);
    return console.log(`rules.md: ${rule}`);
  }

  const ws = loadWorkspace(root);

  if (cmd === "validate") {
    if (flags.json) return console.log(JSON.stringify(ws.issues, null, 2));
    const errors = ws.issues.filter((i) => i.level === "error");
    const warnings = ws.issues.filter((i) => i.level === "warning");
    for (const i of ws.issues) console.log(`${i.level === "error" ? c.red("error") : c.yellow("warn ")} ${i.file}: ${i.message}`);
    const sessions = ws.projects.reduce((n, p) => n + p.sessions.length, 0);
    console.log(
      `${errors.length ? c.red(`${errors.length} errors`) : c.green("0 errors")}, ${warnings.length} warnings · ${ws.initiatives.length} initiatives, ${ws.projects.length} projects, ${sessions} sessions`,
    );
    process.exit(errors.length ? 1 : 0);
  }

  if (cmd === "check") {
    const project = ws.projects.find((p) => p.id === pos[1]);
    if (!project) return console.error(`usage: omgp check <project> [prototype] [--shots]${pos[1] ? `\nno project "${pos[1]}"` : ""}`);
    const targets = prototypeTargets(ws, project, pos[2]);
    if (!targets.length) return console.log(`${project.id}: no prototypes${pos[2] ? ` matching "${pos[2]}"` : ""}`);
    const extra = list(flags.state).flatMap((s) => s.split(",")).filter(Boolean);
    let bad = 0;
    for (const t of targets) {
      const states = [...t.states, ...extra.filter((h) => !t.states.some((s) => s.hash === h)).map((hash) => ({ hash }))];
      const res = await checkPrototype(t.abs, states, { shots: flags.shots ? join(root, ".omgp", "shots") : undefined });
      bad += res.problems.length;
      for (const l of formatCheck(res, `projects/${project.id}/${t.rel}`)) console.log(l);
    }
    process.exit(bad ? 1 : 0);
  }

  if (cmd === "export") {
    const out = resolve(str(flags.out) ?? "omgp-export");
    const r = exportStatic(root, out);
    return console.log(`static read-only studio in ${r.outDir} (${r.projects} projects, ${r.sessions} sessions). Serve the folder with any static host.`);
  }

  if (cmd === "roadmap") return printRoadmap(ws, !!flags.json);
  if (cmd === "pulse") return printPulse(root, ws, str(flags.voter), !!flags.json);
  if (cmd === "next") return printNext(root, ws, !!flags.json);
  if (cmd === "status") return printStatus(ws, pos[1]);

  if (cmd === "new") {
    const what = pos[1];
    if (what === "project") {
      const id = pos[2];
      if (!id) return console.error("usage: omgp new project <id> --name \"…\"");
      const file = join(root, "projects", id, "project.md");
      if (existsSync(file)) return console.error(`${file} exists`);
      writeText(file, tpl.projectMd(id, str(flags.name) ?? id, str(flags.initiative), str(flags.stage)));
      return console.log(`created projects/${id}/project.md`);
    }
    if (what === "session") {
      const [, , project, id] = pos;
      if (!project || !id) return console.error("usage: omgp new session <project> <id>");
      if (!ws.projects.some((p) => p.id === project)) return console.error(`no project ${project}`);
      const file = join(root, "projects", project, "sessions", `${id}.yaml`);
      if (existsSync(file)) return console.error(`${file} exists`);
      writeText(file, tpl.sessionYaml(id, str(flags.title) ?? `${project} — ${id}`, str(flags.kind) ?? "kickoff"));
      return console.log(`created projects/${project}/sessions/${id}.yaml`);
    }
    return console.error("usage: omgp new project|session …");
  }

  if (cmd === "handoff") {
    const p = ws.projects.find((p) => p.id === pos[1]);
    if (!p) return console.error(`usage: omgp handoff <project>   (projects: ${ws.projects.map((p) => p.id).join(", ")})`);
    writeHandoff(ws, p, list(flags.session));
    return console.log(`wrote ${p.dir}/handoff.md`);
  }

  if (cmd === "note") {
    const [, project, session, step, ...words] = pos;
    const text = words.join(" ").trim();
    if (!project || !session || !step || !text) return console.error('usage: omgp note <project> <session> <step> "text"');
    const s = loadSession(root, project, session);
    if (!s || !allSteps(s).some((x) => x.id === step)) return console.error(`no step ${step} in ${project}/${session}`);
    const prev = loadResults(root, project, session).steps[step]?.note;
    updateResults(root, project, session, { op: "step", step, patch: { note: prev ? `${prev}\n${text}` : text } });
    return console.log(`note added to ${step}`);
  }

  if (cmd === "comments") {
    const scopes = pos[1] ? [pos[1]] : [ROOT_SCOPE, ...ws.projects.map((p) => p.id)];
    let n = 0;
    for (const scope of scopes) {
      for (const t of anchorThreads(root, scope, loadComments(root, scope))) {
        if (t.status !== "open" && !flags.all) continue;
        n++;
        const where = t.target.kind === "text" ? { ...t.target, line: t.line ?? undefined } : t.target;
        console.log(`\n${c.bold(t.id)} ${c.dim(scope === ROOT_SCOPE ? "(root)" : scope)} ${t.status === "resolved" ? c.green("resolved") : ""}${t.outdated ? c.yellow(" outdated: the quoted text changed") : ""}`);
        console.log(`  on ${targetLabel(where)}`);
        for (const cm of t.comments) console.log(`  ${cm.agent ? c.dim("agent") : c.bold(cm.author)}: ${cm.text.replace(/\n/g, "\n    ")}`);
      }
    }
    if (!n) console.log("no open comments");
    return;
  }

  if (cmd === "reply" || cmd === "resolve") {
    const id = pos[1];
    const found = [ROOT_SCOPE, ...ws.projects.map((p) => p.id)].find((scope) => loadComments(root, scope).threads.some((t) => t.id === id));
    if (!id || !found) return console.error(`usage: omgp ${cmd} <thread>${cmd === "reply" ? ' "text"' : ""}  (see omgp comments)`);
    if (cmd === "reply") {
      const text = pos.slice(2).join(" ").trim();
      if (!text) return console.error('usage: omgp reply <thread> "text"');
      updateComments(root, found, { op: "reply", thread: id, id: newId("c"), text, author: str(flags.as) ?? "agent", agent: true });
    } else updateComments(root, found, { op: "resolve", thread: id, by: str(flags.as) ?? "agent" });
    return console.log(`${id} → ${cmd === "reply" ? "replied" : "resolved"}`);
  }

  if (cmd === "requests") {
    for (const r of listRequests(root))
      console.log(`${r.status.padEnd(8)} ${r.id}  ${r.kind} ${r.project}/${r.session ?? ""} ${r.step ?? ""}  ${c.dim(r.text.slice(0, 60))}`);
    return;
  }

  if (cmd === "listen") {
    const timeout = Number(str(flags.timeout) ?? 600) * 1000;
    const until = Date.now() + timeout;
    const started = new Date().toISOString();
    const hb = readHeartbeat(root);
    if (hb?.alive && hb.mode !== "listen")
      console.error(c.yellow(`note: ${hb.mode === "server" ? "the studio" : "omgp work"} already builds requests with ${hb.agent}; this would take one away from it.`));
    console.error(c.dim(`waiting for one live request (timeout ${timeout / 1000}s). This claims it and exits, so the agent that ran it can do the work.`));
    console.error(c.dim(`To keep building requests in the background, run \`omgp work\` instead.`));
    requeueStale(root);
    while (Date.now() < until) {
      writeHeartbeat(root, { pid: process.pid, mode: "listen", agent: "an agent chat", startedAt: started, busy: [] });
      const open = listRequests(root).find((r) => r.status === "open");
      const claimed = open && claimRequest(root, open.id, { mode: "listen", agent: "agent chat (omgp listen)" });
      if (claimed) {
        appendLog(root, claimed.id, [{ kind: "status", text: "claimed by an agent chat (omgp listen)" }]);
        clearHeartbeat(root, process.pid);
        console.log(JSON.stringify({ ...claimed, log: undefined }, null, 2));
        console.log("\n" + requestPrompt(claimed, "listen"));
        return;
      }
      await Bun.sleep(400);
    }
    clearHeartbeat(root, process.pid);
    console.error("no request arrived");
    process.exit(2);
  }

  if (cmd === "progress") {
    const id = pos[1];
    const text = pos.slice(2).join(" ").trim();
    if (!id || !text || !getRequest(root, id)) return console.error('usage: omgp progress <request-id> "what you are doing"');
    appendLog(root, id, [{ kind: "text", text }]);
    return;
  }

  if (cmd === "work") {
    const preset = str(flags.agent);
    const base = ws.config.agent ?? { timeout: 900, concurrency: 1 };
    const presets = ["claude", "codex", "opencode", "pi"] as const;
    const cfg = {
      ...base,
      ...(preset ? (presets.includes(preset as never) ? { preset: preset as (typeof presets)[number], command: undefined } : { preset: undefined, command: preset }) : {}),
      ...(str(flags.model) ? { model: str(flags.model) } : {}),
    };
    if (!cfg.preset && !cfg.command) cfg.preset = "claude";
    const hb = readHeartbeat(root);
    if (hb?.alive && hb.mode !== "listen") {
      console.error(`${hb.mode === "server" ? "The studio" : "Another omgp work"} (pid ${hb.pid}) already builds requests with ${hb.agent}. Stop it first, or remove agent from product.yaml.`);
      process.exit(1);
    }
    const kindColor = { tool: c.dim, text: (s: string) => s, status: c.green, error: c.red } as const;
    const runner = new Runner(root, cfg, ws.config.locale, {
      mode: "worker",
      onEntry: (r, e) => console.log(`${c.dim(new Date().toLocaleTimeString())} ${c.bold(r.step ?? r.kind)} ${kindColor[e.kind](e.text)}`),
      onFinish: (r) => console.log(`${r.status === "done" ? c.green("✓") : c.red("✗")} ${r.id} ${r.status}${r.message ? `: ${r.message}` : ""}`),
    });
    runner.start();
    console.log(`${c.bold("omgp work")} · ${describeAgent(cfg)} · ${root}\nWaiting for requests from the studio. Ctrl+C to stop.`);
    const stop = () => (runner.stop(), process.exit(0));
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    await new Promise(() => {});
  }

  if (cmd === "done") {
    const id = pos[1];
    if (!id || !getRequest(root, id)) return console.error("usage: omgp done <request-id> [--fail \"why\"]");
    const fail = str(flags.fail);
    setRequestStatus(root, id, fail ? "failed" : "done", fail);
    return console.log(`${id} → ${fail ? "failed" : "done"}`);
  }

  if (cmd === "linear") {
    if (pos[1] !== "pull") return console.error("usage: omgp linear pull [--dry-run] [--from linear.json] [--backlog]");
    return linearPull(ws, { dryRun: !!flags["dry-run"], from: str(flags.from), backlog: !!flags.backlog });
  }

  console.error(`unknown command ${cmd}\n\n${HELP}`);
  process.exit(1);
}

function printRoadmap(ws: Workspace, asJson: boolean) {
  const a = ws.analysis;
  if (asJson) return console.log(JSON.stringify(a, null, 2));
  const name = (id: string) => ws.projects.find((p) => p.id === id)?.name ?? id;
  const scheduled = ws.projects.filter((p) => p.span && !["done", "dropped"].includes(p.stage)).sort((x, y) => x.span!.start.localeCompare(y.span!.start));
  console.log(c.bold(`Roadmap · ${ws.config.name} · today ${ws.today}`));
  for (const p of scheduled)
    console.log(
      `  ${p.span!.start} → ${p.span!.end}${p.span!.resolution !== "day" ? c.dim(` (${p.span!.resolution})`) : ""}  ${p.name}  ${c.dim(`${p.stage} · ${p.stream ?? "no stream"} · ${p.size ?? "?"} · ${p.confidence}`)}`,
    );
  const backlog = ws.projects.filter((p) => !p.span && !["done", "dropped"].includes(p.stage));
  if (backlog.length) console.log(c.dim(`  backlog: ${backlog.map((p) => p.name).join(", ")}`));
  const section = (title: string, lines: string[]) => {
    if (!lines.length) return;
    console.log(`\n${c.bold(title)}`);
    for (const l of lines) console.log(`  ${l}`);
  };
  section("Conflicts", a.conflicts.map((x) => c.red(x.message)));
  section("Cycles", a.cycles.map((cy) => c.red(cy.map(name).join(" → "))));
  section("Bottlenecks (others wait on these)", a.bottlenecks.map((b) => `${name(b.project)} ← ${b.dependents.map(name).join(", ")}`));
  section("Overloaded streams", a.overload.map((o) => `${o.stream} ${o.from}…${o.to}: load ${o.peak} > capacity ${o.capacity} (${o.projects.map(name).join(", ")})`));
  section("High priority, not scheduled", a.unscheduled.map(name));
  section("Can be handed to one person (no hard/tight links)", a.delegatable.map(name));
}

function printNext(root: string, ws: Workspace, asJson: boolean) {
  // only from the focus: the top profile.focus projects (default 3) that were in a duel
  const ranking = rank(loadPulse(root), pulseProjects(ws), { today: localDate(), k: ws.config.pulse?.k })
    .filter((r) => r.wins + r.losses > 0)
    .slice(0, ws.config.profile?.focus ?? 3)
    .map((r) => r.id);
  const tasks = nextTasks(ranking, ws.projects, 3);
  if (asJson) return console.log(JSON.stringify(tasks.map((x) => ({ ...x, project: ws.projects.find((p) => p.id === x.id)?.name })), null, 2));
  if (!tasks.length) return console.log("No next tasks yet. Finish a Pulse round: it asks the top 3 projects for theirs.");
  tasks.forEach((x, i) => {
    const name = ws.projects.find((p) => p.id === x.id)?.name ?? x.id;
    console.log(i === 0 ? `${c.bold("Do next:")} ${x.task}  ${c.dim(`— ${name}, #${x.place} in the Pulse`)}` : c.dim(`   then:  ${x.task}  — ${name}, #${x.place}`));
  });
}

function printPulse(root: string, ws: Workspace, voter: string | undefined, asJson: boolean) {
  const days = loadPulse(root);
  const ranked = rank(days, pulseProjects(ws), { today: localDate(), voter, k: ws.config.pulse?.k });
  const people = new Set(days.map((d) => d.voter)).size;
  const duels = days.reduce((n, d) => n + d.duels.length, 0);
  if (asJson) return console.log(JSON.stringify({ people, duels, ranked }, null, 2));
  console.log(c.bold(`Pulse${voter ? ` (${voter})` : ""}`) + c.dim(`  ${people} ${people === 1 ? "person" : "people"}, ${duels} duels`));
  ranked.forEach((r, i) => {
    const p = ws.projects.find((p) => p.id === r.id)!;
    const delta = r.delta > 0 ? c.green(`▲${r.delta}`.padEnd(5)) : r.delta < 0 ? c.red(`▼${-r.delta}`.padEnd(5)) : c.dim("·".padEnd(5));
    console.log(`${String(i + 1).padStart(3)}. ${String(r.rating).padStart(4)} ${delta} ${p.name}${r.split ? c.yellow("  ⚡ split") : ""}  ${c.dim(`${r.wins}–${r.losses}`)}`);
  });
}

function printStatus(ws: Workspace, projectId?: string) {
  if (!projectId) {
    for (const p of ws.projects)
      console.log(`${p.id.padEnd(36)} ${p.stage.padEnd(12)} ${p.sessions.map((s) => `${s.id} ${s.answered}/${s.steps}`).join(", ")}`);
    return;
  }
  const p = ws.projects.find((p) => p.id === projectId);
  if (!p) return console.error(`no project ${projectId}`);
  console.log(c.bold(`${p.name}`) + c.dim(`  ${p.stage} · ${p.priority} · ${p.size ?? "?"} · ${p.span ? `${p.span.start} → ${p.span.end}` : "no date"}`));
  if (p.dependsOn.length) console.log(`depends on: ${p.dependsOn.map((d) => `${d.on} (${d.kind})`).join(", ")}`);
  console.log(`prototypes: ${p.prototypes.map((x) => x.file).join(", ") || "—"}`);
  for (const s of p.sessions) {
    const full = loadSession(ws.root, p.id, s.id)!;
    const res = loadResults(ws.root, p.id, s.id);
    console.log(`\nsession ${s.id} (${s.kind}, ${s.status}${s.date ? `, ${s.date}` : ""}): ${s.answered}/${s.steps} answered`);
    for (const st of allSteps(full)) {
      if (st.type === "slide") continue;
      const r = res.steps[st.id];
      const v = r?.status && r.status !== "decided" ? r.status : r?.value ?? "";
      console.log(`  ${(v ? c.green("✓") : "·")} ${st.type.padEnd(8)} ${st.id.padEnd(28)} ${v ? c.dim(String(v).slice(0, 50)) : ""}`);
    }
    if (res.annotations.length) console.log(`  ${res.annotations.length} annotations`);
  }
  const reqs = listRequests(ws.root).filter((r) => r.project === p.id && r.status !== "done");
  if (reqs.length) console.log(`\nopen requests: ${reqs.map((r) => `${r.id} (${r.status})`).join(", ")}`);
  if (p.handoff) console.log(`\nhandoff: ${p.dir}/handoff.md`);
}

export { yamlStringify };
main();
