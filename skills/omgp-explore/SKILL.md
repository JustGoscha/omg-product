---
name: omgp-explore
description: Turn a raw idea or feature request ("we should build X", "customers keep asking for Y") into a framed omgp project — one problem, one user group, one metric — by interviewing the user one question at a time and researching what already exists (Linear, the codebase's data model, analytics). Writes Problem, For whom, Metric, Solution and Out of scope in project.md and lists assumptions and open decisions. Use when a project is at stage idea or exploring, when someone brings a solution without a clear problem, or before any prototype or kickoff.
---

# omgp-explore — from "build X" to a framed problem

Goal: a `project.md` that a room can make decisions on. It names one problem,
one user group, one metric, a first solution idea, what is out, which
assumptions are risky and which decisions are open. Stage moves
`idea` → `exploring` → (`prototyping` or `kickoff`).

Workspace format: `../omgp/references/format.md` (project.md section).

## Problem space vs solution space

People bring solutions: "add a repeat button", "we need a mobile app". Your job
is to walk back to the problem and keep it separate from the solution.

| Problem space (ask first) | Solution space (park until the problem is clear) |
|---|---|
| What happens today, step by step? | What should we build? |
| Who suffers, how often, how much? | Which screen, which button? |
| What does it cost (time, money, churn, errors)? | Which technology? |
| What did they try? Why did it not work? | How does it look? |

Rules:
- The `## Problem` section contains no feature words. "Dispatchers re-create
  450 jobs every quarter by hand", not "There is no repeat button".
- Write solution ideas you hear into a parking list under `## Deep dive`. Do not
  argue them away; they become options later.
- If the user insists on a solution, ask what it would change for whom. That
  answer is the problem.

## Workflow

1. **Set up.** If the project does not exist:
   `omgp new project <id> --name "…" [--initiative <id>]`. Set `stage: exploring`.
   Run `omgp validate`. Open `http://localhost:4747/#/p/<id>` for the user.
2. **Research before you ask**, so your questions are informed. Note sources.
   - **Linear / tracker** (Linear MCP or CLI if available, or `omgp linear pull`):
     existing issues, customer requests, earlier attempts, related projects.
   - **Codebase** (if available): data model (schema files, migrations, ORM
     models), the screens involved, existing statuses and permissions. Write
     down what exists and what it constrains ("jobs have no link to each other").
   - **Analytics** (`integrations` in product.yaml): how often does the
     situation happen, for how many accounts, trend. Look for a baseline for the
     metric.
   - **Workspace**: related projects and initiatives (overlap, dependencies).
3. **Interview the user, one question at a time.** Wait for the answer before
   the next question. Offer your best guess so they can just confirm: "I think
   it is mainly dispatchers at maintenance companies — right?" Stop when you can
   fill the sections below. Question bank: [references/interview.md](references/interview.md).
4. **Write project.md.** Frontmatter (stakeholders with `kind`, `metrics` with
   baseline and target) and the sections. Example:
   [references/project-example.md](references/project-example.md).
5. **List assumptions and open decisions** under `## Deep dive` (see below).
6. **Decide the next step** (see below), set `stage`, run `omgp validate`, and
   tell the user what you wrote and what is still unknown.

## The sections

- **Problem**: who, what hurts, how often, what it costs. Numbers where you have
  them, a quote or user story where you don't. 3–6 sentences.
- **For whom**: one user group. Name who is explicitly not the target.
- **Metric**: one number that moves if the problem is solved. Baseline (even
  rough, mark it "estimate"), target, source. Prefer a behavior you can measure
  over an opinion. If the outcome is slow (churn), add one leading indicator.
  - Bad: "Dispatchers are happier." Good: "Minutes per week a dispatcher spends
    re-creating repeat jobs: 90 → 15 (source: `job_duplicated` events)."
- **Solution**: the first idea in 1–3 sentences, marked as draft. No details.
- **Out of scope**: what people will assume is included but is not.

## Assumptions and open decisions

Under `## Deep dive`, add:

```markdown
### Assumptions
- [value] Dispatchers trust jobs the app creates for them. Check: ask 3 dispatchers.
- [feasibility] The calendar view can show 600 future visits without paging. Check: Jonas, 1h spike.
### Open decisions
- How is a series stored: rule or pre-created visits? — tech, now, one-way → kickoff
- Edit one visit vs. all future visits? — ux, now, two-way → kickoff
- Remind end customers before a visit? — product, later (after v1 adoption)
### Parking lot (solution ideas heard)
- "Copy last quarter" button (Marco)
```

Tag assumptions by risk: `value` (do they want it), `usability` (can they use
it), `feasibility` (can we build it), `viability` (does it work for the
business). Each gets a cheap way to check. Open decisions get a level
(product / ux / tech / business), now or later, one-way or two-way; the
`omgp-kickoff` skill picks them up.

## Next step: prototype, kickoff, or both?

Build a prototype (`omgp-prototype`, stage `prototyping`) when:
- people will disagree about how it looks or flows, or
- a behavior over time matters (notifications, automation, offline), or
- the users in the room cannot judge a description.

Go straight to a kickoff (`omgp-kickoff`, stage `kickoff`) when the open
decisions are about scope, data or rules and can be shown with diagrams.

Neither: the project is small, has no open decision anyone else owns, and the
user agrees. Then write Solution and Done when and hand it to `omgp-handoff`.

## Exploration session (several people know parts of the problem)

Instead of interviewing one person, prepare a short `kind: exploration` session
with `omgp new session <project> explore --kind exploration`: questions and polls
about today, a triage of candidate problems. Keep it to 20–30 minutes. Same
writing rules as in `omgp-kickoff`.

```yaml
- id: q-today
  type: question
  title: How do you plan next quarter's maintenance visits today?
  placeholder: Copy old jobs, spreadsheet, from memory, …
- id: p-forgotten
  type: poll
  title: How often was a maintenance visit forgotten last quarter?
  answers: [never, 1–2 times, 3–10 times, more]
- id: pr-recreate
  type: triage
  title: Re-creating repeat jobs takes hours every quarter
  level: product
```

## Done when

- [ ] Problem, For whom and Metric are filled; Problem has no feature words.
- [ ] Metric has baseline (or "estimate"), target and source.
- [ ] Research findings and sources are under `## Deep dive`.
- [ ] Assumptions (tagged) and open decisions (sorted) are listed.
- [ ] `stage` is set to the next stage; `omgp validate` passes.
- [ ] The user has seen the project in the studio and confirmed the problem.
