# omgp workspace format

The workspace is a folder of plain files. Agents write them, the studio
(`omgp serve`) renders them and writes meeting results back. Nothing lives in a
database. Run `omgp validate` after every edit; it prints file-level errors.

```
<workspace>/
  product.yaml                     # workspace config (required, marks the root)
  vision.md                        # north star + lighthouses (optional)
  brand/                           # visual language for prototypes (optional)
    tokens.css                     #   CSS variables, fonts, base styles
    BRAND.md                       #   how the product looks and talks
  initiatives/<id>.md              # goals with a metric (1–6 months)
  projects/<id>/
    project.md                     # problem, users, metric, solution, roadmap fields
    prototypes/*.html              # standalone HTML prototypes
    sessions/<id>.yaml             # a meeting deck: context → problems → options → decisions
    sessions/<id>.results.json     # written by the studio during the meeting
    assets/                        # images, sketches, recordings
    handoff.md                     # compiled decisions → spec for implementing agents
  .omgp/requests/*.json            # live build requests from the studio (see "Live loop")
```

IDs are kebab-case and match the file or folder name. Dates are ISO
(`2026-10-21`). All paths inside a project are relative to the project folder.
Files are YAML 1.2; only `omgp validate` is authoritative (YAML 1.1 parsers in
Python or Ruby misread keys like `on:`).

---

## product.yaml

```yaml
name: Acme Field                  # product name
locale: en                        # en | de — UI labels in the studio
today: 2026-10-14                 # optional, pins "now" (for demos/tests)
brand:
  css: brand/tokens.css           # linked by prototypes; served at /files/brand/tokens.css
  notes: brand/BRAND.md
roadmap:
  streams:                        # parallel work lanes (teams, people, pairs)
    - id: core
      name: Core team
      capacity: 2                 # full-time people (0.5 = working student)
    - id: student
      name: Working student
      capacity: 0.5
integrations:                     # all optional; used by skills and `omgp linear pull`
  linear: { workspace: acme }
  posthog: { host: https://eu.posthog.com, project: 12345 }
agent:                            # optional: lets the studio start an agent for live requests
  command: "claude -p --permission-mode acceptEdits"   # prompt is passed on stdin
```

`profile` (written by the `omgp-onboard` interview) says who the workspace is for and what counts:

```yaml
profile:
  kind: personal          # personal | company
  goals: [income, portfolio]
  doneMeans: launched     # a project is only done this far out in the world (a reach), or never:
                          # after the build come launch, marketing, customers, improving. Until then
                          # it stays in the Pulse; built but not launched is listed on the roadmap
  focus: 3                # at most this many projects in exploring … rollout
  capacity: 10 h/week
pulse: { daily: 5, more: true, anonymous: false, kill: true, k: 32 }   # duels per round, keep going
                          # after a round, votes without names, "Kill it" (drop a project for good; default
                          # on for personal, off for company workspaces), how far one duel moves a rating
```

## vision.md

```markdown
---
northStar: A field service company runs its whole week from Acme Field, without spreadsheets.
lighthouses:                       # far goals; drawn as beacons at the end of the roadmap
  - id: zero-admin
    name: Dispatchers spend their time on exceptions, not on data entry
    when: 2027-H2                  # any time value, see "Time values"
    description: Repeat work plans itself; people only handle what is unusual.
---
Free-form narrative: where we are going and why.
```

## initiatives/<id>.md

Goal plus metric. 1–6 months. Groups projects.

```markdown
---
id: less-admin-time
name: Less admin time
summary: Dispatchers plan a week in under two hours.
status: active                     # planned | active | done | dropped
when: { start: 2026-10, end: 2027-Q1 }
lighthouse: zero-admin             # optional
metric: { name: Dispatcher admin hours per week, baseline: "6.5 h", target: "2 h" }
color: "#3a7bc8"                   # optional lane color
linear: { id: I-7 }
---
Why this matters, in a few sentences.
```

## projects/<id>/project.md

One problem, one user group, one metric. 1 day – 2 months.

