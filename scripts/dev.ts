// Studio development: API server + Vite with hot reload.
const dir = process.argv[2] ?? process.env.OMGP_DIR ?? "examples/acme";
const procs = [
  Bun.spawn(["bun", "--watch", "src/cli/main.ts", "serve", "--dir", dir], { stdout: "inherit", stderr: "inherit" }),
  Bun.spawn(["bunx", "vite"], { stdout: "inherit", stderr: "inherit" }),
];
process.on("SIGINT", () => {
  for (const p of procs) p.kill();
  process.exit(0);
});
await Promise.all(procs.map((p) => p.exited));
export {};
