import { watch, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ANNOTATE_JS, WEB_DIST } from "../core/paths.ts";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { loadResults, loadSession, loadWorkspace, type Workspace } from "../core/workspace.ts";
import { updateResults, type ResultOp } from "../core/results.ts";
import { writeHandoff } from "../core/handoff.ts";
import { updateFrontmatter } from "../core/files.ts";
import { createRequest, listRequests, requestPrompt, setRequestStatus, getRequest, readHeartbeat, appendLog } from "../core/requests.ts";
import { Runner, describeAgent } from "../core/agent-runner.ts";
import type { RequestT } from "../core/schema.ts";
import { anchorThreads, EditConflict, loadComments, replaceBody, replaceSection, ROOT_SCOPE, scopeDir, updateComments } from "../core/comments.ts";
import { patchStep } from "../core/session-edit.ts";
import type { CommentOp } from "../core/comment-ops.ts";
import { loadPulse, savePulseVote } from "../core/pulse-files.ts";

const annotateJs = () => readFileSync(ANNOTATE_JS, "utf8");
const webDist = WEB_DIST;

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".md": "text/markdown; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".webm": "audio/webm",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

/** A prototype with the studio's annotate layer (spotlight, pins, picking), as served for ?omgp=1. */
export function withAnnotate(html: string, src = "/__omgp/annotate.js") {
  const tag = `<script src="${src}"></script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${tag}</body>`) : html + tag;
}

function safeJoin(root: string, rel: string) {
  const p = normalize(join(root, decodeURIComponent(rel)));
  return p === root || p.startsWith(root + sep) ? p : null;
}

export interface ServeOptions {
  root: string;
  port: number;
  host: string;
}

