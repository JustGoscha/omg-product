import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { allSteps, loadSession, stepVisuals, type ProjectInfo, type Workspace } from "./workspace.ts";

// Renders a prototype in headless Chrome and reports what is broken: uncaught errors,
// console errors, a blank page, focus targets that don't exist in a #state. With a
// shots folder it saves one PNG per state, so an agent can look at what it built.

export interface ProtoState {
  hash: string; // "" is the start page
  focus?: string[];
}
export interface ProtoProblem {
  state: string;
  kind: "exception" | "console" | "blank" | "focus" | "load";
  text: string;
}
export interface ProtoCheck {
  file: string;
  states: string[];
  problems: ProtoProblem[];
  shots: string[];
  skipped?: string; // no browser found
}

export function findChrome(): string | null {
  const env = process.env.OMGP_CHROME;
  if (env && existsSync(env)) return env;
  const fixed = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of fixed) if (existsSync(p)) return p;
  // browsers Playwright downloaded
  const cache = join(process.env.HOME ?? "", process.platform === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
  if (existsSync(cache))
    for (const d of readdirSync(cache).filter((d) => d.startsWith("chromium-")).sort().reverse())
      for (const sub of ["chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium", "chrome-linux/chrome"]) {
        const p = join(cache, d, sub);
        if (existsSync(p)) return p;
      }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function checkPrototype(
  file: string,
  states: ProtoState[],
  opts: { shots?: string; width?: number; height?: number } = {},
): Promise<ProtoCheck> {
  const all = states.some((s) => s.hash === "") ? states : [{ hash: "" }, ...states];
  const result: ProtoCheck = { file, states: all.map((s) => s.hash), problems: [], shots: [] };
  const chrome = findChrome();
  if (!chrome) return { ...result, skipped: "no Chrome or Chromium found (set OMGP_CHROME)" };

  const profile = mkdtempSync(join(tmpdir(), "omgp-chrome-"));
  const proc = Bun.spawn(
    [chrome, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio",
      `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"],
    { stdout: "ignore", stderr: "ignore" },
  );
  let ws: WebSocket | null = null;
  try {
    // Chrome writes its debugging port into the profile folder
    let port = "";
    let path = "";
    for (let i = 0; i < 100 && !port; i++) {
      const f = join(profile, "DevToolsActivePort");
      if (existsSync(f)) [port, path] = (await Bun.file(f).text()).split("\n");
      if (!port) await sleep(100);
    }
    if (!port) throw new Error("Chrome did not start");
    ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
    await new Promise((ok, fail) => ((ws!.onopen = ok), (ws!.onerror = () => fail(new Error("cannot reach Chrome")))));

    let seq = 0;
    const pending = new Map<number, { ok: (v: any) => void; fail: (e: Error) => void }>();
    const listeners: ((method: string, params: any) => void)[] = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id)!;
        pending.delete(m.id);
        m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result);
      } else if (m.method) for (const l of listeners) l(m.method, m.params);
    };
    const send = (method: string, params: object = {}, sessionId?: string) =>
      new Promise<any>((ok, fail) => {
        const id = ++seq;
        pending.set(id, { ok, fail });
        ws!.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });

    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const page = (method: string, params: object = {}) => send(method, params, sessionId);

    let current = "";
    let loaded = false;
    listeners.push((method, p) => {
      if (method === "Page.loadEventFired") loaded = true;
      if (method === "Runtime.exceptionThrown") {
        const d = p.exceptionDetails;
        const text = (d.exception?.description ?? d.text ?? "error").split("\n").slice(0, 2).join(" ");
        result.problems.push({ state: current, kind: "exception", text: `${text}${d.lineNumber != null ? ` (line ${d.lineNumber + 1})` : ""}` });
      }
      if (method === "Runtime.consoleAPICalled" && p.type === "error")
        result.problems.push({ state: current, kind: "console", text: p.args.map((a: any) => a.value ?? a.description ?? "").join(" ").slice(0, 300) });
      if (method === "Log.entryAdded" && p.entry.level === "error" && !/favicon/.test(p.entry.url ?? ""))
        result.problems.push({ state: current, kind: "load", text: `${p.entry.text}${p.entry.url ? ` ${p.entry.url}` : ""}`.slice(0, 300) });
    });
    await page("Page.enable");
    await page("Runtime.enable");
    await page("Log.enable");
    await page("Emulation.setDeviceMetricsOverride", { width: opts.width ?? 1280, height: opts.height ?? 860, deviceScaleFactor: 1, mobile: false });
    await page("Page.navigate", { url: pathToFileURL(file).href });
    for (let i = 0; i < 80 && !loaded; i++) await sleep(100);
    if (!loaded) result.problems.push({ state: "", kind: "load", text: "page did not finish loading in 8s" });
    await sleep(400);

    if (opts.shots) mkdirSync(opts.shots, { recursive: true });
    const name = basename(file).replace(/\.html?$/, "");
    for (const s of all) {
      current = s.hash;
      if (s.hash) {
        await page("Runtime.evaluate", { expression: `location.hash = ${JSON.stringify(s.hash)}` });
        await sleep(350);
      }
      const probe = await page("Runtime.evaluate", {
        expression: `(() => ({ text: (document.body?.innerText ?? "").trim().length, missing: ${JSON.stringify(s.focus ?? [])}.filter((q) => { try { return !document.querySelector(q) } catch { return true } }) }))()`,
        returnByValue: true,
      });
      const v = probe.result?.value ?? { text: 0, missing: [] };
      if (v.text < 20) result.problems.push({ state: s.hash, kind: "blank", text: "the page is (almost) empty" });
      for (const q of v.missing) result.problems.push({ state: s.hash, kind: "focus", text: `focus "${q}" is not on the page` });
      if (opts.shots) {
        const shot = await page("Page.captureScreenshot", { format: "png" });
        const out = join(opts.shots, `${name}--${(s.hash || "start").replace(/[^\w-]+/g, "_")}.png`);
        writeFileSync(out, Buffer.from(shot.data, "base64"));
        result.shots.push(out);
      }
    }
    await send("Browser.close").catch(() => {});
  } catch (e) {
    result.problems.push({ state: "", kind: "load", text: (e as Error).message });
  } finally {
    ws?.close();
    proc.kill();
    await proc.exited.catch(() => {});
    rmSync(profile, { recursive: true, force: true });
  }
  return result;
}

export function formatCheck(c: ProtoCheck, rel: string) {
  if (c.skipped) return [`${rel}: not checked, ${c.skipped}`];
  const lines = [`${rel}: ${c.problems.length ? `${c.problems.length} problem${c.problems.length > 1 ? "s" : ""}` : "ok"} in ${c.states.length} state${c.states.length > 1 ? "s" : ""}`];
  for (const p of c.problems) lines.push(`  ✗ ${p.state ? `#${p.state}` : "start"} ${p.kind}: ${p.text}`);
  if (c.shots.length) lines.push(`  screenshots (look at them with your file reader):`, ...c.shots.map((s) => `    ${s}`));
  return lines;
}

/** A project's prototype files with the #states and focus selectors its sessions point at. */
export function prototypeTargets(ws: Workspace, project: ProjectInfo, only?: string): { rel: string; abs: string; states: ProtoState[] }[] {
  const dir = join(ws.root, "projects", project.id);
  const byFile = new Map<string, Map<string, Set<string>>>();
  for (const p of project.prototypes) byFile.set(p.file, new Map([["", new Set<string>()]]));
  for (const s of project.sessions) {
    const loaded = loadSession(ws.root, project.id, s.id);
    for (const step of loaded ? allSteps(loaded) : []) {
      if (step.type === "broken") continue;
      for (const v of stepVisuals(step)) {
        if (v.type !== "prototype" || /^https?:/.test(v.src)) continue;
        const [path, hash = ""] = v.src.split("#");
        const states = byFile.get(path) ?? byFile.set(path, new Map()).get(path)!;
        const focus = states.get(hash) ?? states.set(hash, new Set()).get(hash)!;
        if (v.focus) focus.add(v.focus);
      }
    }
  }
  return [...byFile]
    .filter(([rel]) => !only || rel === only || rel.endsWith(`/${only}`) || basename(rel) === only)
    .map(([rel, states]) => ({ rel, abs: join(dir, rel), states: [...states].map(([hash, f]) => ({ hash, focus: [...f] })) }));
}