```markdown
---
id: recurring-jobs
name: Recurring maintenance jobs
initiatives: [less-admin-time]
stage: kickoff        # idea | exploring | prototyping | kickoff | scoped | building | rollout | measuring | done | paused | dropped
reach: unreleased     # how far it is out in the world, apart from how far it is built:
                      # unreleased | ready (market-ready) | released (public) | launched (people were told)
                      # | marketing | customers (first users / paying) | improving (improve, scale, synergies)
openSource: true      # the code is public; independent of reach (an open-source project can be released,
                      # launched, or have users and contributors)
snoozed: 2026-11-19   # Pulse: shelved, out of the duels until that day, then back by itself
                      # (killed = stage: dropped, never comes back)
next:                 # the next steps, most important first, at most 3 (one string is fine too);
  - Release to the beta accounts   # Pulse cards show them, and the Pulse asks for them whenever
  - Help text for the series dialog  # a project is in the top 3
priority: high        # urgent | high | medium | low
size: m               # effort in person-weeks: xs .5 · s 1 · m 2 · l 4 · xl 8
confidence: medium    # high | medium | low — how sure we are about scope and timing
stream: core          # roadmap lane from product.yaml
when: { start: 2026-10-26, end: 2026-11-20, from: linear }   # optional; omitted = backlog
                      # from: linear (copied from Linear) | manual (set by hand, e.g. dragged
                      # on the roadmap) | estimate (an agent's guess, shown dashed)
dependsOn:
  - on: job-templates
    kind: hard        # hard = cannot start before the other one is done (it blocks)
                      # tight = must be designed together / coordinate closely
                      # loose = informs, align when convenient
    note: series are built from job templates
owner: Dana
stakeholders:
  - { name: Marco, role: Dispatcher (customer), kind: user }   # user | decider | tech | expert
metrics:
  - name: Minutes per week a dispatcher spends re-creating repeat jobs
    baseline: 90 min
    target: 15 min
    source: { posthog: { insight: "4411" } }   # optional
linear: { id: ACME-P-31, url: https://linear.app/... }
---

## Problem
Who has the problem, what hurts, why it matters. User stories welcome.

## For whom
## Metric
## Solution
## Done when
## Out of scope
## Deep dive
```

Sections are conventions, not enforced; `omgp validate` warns when Problem,
For whom or Metric is missing once a project is past `idea`.

### Time values

`when.start` / `when.end` / `lighthouse.when` accept, from sharp to fuzzy:
`2026-10-26` · `2026-11` · `2026-Q1` · `2027-H1` · `2027`. The studio blurs
items by resolution, by `confidence`, and by distance from today. With only
`start`, the end is derived from `size` (and the other way round); the roadmap
draws a derived side fading out.

**Where dates come from.** Never invent dates. Copy them from Linear
(`from: linear`); `omgp linear pull` keeps those in sync and removes dates Linear
no longer has. Dates people set by hand (`from: manual`, also set when someone
drags a bar) are never overwritten. If you must estimate, mark it
`from: estimate`: the roadmap draws it dashed, and the next pull replaces it.

---

## Prototypes — projects/<id>/prototypes/*.html

Standalone HTML. No build step, no imports from the product's code. Each file
must open on its own.

- Link the brand with a relative path: `<link rel="stylesheet" href="../../../brand/tokens.css">`.
  CDN libraries (Tailwind CDN, icon fonts, Google Fonts) are fine.
- `<title>` is the prototype name; `<meta name="description">` its one-liner.
- For multiple screens or states, react to the URL hash (`#overview`, `#edit-series`)
  so decks can point to an exact state: `prototypes/series.html#edit-series`.
- The studio injects an annotation layer. Don't build feedback tools into prototypes.
- A prototype does not need to be a UI. A voice flow, a notification sequence or
  an email can be prototyped as HTML too.

---

## Sessions — projects/<id>/sessions/<id>.yaml

A session is a meeting script: a short way in, then one decision after another.
The studio presents it full screen and records results.

