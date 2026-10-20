# omg·product

A product harness for teams that build with coding agents. Building is no
longer the bottleneck; deciding is. omgp makes the decisions explicit, visual
and quick to make with the right people, and turns them into a handoff that
implementing agents follow.

It is three things that share one folder of plain files:

- **Skills** (`skills/`) teach any coding agent (Claude Code, OpenCode, Codex,
  Pi, Cursor) how to frame a problem, build HTML prototypes, prepare a kickoff,
  co-pilot the meeting, write the handoff, plan the roadmap and review a rollout.
- **A CLI** (`omgp`) validates the files, analyses the roadmap, compiles
  handoffs and connects the studio to the agent during meetings.
- **A studio** (`omgp serve`) renders the roadmap, project pages and prototypes,
  and runs meetings step by step: swipe triage, A/B/C choices with diagrams that
  show what each option changes, polls, open questions, comments pinned on the
  prototype, and "none of these": write, dictate or sketch your own option and
  the agent builds it while the room waits.

The files are the API. Agents write them, the studio reloads, humans decide,
the studio writes the results back, agents read them. People can also comment
on any paragraph, option, list line or diagram element, edit text in place, and
ask the agent to rebuild an option or a whole decision from those comments.

**Demo:** https://justgoscha.github.io/omg-product/ (the invented company in
`examples/acme`: roadmap, stage board, a kickoff you can click through, a
prototype; read-only).

## Install (Claude Code)

omgp needs [Bun](https://bun.sh). Then, in Claude Code:

```
/plugin install omgp --marketplace JustGoscha/omg-product
```

This adds the skills and puts `omgp` on the agent's PATH. To get new versions
automatically, turn on auto-update once: `/plugin` → Marketplaces →
omg-product → Enable auto-update. Every push to `main` is built into the
`release` branch, and Claude Code picks it up at the next start.

For a whole team, commit this to the workspace repo's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "omg-product": {
      "source": { "source": "github", "repo": "JustGoscha/omg-product" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "omgp@omg-product": true }
}
```

Other agents (Codex, OpenCode, Pi, Cursor): clone this repo, run
`bun install && bun run build`, then `./bin/omgp skills install --link --dir
<your workspace>` and keep it current with `omgp update`.

## It learns from corrections

When someone corrects how omgp works for them ("problems get a severity, not a
priority"), the agent fixes the case at hand and writes the rule into the
workspace's `rules.md` (`omgp learn "…" --why "…"`). Every agent reads that
file before each task, so the team says it once. Rules that would help
everyone become a proposal for the shared skills (`omgp learn "…"
--upstream`, posted by a person, never with company data), and once merged
they reach every install through auto-update.

## Quick start (from a checkout)

```bash
bun install && bun run build
```

```bash
./bin/omgp serve --dir examples/acme
```

Open http://localhost:4747. `examples/acme` is an invented company with a full
kickoff (`/#/p/recurring-jobs/s/kickoff`). Keep your own company's workspace in
its own (private) repo; `workspaces/` here is git-ignored for local ones.

For your own product:

```bash
./bin/omgp init ../my-product --name "My Product"
```

```bash
./bin/omgp skills install --dir ../my-product --target claude --target agents
```

Then ask your agent to explore an idea, prototype it or prepare a kickoff. It
picks the matching skill.

## The loop

| Stage | Who | What happens | Skill |
|---|---|---|---|
| idea → exploring | PM + agent | problem, users, metric written into `project.md` | omgp-explore |
| prototyping | agent | standalone HTML in the product's look, states addressable by `#hash` | omgp-prototype |
| kickoff | agent prepares, room decides | session YAML in two parts, each closed by a checkpoint: the problems and how bad they are, then the scoped solution | omgp-kickoff |
| in the meeting | agent on standby | `omgp listen`: builds options the room asks for | omgp-facilitate |
| scoped | agent | `handoff.md`, issues under a day each, Linear on request | omgp-handoff |
| roadmap | PM + agent | dependencies, streams, capacity, fuzzy far future | omgp-roadmap |
| rollout → measuring | PM + agent | tracking, numbers against the metric, done / iterate / drop | omgp-rollout |

