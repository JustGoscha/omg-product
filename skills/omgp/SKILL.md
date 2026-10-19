---
name: omgp
description: Core of omgp (omg·product), a product-management harness where product work lives in plain files (product.yaml, vision, initiatives, projects, prototypes, session decks, handoffs) that the `omgp` CLI validates and the studio shows live. Use whenever a folder contains product.yaml, or the user wants to plan, scope or prioritize product work, turn "build X" into decisions, prepare a kickoff or workshop, write a spec or handoff, or mentions omgp, the studio, roadmap, initiatives or lighthouses. Read this first, then switch to the matching omgp-* skill.
---

# omgp — product decisions as files

## Why this exists

Building is no longer the bottleneck. Alignment and decision-making are.

What happens without omgp: someone says "build X", a developer prompts a coding
agent, and the model silently makes dozens of product and technical decisions.
Scoping meetings are unstructured. Nobody knows which decisions must be made now
and which can wait, who should make them, or what each option rules out. Teams
either build too much ("we might need it") or build something cheap that is
expensive to undo.

omgp makes decisions explicit, visual and fast to take (as easy as swiping),
with the right people in the room, and turns them into a handoff that
implementing agents follow.

Your role as the agent: do the preparation (research, prototypes, options,
pictures, recommendations) so that humans only have to decide. You recommend;
they decide.

## The workspace

The workspace is the nearest folder upward that contains `product.yaml`
(override with `--dir <path>` or `OMGP_DIR`). The file format is defined in
[references/format.md](references/format.md). It is the single source of truth:
read it before you write a file type for the first time in a session, and do not
guess fields.

```
product.yaml   vision.md   brand/{tokens.css,BRAND.md}   initiatives/<id>.md
projects/<id>/{project.md, prototypes/, sessions/, assets/, handoff.md}
.omgp/requests/   (live requests from the studio)
```

## Levels

| Level | Lives in | Holds | Horizon |
|---|---|---|---|
| North star, lighthouses | `vision.md` | where we are going | years |
| Initiative | `initiatives/<id>.md` | goal + one metric | 1–6 months |
| Project | `projects/<id>/project.md` | one problem, one user group, one metric | 1 day – 2 months |
| Issue | Linear or similar tracker | one change an agent can implement | < 1 day |

If a project has two user groups or two metrics, it is two projects.

## Lifecycle and which skill to use

`stage` in project.md: idea → exploring → prototyping → kickoff → scoped →
building → rollout → measuring → done (or paused, dropped).

| Stage / situation | Skill | Main output |
|---|---|---|
| "what should I do next?", "what now?" | — | run `omgp next`: the first open task of the most important project (Pulse ranking). Answer with that task; say if the top projects have no tasks yet |
| new workspace, "overview of all my projects", no reach/next yet | `omgp-onboard` | profile, vision, every project's stage, reach, next |
| idea, exploring: "we should build X" | `omgp-explore` | Problem, For whom, Metric, open decisions |
| prototyping: something to look at is needed | `omgp-prototype` | `prototypes/*.html` |
| kickoff: decisions need people | `omgp-kickoff` | `sessions/<id>.yaml` |
| a session is running in the studio | `omgp-facilitate` | live edits to the session |
| after a session → scoped | `omgp-handoff` | `handoff.md`, issues |
| building | implementing agents follow `handoff.md` | code |
| rollout, measuring | `omgp-rollout` | numbers vs target, done / iterate / drop |
| any time: what next, when, who | `omgp-roadmap` | placed projects, fixed conflicts |

Skip stages that add nothing. A small, clear project can go idea → short
kickoff → scoped. Prototype only when a picture is needed to decide.

## CLI

| Command | Does |
|---|---|
| `omgp init [dir]` | scaffold a workspace |
| `omgp serve [--port 4747] [--host 0.0.0.0]` | studio; live-reloads on file changes |
| `omgp validate` | schema + reference checks, prints `file: error`, exit 1 on errors |
| `omgp learn "rule" [--why "…"] [--upstream]` | add a team rule to `rules.md`; `--upstream` prints a proposal for the shared skills |
| `omgp check <project> [--shots]` | opens the prototypes in headless Chrome, visits every #state sessions use; errors, blank pages, missing focus; PNG per state |
| `omgp status [project]` | project summary and session progress |
| `omgp roadmap` | schedule, conflicts, cycles, bottlenecks, overload, delegatable work |
| `omgp new project <id> --name "…" [--initiative id]` | new project folder |
| `omgp new session <project> <id> [--kind kickoff]` | new session file |
| `omgp handoff <project> [--session id]` | compile results into `handoff.md` |
| `omgp listen [--timeout <s>]` / `omgp done <id> [--fail "…"]` | serve live studio requests |
| `omgp linear pull` | import initiatives and projects from Linear (`LINEAR_API_KEY`) |
| `omgp skills install [--target claude\|agents\|opencode\|pi]` | install these skills |

