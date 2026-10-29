---
name: omgp-kickoff
description: Prepare an omgp session deck (kickoff, tech-review, review) that leads a room of busy, tired people to clear decisions in limited time. Mines the decisions hidden in a project (scope, permissions, data, states, integrations, migration, notifications, offline, rollout, tracking, compliance, cost), sorts them into product/ux/tech/business, now/later and one-way/two-way doors, cuts what can wait, picks the right picture for each, and writes 2–4 options with a recommendation. Use when a project needs scoping, before any meeting or workshop about a feature, when the user says "prepare the kickoff/meeting/workshop", or whenever you notice a decision that someone other than you should make.
---

# omgp-kickoff — prepare decisions so the room only has to decide

Every decision the room does not make will be made later by an implementing
model, silently. Your job: find those decisions, keep only the ones that must be
made now, and present each one so that a tired person can make it in minutes.

Workspace format: `../omgp/references/format.md` (Sessions, step types, Visuals,
Diffs). Full example: [references/example-kickoff.yaml](references/example-kickoff.yaml).

## Central principle: design for tired people

The people in the room come from back-to-back meetings. They will not read a
document. The session leads them, one small step at a time, to good decisions.

1. **Lead, never dump.** Never show a full prototype and ask for feedback. That
   produces opinions about colors and no decisions.
2. **Ease in, in this order:**
   1. the problem, in the participants' own words (quote them),
   2. the goal: what changes for them, which number moves,
   3. the solution in one picture,
   4. then walk through it piece by piece. For each piece ask only: is it
      important (`triage`)? Which decision does it need (`choice`)?
3. **One thing per step.** One problem, one feature, one question. Title ≤ 12
   words, body ≤ 3 short lines. Details go into option `body`, `pros`, `cons`
   or `notes`; the studio keeps them collapsed until someone asks.
4. **Show only what the step is about.** A `prototype` visual with `focus` on
   the one element, or a small purpose-built visual. Not the whole app.
5. **Simple before complex.** v1 before vision, product before tech, today
   before tomorrow.
6. **Every choice has a recommendation and a one-line reason**, so the room can
   simply agree.

7. **Two agreements, in this order.** A kickoff is done when the room agrees on
   two things: (1) the problems and how bad they are, (2) a scoped solution.
   Each part ends with a `checkpoint` step that shows the room what it said and
   asks: do we agree? Don't talk about solutions before the first checkpoint;
   everything in the second part builds on it.

Test every step: could someone who slept five hours decide it in two minutes,
looking only at the title, the picture and the recommendation? If not, split
it, cut it, or find a better picture.

## Workflow

1. **Gather.** `omgp status <project>`. Read project.md (open decisions!), the
   prototypes (state list, `data-focus` hooks), earlier sessions and results
   (`escalated` and `deferred` steps come back now), the initiative. If the
   codebase is available, read the data model and the screens involved; many
   decisions hide there.
2. **Mine.** Walk the checklist below. Write a raw list, one question per line.
3. **Sort** each question: level, timing, reversibility, decider.
4. **Cut** with the YAGNI table. Only what must be decided now goes in.
5. **Split** product kickoff vs. tech review (see "Tech decisions").
6. **Pick the picture** for each decision (visual rules).
7. **Write options**: 2–4, a baseline, your recommendation.
8. **Build the arc** and check the time budget.
9. **Create and write**: `omgp new session <project> kickoff --kind kickoff`,
   fill the YAML, run `omgp validate` until clean. Set project `stage: kickoff`.
10. **Click through** `http://localhost:4747/#/p/<id>/s/kickoff`: every step,
    every focus, every compare. Fix anything crowded or unreadable.
11. **Report**: URL, number of steps, estimated minutes, what you cut or
    deferred and why, questions someone must answer before the meeting.

## Decision-mining checklist

For each area ask: is there a decision here that someone other than the
implementer should make? Probes and typical options:
[references/decision-mining.md](references/decision-mining.md).

- [ ] **Scope & stages** — smallest version that moves the metric; explicitly out; later stages
- [ ] **Users & permissions** — who sees, creates, edits, deletes; roles; externals
- [ ] **Data model & ownership** — new entities, relations, source of truth, history, deletion
- [ ] **States & lifecycles** — statuses, who triggers each transition, end states, undo
- [ ] **Integrations** — which systems, sync direction, who is master, failure behavior
- [ ] **Migration of existing data** — what happens to today's records and habits
- [ ] **Notifications** — who learns what, when, on which channel; opt-out; volume
- [ ] **Mobile / offline** — who uses it on a phone; what must work without network
- [ ] **Rollout & flags** — who gets it first, flag, training, way back
- [ ] **Metrics / tracking** — events that prove the metric moved; baseline before release
- [ ] **Legal / compliance** — personal data, retention, consent, audit, contracts
- [ ] **Cost** — running cost (SMS, AI, storage), plan or pricing, support load