## The agent

Some actions in the studio need an agent: "none of these" (build my option),
rebuilding an option or a decision, "fix with agent" on a comment. They become
requests in `.omgp/requests/`, and a worker starts a headless agent for each,
one after another:

- `agent: { preset: claude }` in `product.yaml`: `omgp serve` runs the worker
  itself. Presets: `claude`, `codex`, `opencode`, `pi`; or `command: "…"` for
  anything that reads a prompt on stdin.
- or `omgp work` in a second terminal (same presets via `--agent`). It keeps
  running and prints what the agent does.
- or an agent chat runs `omgp listen`: it takes one request and exits so the
  chat can work on it, then calls it again.

The dock at the bottom of the studio shows whether an agent is connected, what
it is doing right now (reading, editing, checking the files), the queue and the
history, with cancel and retry. A request whose worker died is put back in the
queue.

## Running a meeting

1. `omgp serve --host 0.0.0.0` on the laptop at the projector.
2. In a terminal next to it, start your agent with the omgp-facilitate skill,
   or set `agent.command` in `product.yaml` so the studio starts it per request.
3. Open the session, press **Space** to move on. Arrow keys swipe triage cards
   (problems: ↑ critical, → noticeable, ↓ minor, ← no problem; features: ↑ needed
   at launch, → soon after, ↓ nice to have, ← not needed). Number keys open options, **Enter**
   picks one, **N** opens notes, **S** shows speaker notes.
4. Participants can vote from their phones: the `⋯` menu shows the join link.
5. At the end, **Summary** → **Write handoff.md**.

## Commands

```
omgp init [dir]                  scaffold a workspace
omgp serve                       studio with live reload
omgp validate                    schema and reference checks, exit 1 on errors
omgp roadmap                     conflicts, bottlenecks, overload, delegatable work
omgp status [project]            project and session progress
omgp new project|session …       starter files
omgp handoff <project>           compile results into handoff.md
omgp work [--agent claude]       keep building live requests from the studio in the background
omgp listen / done <id>          for agent chats: take one request, then mark it done
omgp progress <id> "…"           report what you are doing on a request
omgp note <p> <s> <step> "…"     add meeting notes from the agent
omgp comments [project]          open comment threads, with what they point at
omgp reply <thread> "…" / resolve <thread>   answer review comments as the agent
omgp check <project> [--shots]   open prototypes in headless Chrome: script errors, blank states, screenshots
omgp linear pull [--from f.json] import projects and sync dates (LINEAR_API_KEY or an agent's Linear export)
omgp learn "rule" [--upstream]   add a team rule to rules.md, or print a proposal for the shared skills
omgp skills install [--link]     copy or link the skills into a repo
omgp update / version            update a git checkout (the plugin updates itself)
```

The file format is in [skills/omgp/references/format.md](skills/omgp/references/format.md).

## Development

```bash
bun run dev          # API server + Vite with hot reload, workspace from OMGP_DIR or examples/acme
claude --plugin-dir ./   # try this checkout as a Claude Code plugin
bun test             # core tests
bun run check        # svelte-check + tsc
```

Stack: Bun (CLI and server), Svelte 5 + Vite (studio), dagre for diagram
layout, zod for the schema.

## Not built yet

- Pulling live numbers from PostHog into `metrics[].current` (the rollout skill
  does it through the agent for now).
- `omgp linear push` and a structured issues file (the handoff skill writes
  issues into `handoff.md`).
- Several visuals per option side by side (an option has `visual` and
  `visuals`, but the compare view diffs only the first).
- A QR code for phone voting, presence of who is connected, and remote rooms
  beyond the local network.