Studio URLs (default port 4747): roadmap `/#/`, project `/#/p/<id>`, session
`/#/p/<id>/s/<session>`, prototype `/#/p/<id>/proto/<file>`.

## Golden rules

1. **Files are the API.** Read and edit workspace files directly. The CLI and
   the studio only read and write these files; there is no hidden state.
2. **Validate after every edit.** Run `omgp validate` and fix every error before
   you continue or report back. Never hand over a workspace with errors. After
   touching a prototype, also run `omgp check <project> --shots` and look at the
   screenshots: the prototype has to run and show what was asked.
3. **Never decide silently on behalf of stakeholders.** When you hit a product,
   UX, tech or business choice that someone else owns, do not pick one and move
   on. Add it as a `choice` step to the next session (options, picture,
   recommendation), or ask the user. Note it in project.md under open decisions
   until it is placed.
4. **Recommend, with a reason.** Every choice you prepare carries your
   recommendation and a one-line reason. People can agree in seconds.
5. **Keep the studio running.** Start `omgp serve` (in the background if your
   agent can) when you begin work, so humans see changes live. After each
   change, give the exact URL, e.g. `http://localhost:4747/#/p/recurring-jobs/s/kickoff`.
6. **Recorded results are the room's.** `sessions/*.results.json` is written by
   the studio. Read it; edit it only to fix an obvious mistake, and say so. Never
   change a recorded decision.
7. **Respect the stage.** No full spec for an `idea`. Do not reopen a decided
   decision without saying so and putting it back in front of the decider.
8. **Update `stage`** in project.md when a project moves, in the same edit as
   the work that moved it.
9. **Design for tired people.** Sessions lead the room one small step at a
   time: problem, goal, solution in one picture, then piece by piece. One thing
   per step, only the element under discussion on screen, plain words in the
   participants' language. Details in `omgp-kickoff`.
10. **The team's rules win.** `rules.md` in the workspace holds how this team
    wants omgp to work. Follow it over these skills.

## Learning from corrections

When someone corrects how omgp works ("problems need a severity, not a
priority", "don't translate 'Nice to have'", "lanes are too busy"), fix the
thing in front of you, then make sure nobody has to say it again:

1. **Write the rule, not the instance.** One line that would have prevented
   the mistake, plus why: `omgp learn "Rate problems by severity, never by
   priority" --why "a problem can't be nice to have"`. It lands in `rules.md`,
   which every agent reads before each task. Tell the person in one line.
2. **If it would help any team, propose it upstream.** `omgp learn "…"
   --upstream` prints a proposal for the shared omgp skills. Strip company
   names, people and data from it, show it to the person, and let them post
   it. Never post it yourself.
3. **Working in the omgp repo itself?** Then change the skill (or
   `references/format.md`) directly, as a general rule in the place an agent
   would look for it, and keep the examples neutral.

Not every remark is a rule: a one-off wish for one project goes into that
project's files, not into `rules.md`.

## Starting work in a workspace

- [ ] Find the root (the folder with `product.yaml`) and read `product.yaml`
      and `rules.md` (if there is one).
- [ ] Start the studio if it is not running (`omgp serve`; check http://localhost:4747).
- [ ] Read `vision.md` and the initiatives the work belongs to.
- [ ] For a project: `omgp status <project>`, then read `project.md`, existing
      sessions and results.
- [ ] `omgp comments <project>`: open comment threads are review feedback from
      people. Work through them (change the file, `omgp reply`, `omgp resolve`)
      before you build on top of the files they point at.
- [ ] Pick the skill from the table above and follow it.

No workspace yet: run `omgp init`, fill `product.yaml` (name, locale, streams
with capacity, integrations), and if the product has a codebase, create
`brand/tokens.css` and `brand/BRAND.md` from it (see `omgp-prototype`).

## Integrations

- **Linear**: read with `omgp linear pull` or a Linear MCP/CLI if your agent has
  one. Write to Linear only after the user confirmed exactly what will be
  created or changed.
- **Analytics**: `integrations.posthog` in product.yaml (or whatever the team
  uses). Used by `omgp-explore` (how often does it happen?) and `omgp-rollout`.
- **Live agent**: if `agent.command` is set in product.yaml, the studio starts
  an agent for each live request; that agent follows `omgp-facilitate`.

## Example product used in these skills

All examples use **Acme Field**, a field-service app: dispatchers plan jobs in a
web app, technicians work them on their phones, end customers get visit
reminders. The running example project is `recurring-jobs` (dispatchers
re-create the same maintenance jobs every quarter by hand).