Also scan: edge cases (empty, one, thousands, two people at once), search, reporting, locale, accessibility.

## Sorting

| `level` | the question is about | usual `decider` |
|---|---|---|
| product | what we build, for whom, what is in or out | decider |
| ux | how it looks, flows, what it says | decider, user |
| tech | how it is built, invisible to users | tech |
| business | money, contracts, legal, pricing, support | decider |

- `timing: now` if it blocks the first issues, another team waits for it, or
  deciding later means a migration or rewrite. Otherwise `later`; write in
  `notes` when it must be decided ("before rollout", "after 4 weeks of usage").
- `reversibility: one-way` if undoing it costs a data migration, a broken
  promise or lost data: shape of the data model, IDs and public URLs or
  addresses, APIs or contracts others build on, the permission model, deleting
  or merging data, prices told to customers.
- `reversibility: two-way` if a flag, a deploy or a text change undoes it:
  layout, wording, defaults, thresholds, anything behind a flag.

## YAGNI: what goes into the session

| | one-way | two-way |
|---|---|---|
| **now** | Decide in the session. Best picture, honest cons, enough time. | Recommend and move fast: a quick choice or a triage the room confirms in seconds. |
| **later** | Decide only the part that keeps the door open ("store the rule, even if v1 shows 3 months"). Say what stays open. | Leave it out. List it under "Decided later" in the wrapup, with owner and trigger. |

- "We might need it" is not a reason to build it now. "Undoing it later costs a
  migration" is a reason to decide it now.
