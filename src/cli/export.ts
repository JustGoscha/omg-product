import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { ANNOTATE_JS, PKG_ROOT, WEB_DIST } from "../core/paths.ts";
import { loadResults, loadSession, loadWorkspace } from "../core/workspace.ts";
import { anchorThreads, loadComments, ROOT_SCOPE } from "../core/comments.ts";
import { withAnnotate } from "../server/server.ts";

// A static, read-only copy of the studio for one workspace, for GitHub Pages or any file host:
//
//   index.html, assets/        the built studio (dist/web), with window.__OMGP_STATIC__ set
//   api/<endpoint>.json        what each GET endpoint the studio reads would answer
//   files/<workspace path>     the workspace files; HTML with the annotate layer, as for ?omgp=1
//   __omgp/annotate.js         that layer
//   static.json                what was exported, and the marker that lets a re-export replace the folder
//
// All URLs are relative, so it works under a sub-path (/<repo>/). The studio reads the
// snapshots instead of a server and keeps meeting results in the browser (web/src/lib/static.ts).

const MARKER = "static.json";

export interface ExportSummary {
  outDir: string;
  workspace: string;
  projects: number;
  sessions: number;
  files: number;
}

export function exportStatic(root: string, outDir: string): ExportSummary {
  root = resolve(root);
  outDir = resolve(outDir);
  if (!existsSync(join(root, "product.yaml"))) throw new Error(`${root} is not an omgp workspace (no product.yaml)`);
  for (const [what, dir] of [["the workspace", root], ["omgp itself", PKG_ROOT], ["the studio build", WEB_DIST]] as const)
    if (inside(dir, outDir)) throw new Error(`cannot export into ${outDir}: it would replace ${what}`);
  if (inside(outDir, WEB_DIST)) throw new Error(`cannot export into the studio build (${WEB_DIST})`);
  checkTarget(outDir);

  const web = ensureWebBuild();
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  cpSync(web, outDir, { recursive: true });
  const summary = writeSnapshots(root, outDir);

  // tell the studio that there is no server behind it
  const info = { workspace: summary.workspace, exportedAt: new Date().toISOString() };
  const index = join(outDir, "index.html");
  const flag = `<script>window.__OMGP_STATIC__ = ${JSON.stringify(info).replace(/</g, "\\u003c")};</script>`;
  writeFileSync(index, readFileSync(index, "utf8").replace(/<\/head>/i, `  ${flag}\n  </head>`));
  const { outDir: _, ...counts } = summary;
  writeFileSync(join(outDir, MARKER), JSON.stringify({ omgp: "static export", ...info, ...counts }, null, 2) + "\n");
  // GitHub Pages without Actions runs Jekyll, which drops folders starting with _
  writeFileSync(join(outDir, ".nojekyll"), "");
  return summary;
}

/**
 * Everything of an export except the studio itself: the GET snapshots under api/, the
 * workspace files under files/ (HTML with the annotate layer) and that layer.
 */
export function writeSnapshots(root: string, outDir: string): ExportSummary {
  root = resolve(root);
  outDir = resolve(outDir);
  const write = (rel: string, data: unknown) => {
    const path = join(outDir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof data === "string" ? data : JSON.stringify(data));
  };
  const ws = loadWorkspace(root);

  // GET endpoints, at api/<path>.json (see snapshotPath in web/src/lib/static.ts)
  write("api/workspace.json", { ...ws, root: basename(root) }); // not the absolute path of the machine that exported
  let sessions = 0;
  for (const p of ws.projects) {
    for (const s of p.sessions) {
      const session = loadSession(root, p.id, s.id);
      if (!session) continue;
      write(`api/session/${p.id}/${s.id}.json`, { session, results: loadResults(root, p.id, s.id), requests: [] });
      sessions++;
    }
    write(`api/comments/${p.id}.json`, { threads: anchorThreads(root, p.id, loadComments(root, p.id)) });
  }
  write(`api/comments/${ROOT_SCOPE}.json`, { threads: anchorThreads(root, ROOT_SCOPE, loadComments(root, ROOT_SCOPE)) });
  // no agent and no requests: the studio hides everything that needs one
  write("api/agent.json", { configured: null, heartbeat: null, requests: [] });
  write("api/requests.json", []);

  // workspace files (prototypes, images, brand css, handoff.md), HTML with the annotate layer
  write("__omgp/annotate.js", readFileSync(ANNOTATE_JS, "utf8"));
  let files = 0;
  for (const rel of workspaceFiles(root, outDir)) {
    const from = join(root, rel);
    const to = join(outDir, "files", rel);
    mkdirSync(dirname(to), { recursive: true });
    if (rel.toLowerCase().endsWith(".html")) {
      const up = "../".repeat(relative(outDir, dirname(to)).split(sep).length);
      writeFileSync(to, withAnnotate(readFileSync(from, "utf8"), `${up}__omgp/annotate.js`));
    } else copyFileSync(from, to);
    files++;
  }
  return { outDir, workspace: ws.config.name, projects: ws.projects.length, sessions, files };
}

