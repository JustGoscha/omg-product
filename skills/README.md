# omgp agent skills

Skills that teach a coding agent to run product work with omgp: frame
problems, build prototypes, prepare decision sessions, co-pilot live meetings,
write handoffs, plan the roadmap and check results after release. They follow
the open [Agent Skills](https://agentskills.io/specification) format (a folder
with `SKILL.md`, YAML frontmatter `name` + `description`, optional
`references/` and `assets/`), so they work in any agent that supports it.

## The skills

| skill | use it for | writes |
|---|---|---|
| [`omgp`](omgp/SKILL.md) | the core: why omgp exists, workspace layout, lifecycle, CLI, golden rules, which skill when. Holds the format spec in `omgp/references/format.md`. | — |
| [`omgp-explore`](omgp-explore/SKILL.md) | idea → framed problem: interview, research (Linear, codebase, analytics), Problem / For whom / Metric, assumptions, open decisions | `project.md` |
| [`omgp-prototype`](omgp-prototype/SKILL.md) | standalone HTML prototypes with brand tokens, realistic data, hash states, `data-focus` hooks, variants, simulated events, non-UI flows | `prototypes/*.html` |
| [`omgp-kickoff`](omgp-kickoff/SKILL.md) | preparing a session that leads tired people to decisions: decision mining, sorting (level, now/later, one-way/two-way), YAGNI, visual selection, writing rules, time budget | `sessions/<id>.yaml` |
| [`omgp-facilitate`](omgp-facilitate/SKILL.md) | live co-pilot during a session: `omgp listen` → custom options, revised options, visuals, steps, prototype edits → `omgp done` | session and prototype edits |
| [`omgp-handoff`](omgp-handoff/SKILL.md) | results → implementation spec and < 1 day issues; project to `scoped`; optional push to Linear after confirmation | `handoff.md`, `project.md` |
| [`omgp-roadmap`](omgp-roadmap/SKILL.md) | placing projects, fuzzy far future, acting on `omgp roadmap` findings, Linear import, initiative and lighthouse alignment | project frontmatter |
| [`omgp-rollout`](omgp-rollout/SKILL.md) | tracking plan and verification, adoption numbers vs. target, rollout-review session, done / iterate / drop | `project.md`, `sessions/rollout-review.yaml` |

Typical path of a project: `omgp-explore` → (`omgp-prototype`) →
`omgp-kickoff` → `omgp-facilitate` during the meeting → `omgp-handoff` →
building → `omgp-rollout`. `omgp-roadmap` at any time.

You don't need to name a skill. Agents load a skill when the task matches its
description ("prepare the kickoff for recurring jobs", "did the series feature
work?").

## Install

Always install **all skill folders side by side**, including `assets/` and
`references/`: the `omgp-*` skills read the format spec at
`../omgp/references/format.md`.

With the CLI (from inside a workspace or project repo):

```bash
omgp skills install --target claude    # .claude/skills/
omgp skills install --target agents    # .agents/skills/
omgp skills install --target opencode  # .opencode/skills/
omgp skills install --target pi        # .pi/skills/
```

Manually: copy (or symlink) every folder in `skills/` into one of the
directories below.

| agent | project-level | user-level | notes |
|---|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` | |
| Codex | `.agents/skills/` | `~/.agents/skills/` | scans from the working directory up to the repo root |
| OpenCode | `.opencode/skills/` | `~/.config/opencode/skills/` | also reads `.claude/skills/` and `.agents/skills/` |
| Pi | `.pi/skills/` | `~/.pi/agent/skills/` | also reads `.agents/skills/`; some versions load project skills only for trusted projects |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` | also reads `.agents/skills/` and `.claude/skills/` |

Which target to pick:
- Only Claude Code, or a mix that includes Claude Code: `--target claude`
  (OpenCode and Cursor read it too).
- Codex, Cursor, Pi, OpenCode without Claude Code: `--target agents`.
- Avoid installing into two directories an agent reads both of (e.g.
  `.claude/skills/` and `.agents/skills/` for OpenCode): you get duplicates.

Restart the agent (or start a new session) after installing so it picks up
the skills.

## Live requests without a chat open

The studio can start an agent by itself for each live request when
`agent.command` is set in `product.yaml`, e.g.:

```yaml
agent:
  command: "claude -p --permission-mode acceptEdits"
```

The prompt (the request) is passed on stdin; the agent follows
`omgp-facilitate`. Use any agent CLI that reads a prompt from stdin and can
edit files and run `omgp`.

## Writing or changing a skill

- `name` must match the folder name; `description` says what the skill does
  **and when to use it** (max 1024 characters).
- Keep `SKILL.md` under ~250 lines; move long material to `references/`.
- Don't use tool names of one agent. Describe actions: "read the file", "run
  `omgp validate`", "if a Linear MCP or CLI is available…".
- Examples use the neutral product "Acme Field" (field service: dispatchers,
  technicians, end customers) so the harness stays company-agnostic.
- Never copy the format spec into a skill; link to `omgp/references/format.md`.