- Show both prices. Cheap now but closes a door → write it in `forecloses` and
  `cons` ("A whole series can never be changed at once"). Expensive now for a
  future that may not come → say so in `cons` ("+4 days for a case no customer
  asked for").
- Not everything needs a room. Two-way, invisible, conventional choices
  (library within the stack, file layout, naming) belong to the implementer.
  Keep them out of every session.

## Tech decisions

A tech decision goes into the **product** kickoff when any option changes what
users see or can do, shifts delivery by more than a few days, changes running
cost noticeably, or closes a product direction. Phrase it by its consequence,
not its mechanism: "Can a technician edit a visit without network?", not
"CRDT vs. last-write-wins". Set `level: tech`, `decider: [decider, tech]`, and
put the mechanism into option `body` or `notes`.

Every other tech decision goes into a separate **tech review** for the dev team:
`omgp new session <project> tech-review --kind tech-review`. It may be denser
(tables, sequences, more options); all other rules apply. When the tech review
finds product impact, the room marks the step `escalated`; bring it into the
next product session, rephrased by consequence.

## Session arc and time budget

| part | section `phase` | steps |
|---|---|---|
| | context | 1 slide: today we answer two questions (the problems, then the solution) |
| **1. Problems** | problem | 1 slide (today, in their words) + 3–6 `triage` of problems with `scale: severity`; optional poll; **`checkpoint`**: do we agree on the problems and how bad they are? |
| **2. Scoped solution** | solution | 1 slide goal + metric, 1 slide with the solution in one picture, one `triage` per feature (`scale: priority`), later stages |
| | decisions | 3–8 `choice` steps, scope first (what is in v1), then product, then tech; **`checkpoint`**: do we agree on this solution and its scope? |
| | wrapup | pilot, 1 `question` (what's missing?), 1 slide: decided later (owner, trigger), next steps |

A checkpoint takes 2–3 minutes. If the room says "not yet", go back to the
items it names (click them on the checkpoint) before moving on; if it says
"with concerns", write them down and go on.

Minutes per step: slide ~1, triage and poll 1–2, question 2–3, choice 3–6
(plan 6 for one-way). Add 15% buffer. If the sum exceeds `duration`: cut
two-way and later decisions, merge features, move tech to the tech review, or
plan a second session. Never cram. A 60-minute kickoff holds about 3 slides,
5 problem triages, 6 feature triages, 5 choices and the wrapup.

Order of decisions: start with an easy one to get the room moving; then
decisions that others depend on (if "copies" wins, the edit-scope question is
moot); one-way doors while people are fresh; product before tech.

## Visual selection rules

Never text-only options when a picture is possible.

| The decision is about | Visual |
|---|---|
| a lifecycle, statuses, what happens when | `states` |
| data: what is stored, relations, who owns it | `tables` |
| systems, integrations, data flow | `flow` |
| who calls or notifies whom, in what order | `sequence` |
| UI: a screen, a dialog, a label | `prototype` at the exact `#hash`, with `focus` |
| scope: what is in which version; roles × rights | `matrix` |
| one element or one wording, not in a prototype | small `html` mock |
| today's reality (screenshot, photo, sketch) | `image` |
| a parameter (3 vs 6 vs 12 months) | one comparison `matrix` on the step |

Diff rules, so the studio's compare shows exactly what differs:
- All options of a choice use the **same visual type**.
- **Stable ids**: the same state, table, column or node keeps its id in every
  option. Change only what really differs.
- If something exists today, add option `id: today` with `baseline: true` and
  set the step's `baseline: today`. If nothing exists, set `baseline` to the
  simplest option.
- Prototype options point at the same hash and the same `focus` in each variant.

Examples for every type: [references/visuals.md](references/visuals.md).

## Sanity check every step

Before a step goes into the deck, answer these. If one fails, change the step
type or cut the step.

- **Is this a real question for this room?** Someone present must be able to
  answer it and the answer must change what we build. If not: cut it, or make
  it a `slide` (information) or a note for later.
- **Which kind of question is it?**
  - A problem ("on sick leave nobody finds the mail") → `triage` with
    `scale: severity`. Never rate a problem with must/nice.
  - A feature or solution part → `triage` with `scale: priority`.
  - "Is it true that …" → `triage` with `scale: agreement`, or a `poll`.
  - "How often …" → `triage` with `scale: frequency`, or a `poll`.
  - Something nobody knows yet → `question`.
  - Two or more real ways to solve the same thing → `choice`. A choice with
    one sensible option is not a decision; make it a slide or cut it.
- **Can the room decide it?** A choice needs `problem` (what situation forces
  it), `why` (what goes wrong if we pick badly) and `facts` (what is already
  fixed), and every option a `consequence` (what happens for the people
  affected). If you can't write these three, you don't understand the decision
  yet: research it or ask the user instead of putting it in front of people.
- **Is it the right room?** Tech choices without product impact go to the
  tech review, not the user kickoff.

## Writing for the room

- The participants' language (product.yaml `locale`, or what they speak), plain
  words, their terms ("visit", not "job instance"). No acronyms or code names.
- Choice titles are questions ("Which visits change when a series changes?").
  Triage titles are statements ("Pause a series during renovation").
- One decision per step. A title with "and" is two steps.
- 2–4 options. "None of these" is built into the studio; don't add it.
- Option `label` ≤ 4 words, `summary` one line, ≤ 3 concrete `pros` and `cons`,
  `effort`, and `enables` / `forecloses` where they matter.
- `recommended: <option id>` plus `because: <one line>`, e.g.
  `because: Works like every calendar app.` The studio shows it on the card.
- Set `level`, `decider`, `timing`, `reversibility` on every choice; `decider`
  values must match participant kinds or names.
- Use `notes` for the facilitator: background numbers, what to ask if stuck.

## Example choice

```yaml
- id: d-series-change
  type: choice
  title: Can a dispatcher change a whole series later?
  body: |
    Decides how we store a series. Hard to switch after launch.
  level: tech
  decider: [decider, tech]
  timing: now
  reversibility: one-way
  recommended: rule
  because: Changing 7 visits one by one is today's pain again.
  baseline: today
  options:
    - id: today
      label: Today
      baseline: true
      summary: Single jobs, copied by hand
      visual: { type: tables, tables: [ { name: jobs, columns: [ { name: id, type: uuid, pk: true }, { name: scheduled_at, type: timestamp } ] } ] }
    - id: copies
      label: Create copies once
      summary: The app copies the job 12 months ahead, then forgets the series
      effort: s
      cons: [Changing a series means editing every visit]
      forecloses: [Pause a series, change all future visits]
      visual: { type: tables, tables: [ { name: jobs, columns: [ { name: id, type: uuid, pk: true }, { name: scheduled_at, type: timestamp }, { name: copied_from_id, type: uuid, fk: jobs.id, nullable: true } ] } ] }
    - id: rule
      label: Store the rule
      summary: A series keeps its rule; the app creates visits 3 months ahead
      effort: m
      enables: [Change all future visits, pause, holiday handling later]
      visual:
        type: tables
        tables:
          - { name: jobs, columns: [ { name: id, type: uuid, pk: true }, { name: scheduled_at, type: timestamp }, { name: series_id, type: uuid, fk: job_series.id, nullable: true } ] }
          - { name: job_series, columns: [ { name: id, type: uuid, pk: true }, { name: rule, type: text }, { name: paused_until, type: date, nullable: true } ] }
```
Compare against `today` shows: `copies` adds a column, `rule` adds a column and a table.

## Before you hand over

- [ ] Two parts, each closed by a `checkpoint`: problems (severity), then the scoped solution.
- [ ] Opening: problem in their words → goal and metric → solution in one picture.
- [ ] One thing per step; titles ≤ 12 words; bodies ≤ 3 lines.
- [ ] Every choice: 2–4 options, one visual type, stable ids, baseline,
      recommendation with reason, `level` / `decider` / `timing` / `reversibility`.
- [ ] Prototype visuals use the exact hash and `focus`; no whole-app dumps.
- [ ] Every now + one-way decision is in this session or a planned tech review.
- [ ] Later decisions are in the wrapup (owner, trigger) and in project.md.
- [ ] Time budget fits `duration` with 15% buffer.
- [ ] `omgp validate` passes; clicked through in the studio; compare works.