```yaml
id: kickoff
title: Recurring jobs — Kickoff
kind: kickoff        # exploration | kickoff | tech-review | review | rollout-review
status: planned      # draft | planned | live | done
date: 2026-10-21
duration: 60         # minutes, optional
goal: Decide what v1 of recurring jobs includes and how a series is stored.
participants:
  - { name: Marco, role: Dispatcher at Harbor Facility Services, kind: user }
  - { name: Priya, role: Head of Product, kind: decider }
sections:
  - id: why
    title: Why we're here
    phase: context   # context | problem | solution | decisions | wrapup
    steps: [ ... ]
```

A kickoff answers two questions, in this order, and each part ends with a
`checkpoint` step:

1. **Do we agree on the problems, and how bad they are?** A little context
   (how it works today), then one `triage` card per problem with
   `scale: severity`. Checkpoint: the room sees the problems sorted by severity
   and agrees, or says what's missing.
2. **Do we agree on a scoped solution?** The goal (what changes, which number
   moves), the solution in one picture, then features as `triage` cards
   (`scale: priority`: needed at launch / soon after / nice to have / not
   needed), later stages, and the decisions that shape scope (product first,
   then tech). Checkpoint: the room sees what is in, what comes later, what is
   out, and what was decided, and agrees.

Then a short **wrapup** (pilot, open questions, next steps). Section `phase`s:
`context` → `problem` → `solution` → `decisions` → `wrapup`.

**Design for tired people.** A session leads the room; it never dumps a design
on them and asks for feedback. Rules:

- Ease in. First the problem in the room's own words, then the goal (what
  changes for them, which number moves), then the solution in one picture, and
  only then details and decisions.
- One thing per step: one problem, one feature, one question. Title ≤ 12 words,
  body ≤ 3 short lines. Everything else goes into the option `body`, `pros`,
  `cons` or `notes`, which the studio keeps collapsed until asked for.
- Show only what the step is about. Use a `prototype` visual with `focus` to
  spotlight the one element under discussion, or a small `html`/structured
  visual, instead of the whole app.
- Simple before complex: product decisions before tech, the basic version
  before the vision, today before tomorrow.
- Every choice has `recommended` plus `because` (a one-line reason), so the room
  can just agree.

### Step types

Every step has `id`, `type`, `title`, optional `body` (markdown) and optional
`visual` or `visuals` (see Visuals).

**slide** — explain something. No result.

```yaml
- id: s-today
  type: slide
  title: How a repeat visit is planned today
  body: |
    - Dispatchers copy last quarter's jobs one by one
    - A forgotten visit shows up when the customer calls
  visual: { type: flow, ... }
```

**triage** — swipe one item onto a 4-point scale. The `scale` says what the
swipe means; pick the one that fits the question:

| scale | for | values (↑ → ↓ ←) |
|---|---|---|
| `priority` (default) | solutions, features, requirements | must (needed at launch) · should (soon after) · nice (some day) · no |
| `severity` | problems: is this real, how bad is it | critical · noticeable · minor · none |
| `frequency` | how often something happens | daily · weekly · rarely · never |
| `agreement` | assumptions to check with the room | yes · rather · unsure · no |

A problem is never "nice to have": problems get `severity`, features
`priority`. Group related items under one section.

```yaml
- id: pr-forgotten
  type: triage
  scale: severity
  title: Visits get forgotten and customers notice first
- id: f-repeat
  type: triage
  title: Repeat a job every N weeks or months
  body: The app creates the upcoming visits ahead of time.
  level: product
  visual: { type: prototype, src: prototypes/series.html#edit-series }
```

**choice** — pick one option, or "none of these" (write/draw/talk your own).
Only for real alternatives: two or more ways to solve the same problem that
someone in the room can tell apart and has to pick between. Every choice
explains its problem space first, in `problem`, `why` and `facts`; the studio
shows them above the options. Every option says in `consequence` what happens
for the people affected if we pick it.

