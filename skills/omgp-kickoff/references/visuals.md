# Visuals for decisions: examples

Field definitions are in `../../omgp/references/format.md` (section Visuals).
This file shows how to use each type for a decision so that the studio's
compare view shows exactly what differs.

General rules:
- One visual type for all options of a choice.
- Same ids for the same things in every option. Change only what differs.
- `today` option with `baseline: true` + step `baseline: today` when something exists today.
- Keep each visual small: 3–7 states, 1–3 tables with only the relevant
  columns, 3–7 nodes. Leave out what does not change between options, unless
  it is needed to understand the picture.
- `caption` one line, saying what to look at.

---

## states — lifecycle decisions

"Do auto-created visits need a confirmation?" The `confirm` option adds one
state and two transitions; everything else keeps its id.

```yaml
baseline: today
options:
  - id: today
    label: Today
    baseline: true
    visual:
      type: states
      states:
        - { id: scheduled, label: Scheduled, kind: initial }
        - { id: in-progress, label: In progress }
        - { id: done, label: Done, kind: final }
        - { id: cancelled, label: Cancelled, kind: final }
      transitions:
        - { from: scheduled, to: in-progress, label: start, by: technician }
        - { from: in-progress, to: done, label: finish, by: technician }
        - { from: scheduled, to: cancelled, label: cancel, by: dispatcher }
  - id: confirm
    label: Dispatcher confirms
    visual:
      type: states
      caption: New status "Planned" until a dispatcher confirms
      states:
        - { id: planned, label: Planned, kind: initial, note: created by the series }
        - { id: scheduled, label: Scheduled }
        - { id: in-progress, label: In progress }
        - { id: done, label: Done, kind: final }
        - { id: cancelled, label: Cancelled, kind: final }
      transitions:
        - { from: planned, to: scheduled, label: confirm, by: dispatcher }
        - { from: planned, to: cancelled, label: discard, by: dispatcher }
        - { from: scheduled, to: in-progress, label: start, by: technician }
        - { from: in-progress, to: done, label: finish, by: technician }
        - { from: scheduled, to: cancelled, label: cancel, by: dispatcher }
```

## tables — data decisions

Show only the tables and columns that matter for the decision. Use the real
names from the codebase where they exist. See the `d-series-change` example in
SKILL.md and the full session in `example-kickoff.yaml`.

Typical data decisions and how the options differ:
- copy vs. reference → a copied column vs. an `fk` column
- one table vs. two → a second table with an `fk` back
- soft delete → an extra `deleted_at` column, `nullable: true`
- history → an extra `<thing>_events` table

## flow — systems, integrations, migration

"What happens to jobs dispatchers already copied?" Same node ids in every
option; the options differ in which nodes and edges exist.

```yaml
options:
  - id: leave
    label: Leave them
    visual:
      type: flow
      direction: LR
      nodes:
        - { id: old, label: Copied jobs (2 years), kind: store }
        - { id: disp, label: Dispatcher, kind: human }
        - { id: series, label: New series, kind: store }
      edges:
        - { from: disp, to: series, label: sets up each series by hand }
  - id: suggest
    label: Suggest series
    visual:
      type: flow
      direction: LR
      nodes:
        - { id: old, label: Copied jobs (2 years), kind: store }
        - { id: detect, label: Find repeats, kind: system, sub: "same title, regular gap" }
        - { id: disp, label: Dispatcher, kind: human }
        - { id: series, label: New series, kind: store }
      edges:
        - { from: old, to: detect }
        - { from: detect, to: disp, label: "suggests 380 series" }
        - { from: disp, to: series, label: confirms in one list }
```

## sequence — who tells whom, in which order

"When does the end customer hear about a visit?"