/** is `path` the same as `dir` or inside it */
function inside(path: string, dir: string) {
  const r = relative(dir, path);
  return r === "" || (!r.startsWith("..") && !r.startsWith(sep) && !/^[a-zA-Z]:/.test(r));
}

/** Exports go into an empty folder, or replace an earlier export. Anything else stays untouched. */
function checkTarget(outDir: string) {
  if (!existsSync(outDir)) return;
  if (!statSync(outDir).isDirectory()) throw new Error(`${outDir} is a file`);
  const entries = readdirSync(outDir).filter((f) => f !== ".DS_Store");
  if (entries.length && !entries.includes(MARKER))
    throw new Error(`${outDir} is not empty and not an earlier export (no ${MARKER}); choose an empty folder`);
}

/** Workspace files relative to root, without dot folders (.omgp, .git), node_modules and the export itself. */
function workspaceFiles(root: string, outDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith(".") || name === "node_modules") continue;
      const path = join(dir, name);
      if (inside(path, outDir)) continue;
      const st = statSync(path);
      if (st.isDirectory()) walk(path);
      else if (st.isFile()) out.push(relative(root, path).split(sep).join("/"));
    }
  };
  walk(root);
  return out;
}

/**
 * dist/web, built with relative asset URLs. In a development checkout of omgp it is (re)built
 * when missing or older than its sources; an installed omgp ships it built.
 */
function ensureWebBuild(): string {
  const index = join(WEB_DIST, "index.html");
  const canBuild = ["web/src", "vite.config.ts", "node_modules/vite"].every((p) => existsSync(join(PKG_ROOT, p)));
  if (canBuild && (!existsSync(index) || stale(index))) {
    console.log("studio: building it first (bun run build)");
    const r = Bun.spawnSync([process.execPath, "run", "build"], { cwd: PKG_ROOT, stdout: "inherit", stderr: "inherit" });
    if (r.exitCode !== 0) throw new Error("`bun run build` failed");
  }
  if (!existsSync(index)) throw new Error(`the studio is not built (${WEB_DIST} is missing); run \`bun run build\``);
  if (absoluteAssets(index)) throw new Error(`${WEB_DIST} links its assets from /; rebuild it with \`bun run build\``);
  return WEB_DIST;
}

const absoluteAssets = (index: string) => /(src|href)="\/assets\//.test(readFileSync(index, "utf8"));

function stale(index: string) {
  if (absoluteAssets(index)) return true;
  const built = statSync(index).mtimeMs;
  const newer = (path: string): boolean => {
    if (!existsSync(path)) return false;
    const st = statSync(path);
    if (!st.isDirectory()) return st.mtimeMs > built;
    return readdirSync(path).some((f) => f !== "node_modules" && !f.endsWith(".test.ts") && newer(join(path, f)));
  };
  // the studio imports src/core (schema, ops, labels)
  return ["web", join("src", "core"), "vite.config.ts", "package.json"].some((p) => newer(join(PKG_ROOT, p)));
}