```yaml
- id: d-series-change
  type: choice
  title: Can a dispatcher change a whole series later?
  body: One line that frames the question.
  problem: |           # what situation forces this decision, in plain words
    Today every visit is a single job. When a customer moves the quarterly
    boiler check to Thursdays, the dispatcher changes every visit by hand.
  why: |               # what goes wrong if we pick badly or don't decide
    What we store now decides whether "change all future visits" is one click
    or one per visit. Switching later means migrating every series.
  facts:               # what is fixed: constraints, numbers, earlier decisions
    - 300–600 repeat jobs per mid-size customer per quarter
    - technicians must see the next 3 months offline
  level: tech          # product | ux | tech | business — who should care
  decider: [decider, tech]   # participant kinds or names who decide
  timing: now          # now = blocks the build · later = can wait, note when
  reversibility: one-way     # one-way (expensive to undo) | two-way (cheap to undo)
  recommended: rule
  because: Changing visits one by one is today's pain again.   # one-line reason, shown on the card
  baseline: today      # optional option id used as the diff base for all options
  options:
    - id: rule
      label: Store the rule
      summary: A series keeps its rule; the app creates visits ahead of time
      body: optional markdown
      visual: { type: prototype, src: prototypes/series.html#scope-dialog }
      consequence: Dispatchers change a series once; a nightly job keeps the next 3 months of visits up to date.
      pros: [Change all future visits at once]
      cons: [Needs a nightly job that creates visits]
      effort: m          # xs | s | m | l | xl or free text
      enables: [Pause a series, holiday handling]
      forecloses: []
    - id: copies
      label: Create copies once
      summary: The app copies the job 12 months ahead, then forgets the series
      ...
```

**question** — open question, answer typed (or dictated) during the meeting.

```yaml
- id: q-trust
  type: question
  title: What must be true before you trust visits the app created?
  placeholder: I can see them a week ahead, I get a summary, …
```

**poll** — quick vote with fixed answers, one per participant.

```yaml
- id: p-forgotten
  type: poll
  title: How many visits were forgotten last quarter?
  answers: [none, 1–5, 6–20, more]   # free labels
```

**checkpoint** — closes a part of the meeting. The studio shows everything the
room said in that part on one screen (triage cards grouped by their answer,
decisions with the chosen option, open items dashed; click one to go back) and
asks: agreed / agreed with concerns / not yet. Concerns go into the note. Phones
can vote. Put one at the end of the problem part and one at the end of the
solution part.

```yaml
- id: k-problems
  type: checkpoint
  title: Do we agree on the problems and how bad they are?
  body: If something is missing, say it now. Everything after builds on this.
  of: [problems]     # optional: section ids to sum up; default: every step since the previous checkpoint
```

Common optional fields on any step: `level`, `decider`, `timing`, `tags`,
`links` (`[{label, url}]`), `notes` (speaker notes, not shown to the room).

### Visuals

`visual: {...}` or `visuals: [{...}, {...}]`. Every visual may have `caption`.
Prefer the structured types: the studio draws them consistently and can
**diff** them (new / removed / changed in color) when options share ids.

| type | use for | fields |
|---|---|---|
| `prototype` | a screen or state of an HTML prototype | `src` (path + optional `#hash`), `focus` (CSS selector to spotlight; the rest is dimmed and it is scrolled into view), `height` |
| `states` | state machines, lifecycles, statuses | `states`, `transitions` |
| `tables` | database tables, columns, relations | `tables` |
| `flow` | data flow, architecture, process | `nodes`, `edges`, `direction` |
| `sequence` | who calls whom, in order | `actors`, `messages` |
| `matrix` | feature × option grids, comparisons | `columns`, `rows` |
| `mermaid` | anything else diagrammable | `code` |
| `image` | screenshots, photos, sketches | `src` |
| `html` | one-off custom visual | `html` (rendered in a sandboxed frame) |
| `markdown` | rich text block | `text` |

`states`, `flow` and `sequence` also take a `story`: a scenario the studio plays
step by step, highlighting one element at a time. `at` is a state, node or
message id.

```yaml
story:
  - { at: planned, text: "The nightly job creates the boiler service at Harbor Bakery" }
  - { at: assigned, text: "Marco assigns it to a technician" }
  - { at: overdue, text: "Not done 2 days after the date: the team lead gets a task" }
```

