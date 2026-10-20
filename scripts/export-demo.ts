// The studio's static demo (examples/acme) for GitHub Pages: bun scripts/export-demo.ts [out, default _site]
import { join, resolve } from "node:path";
import { exportStatic } from "../src/cli/export.ts";

const repo = join(import.meta.dir, "..");
const r = exportStatic(join(repo, "examples/acme"), resolve(process.argv[2] ?? join(repo, "_site")));
console.log(`exported ${r.projects} projects, ${r.sessions} sessions and ${r.files} files to ${r.outDir}`);
