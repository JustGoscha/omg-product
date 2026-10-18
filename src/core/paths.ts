import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Where omgp itself lives: the folder with bin/ and skills/. Found by walking up, so it works
// from the sources (src/core) and from the bundled CLI (dist/omgp.js) in an installed plugin.
function packageRoot(from: string) {
  for (let d = from, i = 0; i < 6; i++, d = dirname(d)) if (existsSync(join(d, "skills")) && existsSync(join(d, "bin"))) return d;
  return join(from, "..", "..");
}

export const PKG_ROOT = packageRoot(import.meta.dir);
export const SKILLS_DIR = join(PKG_ROOT, "skills");
export const BIN_DIR = join(PKG_ROOT, "bin");
export const WEB_DIST = join(PKG_ROOT, "dist", "web");
export const ANNOTATE_JS = join(PKG_ROOT, "src", "server", "annotate.js");
export const REPO = "JustGoscha/omg-product";

/** The build this is: the commit CI stamped into dist/version.json, else the checkout's commit. */
export function version(): string {
  try {
    const f = join(PKG_ROOT, "dist", "version.json");
    if (existsSync(f)) return (JSON.parse(readFileSync(f, "utf8")) as { commit: string }).commit.slice(0, 7);
    const r = Bun.spawnSync(["git", "-C", PKG_ROOT, "rev-parse", "--short", "HEAD"]);
    if (r.exitCode === 0) return `${r.stdout.toString().trim()} (checkout)`;
  } catch {
    /* fall through */
  }
  return "dev";
}