```yaml
# states — ids matter: the same id across options is the same state
visual:
  type: states
  states:
    - { id: planned, label: Planned, kind: initial }
    - { id: assigned, label: Assigned }
    - { id: overdue, label: Overdue, note: "task for the team lead after 2 days" }
    - { id: done, label: Done, kind: final }
  transitions:
    - { from: planned, to: assigned, label: assign, by: Dispatcher }
    - { from: assigned, to: overdue, label: "date passed, not done" }
    - { from: overdue, to: done, label: visit reported, by: Technician }

# tables — fk is "table.column"
visual:
  type: tables
  tables:
    - name: jobs
      note: one per visit
      columns:
        - { name: id, type: uuid, pk: true }
        - { name: customer_id, type: uuid, fk: customers.id }
        - { name: technician_id, type: uuid, fk: users.id, nullable: true }
        - { name: status, type: "enum(planned, assigned, overdue, done)" }

# flow — node kind: system | external | ai | human | store
visual:
  type: flow
  direction: LR          # LR | TB
  nodes:
    - { id: cron, label: Scheduler, kind: external }
    - { id: gen, label: /api/series/generate, sub: create visits 3 months ahead }
    - { id: db, label: jobs, kind: store }
  edges:
    - { from: cron, to: gen, label: nightly }
    - { from: gen, to: db }

# sequence
visual:
  type: sequence
  actors: [Dispatcher, App, Push, Technician]
  messages:
    - { from: Dispatcher, to: App, label: Move series to 08:00 }
    - { from: App, to: Push, label: POST /notifications }
    - { from: Push, to: Technician, label: 7 visits moved }
    - { from: Technician, to: App, label: opens app → sync, dashed: true }

# matrix — cells: true/false/"text"; first column is the row label
visual:
  type: matrix
  columns: [v1, v2, v3]
  rows:
    - [Repeat every N weeks or months, true, true, true]
    - [Pause a series, false, true, "with end date"]
```

**Diffs.** In a `choice`, when two options use the same visual type, the studio
offers "compare": it highlights what B adds, removes and changes relative to A
(or to `baseline`). Keep ids stable across options so diffs read cleanly. A
`baseline` option (e.g. `today`) can be listed as an option that is not meant to
be picked; mark it `baseline: true` on the option to hide its pick button.

---

## Pulse — pulse/<YYYY-MM-DD>/<voter>.yaml

What people feel matters most, from duels in the studio (`#/pulse`): two projects, "what is
more important?", in rounds of `pulse.daily`. The studio writes one file per person and day;
agents read the ranking with `omgp pulse [--json]`.

```yaml
voter: Anna
date: 2026-10-19
duels:
  - { win: offline-sync, over: csv-import }
  - { win: customer-portal, over: offline-sync }
  - { neither: [csv-import, job-templates] }   # neither matters right now
```

Every duel is an Elo match, applied in date order (`neither`: both lose to an average project, so
both drop, the higher-rated one more), so recent days weigh more. Opponents are
random, so a project from the bottom meets the top and jumps when it wins. Dropped projects
are left out; done ones too, once they are as far out as `profile.doneMeans`.

## Results — sessions/<id>.results.json

Written by the studio. Agents read it; edit only to fix mistakes.

```json
{
  "session": "kickoff",
  "startedAt": "2026-10-21T09:02:11Z",
  "updatedAt": "2026-10-21T10:01:40Z",
  "current": "d-series-change",
  "steps": {
    "d-series-change": {
      "status": "decided",              // decided | deferred | escalated | skipped
      "value": "rule",                  // option id | "other" | triage value | poll answer | agreed|concerns|not-yet | text
      "other": { "text": "…", "sketch": "assets/sketch-d-series-change.png", "requestId": "r-…" },
      "note": "Marco: customers move their slots about once a month",
      "reason": "",                     // for deferred/escalated: why, who, by when
      "votes": { "Priya": "rule", "Jonas": "copies" },
      "at": "2026-10-21T09:31:00Z"
    }
  },
  "annotations": [
    {
      "id": "a-1", "step": "f-repeat", "src": "prototypes/series.html#edit-series",
      "selector": "main > div:nth-child(2) select", "label": "select “Repeats”",
      "x": 0.42, "y": 0.61, "kind": "change",   // change | question | idea | praise
      "text": "Also offer every 2 weeks, for filter changes", "author": "Marco",
      "at": "2026-10-21T09:40:00Z"
    }
  ]
}
```