```yaml
visual:
  type: sequence
  actors: [Series, App, Customer, Technician]
  messages:
    - { from: Series, to: App, label: creates visit (90 days ahead) }
    - { from: App, to: Customer, label: "email: visit on 14 Nov" }
    - { from: App, to: Customer, label: "SMS: tomorrow 09:00–11:00", dashed: true }
    - { from: Technician, to: App, label: starts visit }
```

Options differ by which messages exist; keep actor names identical.

## prototype — UI decisions

Always the exact state and the one element under discussion.

```yaml
options:
  - id: ask
    label: Ask each time
    visual: { type: prototype, src: prototypes/series.html#scope-ask, focus: "[data-focus=scope-dialog]", height: 380 }
  - id: future
    label: Always all future
    visual: { type: prototype, src: prototypes/series.html#scope-future-only, focus: "[data-focus=scope-dialog]", height: 380 }
```

If the element you need has no `data-focus` hook or state, add it to the
prototype first (see omgp-prototype). Do not point at a whole screen and
describe in words which part matters.

The one place a full screen is right: the "solution in one picture" slide.

## matrix — scope, roles, comparisons

Scope by version (one matrix on a slide or the step, not per option):

```yaml
visual:
  type: matrix
  columns: [v1, v2, later]
  rows:
    - [Repeat every N weeks or months, true, true, true]
    - [Change all future visits, true, true, true]
    - [Pause a series, false, true, true]
    - [Move visits off public holidays, false, false, true]
```

Roles × rights, one matrix per option with identical rows and columns, so the
compare view highlights the changed cells:

```yaml
options:
  - id: dispatch-only
    label: Dispatchers only
    visual:
      type: matrix
      columns: [Create series, Change series, Skip one visit]
      rows:
        - [Dispatcher, true, true, true]
        - [Team lead, false, false, true]
        - [Technician, false, false, false]
  - id: leads-too
    label: Team leads too
    visual:
      type: matrix
      columns: [Create series, Change series, Skip one visit]
      rows:
        - [Dispatcher, true, true, true]
        - [Team lead, true, true, true]
        - [Technician, false, false, false]
```

Parameter decisions (3 vs 6 vs 12 months): put one comparison matrix on the
step itself and keep options short. This is the exception to "a visual per
option".

```yaml
- id: d-horizon
  type: choice
  title: How far ahead does the app create visits?
  body: |
    Visits further ahead are visible earlier but change more often.
  visual:
    type: matrix
    columns: ["1 month", "3 months", "12 months"]
    rows:
      - [Technicians see their next quarter, false, true, true]
      - [Visits in calendar per dispatcher, "~150", "~450", "~1,800"]
      - [A changed series touches, "~1 visit", "~3 visits", "~12 visits"]
  recommended: m3
  because: Technicians see their quarter, edits stay small.
  options:
    - { id: m1, label: 1 month }
    - { id: m3, label: 3 months }
    - { id: m12, label: 12 months }
```

## html — one small purpose-built mock

For one element or one line of copy that does not exist in a prototype.
Keep it tiny and use the brand variables if you can.

```yaml
visual:
  type: html
  caption: The badge on a visit that came from a series
  html: |
    <div style="font:15px system-ui;padding:16px">
      <b>Boiler service</b> · Harbor Bakery
      <span style="margin-left:8px;padding:2px 8px;border-radius:10px;background:#e8eefc;color:#2f5bd3;font-size:12px">↻ every 3 months</span>
    </div>
```

## image — today's reality

A screenshot of today's screen, a photo of the paper plan on the wall, a sketch
from the last meeting. Put files in `projects/<id>/assets/`:
`visual: { type: image, src: assets/today-calendar.png, caption: "Marco's calendar in week 41" }`.

## mermaid — anything else

Timelines and rollout plans:

```yaml
visual:
  type: mermaid
  code: |
    gantt
      dateFormat YYYY-MM-DD
      section Rollout
      Beta (3 customers) :2026-11-16, 14d
      All maintenance customers :2026-11-30, 14d
```

Prefer structured types when they fit; mermaid diagrams are not diffed.
