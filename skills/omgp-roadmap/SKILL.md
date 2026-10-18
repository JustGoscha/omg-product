---
name: omgp-roadmap
description: Zoom out and plan across omgp projects. Places projects on the roadmap (when, size, confidence, stream, dependencies), keeps far-future items fuzzy, runs `omgp roadmap` and acts on its findings (conflicts, cycles, bottlenecks, overloaded streams, delegatable work, unscheduled high-priority items), imports initiatives and projects from Linear, and checks that projects ladder up to initiatives with a metric and to the lighthouses. Use when the user asks what to do next, about priorities, timelines, capacity, dependencies, quarter or half-year planning, "the roadmap", or wants to import from Linear.
---

# omgp-roadmap — zoom out

The roadmap answers: what do we work on, in which order, who does it, and what
waits for what. It is honest about uncertainty: near things are sharp, far
things are fuzzy.

Workspace format: `../omgp/references/format.md` (product.yaml `roadmap.streams`,
vision.md, initiatives, project frontmatter, "Time values").
Studio: `http://localhost:4747/#/`.

## 1. Check the ladder

Every level must hold up the one above it.

- [ ] `vision.md` has a `northStar` and lighthouses with a `when`.
- [ ] Every initiative has a `metric` with baseline and target, a `status`, a
      `when`, and ideally a `lighthouse`. No metric → ask the owner; don't invent one.
- [ ] Every active project lists `initiatives`. A project without one is either
      an orphan (ask why we do it) or a sign of a missing initiative.
- [ ] Every project is one problem, one user group, one metric. Two of anything
      → propose a split.
- [ ] Initiatives with no projects, or whose projects can't move their metric,
      are gaps. Report them.

## 2. Place projects

Fields: `when`, `size`, `confidence`, `stream`, `priority`, `dependsOn`.

**Resolution by distance** (don't fake precision):

| starts | `when` resolution | `confidence` | spec depth |
|---|---|---|---|
| within ~6 weeks | days (`2026-11-02`) | high / medium | scoped, handoff exists or is next |
| this quarter | month (`2026-12`) | medium | problem framed, open decisions listed |
| next quarter | quarter (`2027-Q1`) | low | problem in one paragraph |
| later | half or year (`2027-H2`) | low | name, one sentence, stage `idea` |

Far items get no full spec, no prototype, no kickoff. Work on them is waste
until they come closer; the studio blurs them on purpose.

**Size** in person-weeks: xs .5 · s 1 · m 2 · l 4 · xl 8. Projects above `xl`
are initiatives or must be split. With only `when.start`, the end is derived
from `size` and the stream's capacity.

**Dependencies** — choose the weakest kind that is true:
- `hard`: cannot finish before the other is done (needs its API, data, pipeline).
- `tight`: must be designed together; same people, same kickoff, or close coordination.
- `loose`: informs it; align when convenient.

Write a `note` saying what exactly is needed ("needs the `job_series` table"). If
only a small part is needed, consider splitting the other project so that part
ships first.

## 3. Run the analysis and act on it

Run `omgp roadmap`. For each finding:

| finding | what to do |
|---|---|
| **conflict** (starts before a hard dependency ends) | move the start after the dependency's end; or check whether it is really `hard`; or split the dependency so the needed part ships first |
| **cycle** | the projects are really one, or one dependency is not hard: merge them, or downgrade one edge to `tight` / `loose` |
| **bottleneck** (blocks ≥ 2) | start it early, staff it well, keep its scope tight; split out the part others need ("the table and API first, the UI later") |
| **stream overload** (load > capacity in a week) | move lower-priority work later, move delegatable projects to other streams, cut scope (`size`), or ask for capacity |
| **delegatable** (no hard or tight deps) | candidates for one person or a low-capacity stream (e.g. a working student): clear spec, small size, low risk; suggest the move |
| **unscheduled high priority** | give it a `when`, or lower its priority; both are the owner's call |

Run `omgp roadmap` again after changes until only accepted findings remain.

## 4. What you may change, what you propose

- **Change directly** and report: fuzzy placements (month or coarser), sizes
  you derived from a spec, missing `stream` on backlog items, dependency notes.
- **Propose and wait for confirmation**: moving anything with day-precise dates
  or `confidence: high` (people plan around it), changing `priority`,
  moving work between people's streams, dropping or pausing projects. These
  are decisions; list them with the reason and let the user decide, or prepare
  a short `review` session (via `omgp-kickoff`) when several people must agree.

## 5. Import from Linear

- `omgp linear pull` (needs `LINEAR_API_KEY`), or a Linear MCP if your agent
  has one: read initiatives and projects and write them as files.
- Map: Linear initiative → `initiatives/<id>.md`; project →
  `projects/<id>/project.md` with `linear: { id, url }`; target date →
  `when.end`; lead → `owner`; Linear status → `stage` (planned → idea or
  exploring, started → building, completed → done, canceled → dropped).
- Keep Linear's description under `## Deep dive`. Do not invent Problem, For
  whom or Metric; `omgp validate` will warn, and those warnings are the
  to-do list for `omgp-explore`.
- Re-running the import must not overwrite what people wrote in the files.
  Check the diff before accepting it.

## 6. Report

Give the user:
- the ladder gaps (initiatives without metric, orphan projects),
- what you changed,
- the findings left and your proposals, each with a reason,
- the next 2–3 projects that need preparation (explore, prototype, kickoff), and
- the studio URL `http://localhost:4747/#/`.

## Example placement

```yaml
---
id: recurring-jobs
name: Recurring maintenance jobs
initiatives: [less-admin-time]
stage: scoped
priority: high
size: m
confidence: medium
stream: core
when: { start: 2026-11-02 }
dependsOn:
  - on: calendar-performance
    kind: hard
    note: calendar must render 3 months of visits without paging
---
```

```yaml
---
id: customer-portal
name: Customer portal for visit history
initiatives: [self-serve]
stage: idea
priority: medium
size: l
confidence: low
stream: core
when: { start: 2027-H1 }
dependsOn:
  - { on: recurring-jobs, kind: loose, note: shows upcoming series visits }
---
```

## Done when

- [ ] Every active project has `when` (at the right resolution), `size`,
      `confidence`, `stream` and its dependencies with kind and note.
- [ ] `omgp roadmap` shows no unexplained conflicts or cycles.
- [ ] Overload and bottlenecks have a proposed fix.
- [ ] Changes to committed items were confirmed by the user.
- [ ] `omgp validate` passes.