---

## Live loop — .omgp/requests/*.json

During a meeting someone can reject all options and describe their own (typed,
dictated or sketched), or ask for a change. The studio files a **request** and
the agent builds it into the session file; the studio reloads and shows it.

```json
{
  "id": "r-20261021-093112-d-series-change",
  "kind": "option",               // option | revise-option | revise-step | visual | step | prototype | comment
  "threads": ["t-…"],             // comment threads to address (revise-option, revise-step)
  "thread": "t-…",                // the one thread to address (comment)
  "project": "recurring-jobs",
  "session": "kickoff",
  "step": "d-series-change",
  "text": "Store the rule, but only create the next visit, and let team leads skip one from mobile",
  "sketch": "projects/recurring-jobs/assets/sketch-d-series-change.png",
  "status": "open",               // open | working | done | failed
  "createdAt": "…"
}
```

An agent serves requests with:

```bash
omgp listen [--timeout 600]   # blocks until the next request, prints it, marks it "working";
                              # exits 2 with "no request arrived" on timeout
omgp done <id> [--fail "reason"]
omgp note <project> <session> <step> "text"   # add to a step's notes without racing the studio
```

`option` names the target option for `revise-option`; `step` is the anchor
(new steps go right after it). `sketch` in a request is relative to the
workspace; `other.sketch` in results is relative to the project. When the
studio starts the agent itself (`agent.command`), the agent still calls
`omgp done`; if it exits without doing so, the request is marked done or failed
from its exit code.

To fulfil an `option` request: append a new option to the step in the session
YAML with `id: custom-<n>`, `requestId: <id>`, a real `visual` (same type as the
other options where possible, so it can be diffed), pros, cons, effort. Then
`omgp validate` and `omgp done <id>`. The studio shows the new option within a
second. If `agent.command` is set in product.yaml, the server starts the agent
itself for each request.

---

## Comments — projects/<id>/comments.json

People comment in the studio on any part of a brief, handoff or session: a
paragraph, selected words, a step, an option, one line of its pros, or one
element of a diagram. Agents read and answer them like review comments.
`comments.json` at the workspace root holds threads on initiatives and vision.

```json
{
  "threads": [
    {
      "id": "t-mv8ca7n68zo",
      "status": "open",                       // open | resolved
      "target": {
        "kind": "element",                    // text | step | element | prototype | file
        "file": "sessions/kickoff.yaml",      // relative to the project
        "step": "d-series-change",
        "option": "rule",
        "element": "column:jobs.series_id",   // see below
        "label": "jobs.series_id"
      },
      "comments": [
        { "id": "t-…-1", "author": "Jonas", "text": "series_id should not be nullable", "at": "…" },
        { "id": "c-…", "author": "agent", "agent": true, "text": "Made it required.", "at": "…" }
      ],
      "createdAt": "…"
    }
  ]
}
```

Targets: `text` (`file`, `quote`; the quote is the anchor, `line` only a hint,
and `omgp comments` shows the current line or "outdated"), `step` (`step`,
`option`, `field` like `pros[1]`), `element` (`state:<id>`,
`transition:<from>><to>`, `table:<name>`, `column:<table>.<column>`,
`node:<id>`, `edge:<from>><to>`, `actor:<name>`, `message:<n>`,
`row:<label>`, `cell:<row>|<column>`), `prototype` (`selector`), `file`.

```bash
omgp comments [project] [--all]     # open threads with what they point at
omgp reply <thread> "what you changed"
omgp resolve <thread>
```

Answer a thread after you changed the file, then resolve it. If it needs a
human decision, reply with the question and leave it open. Don't edit
comments.json by hand.

The studio also edits files in place (brief sections, step titles and bodies,
option fields). Those edits touch only the changed lines. Reload a file before
you change it if the studio may have written it.

## handoff.md

`omgp handoff <project> [--session <id>]` compiles results into
`projects/<id>/handoff.md`: problem, metric, decisions with rationale and
rejected alternatives, scope by triage (must / should / nice / no), answers,
change requests from annotations, deferred and escalated items, open questions.
Agents then enrich it into an implementation plan and issues.