export function serve({ root, port, host }: ServeOptions) {
  root = resolve(root);
  let cache: Workspace | null = null;
  const workspace = () => (cache ??= loadWorkspace(root));

  // --- live updates
  const clients = new Set<ReadableStreamDefaultController<string>>();
  const send = (event: unknown) => {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    for (const c of clients) {
      try {
        c.enqueue(line);
      } catch {
        clients.delete(c);
      }
    }
  };
  let pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  watch(root, { recursive: true }, (_event, file) => {
    if (!file) return;
    const f = String(file).split(sep).join("/");
    if (f.includes("node_modules") || f.split("/").includes(".git")) return;
    // atomic writes (temp file + rename) are only reported under the temp name
    pending.add(f.replace(/\.\d+\.tmp$/, "").replace(/\.tmp[.\w-]*$/, ""));
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const paths = [...pending];
      pending = new Set();
      if (paths.some((p) => !p.startsWith(".omgp/"))) cache = null;
      send({ type: "change", paths });
    }, 120);
  });

  // --- agent: build live requests in this process unless `omgp work` runs elsewhere
  let runner: Runner | null = null;
  const agentCfg = workspace().config.agent;
  if (agentCfg && (agentCfg.preset || agentCfg.command)) {
    const hb = readHeartbeat(root);
    if (hb?.alive && hb.mode === "worker") console.log(`agent: \`omgp work\` is already running (pid ${hb.pid}), the studio leaves requests to it`);
    else {
      runner = new Runner(root, agentCfg, workspace().config.locale, { mode: "server" });
      runner.start();
      console.log(`agent: ${describeAgent(agentCfg)} builds requests from the studio`);
      process.on("SIGINT", () => (runner?.stop(), process.exit(0)));
      process.on("SIGTERM", () => (runner?.stop(), process.exit(0)));
    }
  } else console.log("agent: none configured. Run `omgp work` next to the studio, or set agent: { preset: claude } in product.yaml");

  const server = Bun.serve({
    port,
    hostname: host,
    idleTimeout: 255,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

      try {
        if (path === "/api/events") {
          let ctl: ReadableStreamDefaultController<string>;
          let beat: ReturnType<typeof setInterval>;
          const stream = new ReadableStream<string>({
            start(c) {
              ctl = c;
              clients.add(c);
              c.enqueue(`data: ${JSON.stringify({ type: "hello" })}\n\n`);
              beat = setInterval(() => {
                try {
                  c.enqueue(": ping\n\n");
                } catch {
                  clearInterval(beat);
                }
              }, 15000);
            },
            cancel() {
              clients.delete(ctl);
              clearInterval(beat);
            },
          });
          return new Response(stream, {
            headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
          });
        }

        if (path === "/api/workspace") return json(workspace());

        // pulse: GET every day's votes, POST one swipe { voter, date, project, tier|null }
        if (path === "/api/pulse") {
          if (req.method === "POST") {
            const { voter, date, project, tier } = (await req.json()) as { voter: string; date: string; project: string; tier: string | null };
            if (!voter?.trim()) return json({ error: "who votes?" }, 400);
            if (!workspace().projects.some((p) => p.id === project)) return json({ error: "project not found" }, 404);
            savePulseVote(root, voter.trim(), date, project, tier as never);
          }
          return json({ days: loadPulse(root) });
        }

        // /api/session/:project/:session
        if (parts[0] === "api" && parts[1] === "session" && parts.length >= 4) {
          const [, , project, session, action] = parts;
          if (req.method === "GET" && !action) {
            const s = loadSession(root, project, session);
            if (!s) return json({ error: "session not found" }, 404);
            const requests = listRequests(root).filter((r) => r.project === project && r.session === session);
            return json({ session: s, results: loadResults(root, project, session), requests });
          }
          if (req.method === "POST" && action === "op") {
            const op = (await req.json()) as ResultOp;
            const results = updateResults(root, project, session, op);
            send({ type: "results", project, session, results });
            return json(results);
          }
        }

        // edit one field of a session step: { path, value, expect }
        if (parts[0] === "api" && parts[1] === "session" && parts[4] === "step" && req.method === "PATCH") {
          const [, , project, session, , stepId] = parts;
          const { path, value, expect } = (await req.json()) as { path: (string | number)[]; value: unknown; expect?: unknown };
          patchStep(root, project, session, stepId, path, value, expect);
          cache = null;
          return json({ ok: true });
        }

        // comments: GET threads (with current anchors), POST an op
        if (parts[0] === "api" && parts[1] === "comments" && parts[2]) {
          const scope = parts[2];
          if (scope !== ROOT_SCOPE && !workspace().projects.some((p) => p.id === scope)) return json({ error: "unknown scope" }, 404);
          if (req.method === "POST") {
            const doc = updateComments(root, scope, (await req.json()) as CommentOp);
            send({ type: "comments", scope });
            return json({ threads: anchorThreads(root, scope, doc) });
          }
          return json({ threads: anchorThreads(root, scope, loadComments(root, scope)) });
        }

        // edit markdown text: { file, heading?, content, expect? } — no heading replaces the whole body
        if (parts[0] === "api" && parts[1] === "text" && parts[2] && req.method === "PATCH") {
          const scope = parts[2];
          const { file, heading, content, expect } = (await req.json()) as { file: string; heading?: string; content: string; expect?: string };
          const path = safeJoin(scopeDir(root, scope), file);
          if (!path || !file.endsWith(".md") || !existsSync(path)) return json({ error: "can only edit existing .md files" }, 400);
          if (heading != null) replaceSection(path, heading, content, expect);
          else replaceBody(path, content, expect);
          cache = null;
          return json({ ok: true });
        }

        if (parts[0] === "api" && parts[1] === "handoff" && req.method === "POST") {
          const ws = workspace();
          const p = ws.projects.find((p) => p.id === parts[2]);
          if (!p) return json({ error: "project not found" }, 404);
          const body = (await req.json().catch(() => ({}))) as { sessions?: string[] };
          return json({ markdown: writeHandoff(ws, p, body.sessions), file: `${p.dir}/handoff.md` });
        }

        if (parts[0] === "api" && parts[1] === "project" && req.method === "PATCH") {
          const p = workspace().projects.find((p) => p.id === parts[2]);
          if (!p) return json({ error: "project not found" }, 404);
          updateFrontmatter(join(root, p.file), (await req.json()) as Record<string, unknown>);
          cache = null;
          return json({ ok: true });
        }

        if (parts[0] === "api" && parts[1] === "assets" && req.method === "POST") {
          const project = parts[2];
          if (!workspace().projects.some((p) => p.id === project)) return json({ error: "project not found" }, 404);
          const { dataUrl, name } = (await req.json()) as { dataUrl: string; name?: string };
          const m = dataUrl.match(/^data:([\w/+.-]+);base64,(.*)$/);
          if (!m) return json({ error: "expected a base64 data URL" }, 400);
          const ext = { "image/png": "png", "image/jpeg": "jpg", "audio/webm": "webm", "image/svg+xml": "svg" }[m[1]] ?? "bin";
          const base = (name ?? `asset-${Date.now()}`).replace(/[^a-z0-9._-]/gi, "-");
          const rel = `assets/${base}.${ext}`;
          const dir = join(root, "projects", project, "assets");
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(root, "projects", project, rel), Buffer.from(m[2], "base64"));
          return json({ path: rel, workspacePath: `projects/${project}/${rel}` });
        }

        if (path === "/api/requests" && req.method === "GET") return json(listRequests(root));
        if (path === "/api/agent") {
          const cfg = workspace().config.agent;
          return json({
            configured: cfg && (cfg.preset || cfg.command) ? describeAgent(cfg) : null,
            heartbeat: readHeartbeat(root),
            requests: listRequests(root).slice(-40),
          });
        }
        if (path === "/api/requests" && req.method === "POST") {
          const body = (await req.json()) as Omit<RequestT, "id" | "status" | "createdAt" | "log">;
          const r = createRequest(root, body);
          send({ type: "request", request: r });
          const hb = readHeartbeat(root);
          return json({ ...r, prompt: requestPrompt(r), agent: !!runner || !!hb?.alive });
        }
        // cancel or retry: POST /api/requests/:id/cancel | /retry
        if (parts[0] === "api" && parts[1] === "requests" && parts[2] && req.method === "POST") {
          const id = parts[2];
          if (!getRequest(root, id)) return json({ error: "no such request" }, 404);
          if (parts[3] === "cancel") {
            appendLog(root, id, [{ kind: "status", text: "cancelled in the studio" }]);
            return json(setRequestStatus(root, id, "cancelled"));
          }
          if (parts[3] === "retry") {
            appendLog(root, id, [{ kind: "status", text: "queued again from the studio" }]);
            return json(setRequestStatus(root, id, "open"));
          }
        }

        if (path === "/__omgp/annotate.js")
          return new Response(annotateJs(), { headers: { "content-type": mime[".js"], "cache-control": "no-cache" } });

        if (parts[0] === "files") {
          const file = safeJoin(root, parts.slice(1).join("/"));
          if (!file || !existsSync(file)) return new Response("not found", { status: 404 });
          const ext = extname(file).toLowerCase();
          if (ext === ".html" && url.searchParams.has("omgp"))
            return new Response(withAnnotate(readFileSync(file, "utf8")), { headers: { "content-type": mime[".html"], "cache-control": "no-cache" } });
          return new Response(Bun.file(file), {
            headers: { "content-type": mime[ext] ?? "application/octet-stream", "cache-control": "no-cache" },
          });
        }

        // studio app
        if (req.method === "GET" && existsSync(webDist)) {
          const asset = path !== "/" ? safeJoin(webDist, path.slice(1)) : null;
          if (asset && existsSync(asset) && extname(asset))
            return new Response(Bun.file(asset), { headers: { "content-type": mime[extname(asset)] ?? "application/octet-stream" } });
          return new Response(Bun.file(join(webDist, "index.html")), { headers: { "content-type": mime[".html"] } });
        }
        if (req.method === "GET" && path === "/")
          return new Response("Studio not built. Run `bun run build`, or `bun run dev` for development.", { status: 503 });
        return json({ error: "not found" }, 404);
      } catch (e) {
        if (e instanceof EditConflict) return json({ error: e.message, conflict: true }, 409);
        console.error(e);
        return json({ error: (e as Error).message }, 500);
      }
    },
  });

  const shown = host === "0.0.0.0" || host === "::" ? "localhost" : host;
  console.log(`omgp studio  http://${shown}:${server.port}   workspace ${root}`);
  if (host === "0.0.0.0")
    for (const nets of Object.values(networkInterfaces()))
      for (const n of nets ?? [])
        if (n.family === "IPv4" && !n.internal) console.log(`  on your network: http://${n.address}:${server.port}`);
  return server;
}
