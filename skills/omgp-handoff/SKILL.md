---
name: omgp-handoff
description: Turn omgp session results into an implementation spec and issues that coding agents can follow. Runs `omgp handoff`, enriches handoff.md with decisions and rationale, must/should scope, data model, states, acceptance criteria, out of scope and deferred decisions with owners, updates project.md to stage scoped, and proposes issues of less than a day each. Pushes to Linear only after the user confirms. Use after a kickoff or review session, when the user asks for a spec, PRD, tickets, issues or "what do we build now", or before anyone starts building.
---

# omgp-handoff — from decisions to a spec agents follow

The handoff is the contract between the room and the implementing agents.
Everything the room decided is in it, with the reason. Everything it did not
decide is marked as open, with an owner, so no implementing agent decides it
silently.

Workspace format: `../omgp/references/format.md` (sections "Results" and
"handoff.md"). Template: [references/handoff-template.md](references/handoff-template.md).
Issue format: [references/issues.md](references/issues.md).

## Workflow

1. **Check the results.** `omgp status <project>`. Read every
   `sessions/*.results.json` of the project. Look for:
   - steps without a result (skipped or not reached),
   - `deferred` and `escalated` steps (`reason` says why, who, by when),
   - `other` values and `custom-*` options (the room's own ideas),
   - `annotations` on prototypes (change requests, questions).
   If a `now` decision has no result, tell the user before you continue: the
   spec will have a hole.
2. **Compile.** `omgp handoff <project> [--session <id>]` writes
   `projects/<id>/handoff.md`.
3. **Enrich** it into a spec using the template. Rules:
   - Do not invent decisions. Everything in "Decisions" must trace to a result
     (keep the step id, e.g. `d-series-change`) or to project.md.
   - What you derive yourself (a column name, an obvious validation) is marked
     *(inferred)*, so a human can spot it.
   - Every gap goes to "Deferred decisions" (has an owner) or "Open questions"
     (needs one). Each gets a safe default the implementer uses until decided,
     or "blocked" if there is no safe default.
   - Turn triage into scope: must → Must, should → Should, nice → Later,
     no → Out of scope. Keep the wording people saw.
   - Annotations of kind `change` become requirements under the screen they
     belong to; `question` ones go to Open questions.
   - Write "Done when" as checks a test or a person can verify.
4. **Update project.md** in the same pass:
   - `stage: scoped`
   - `## Solution`: the chosen solution in 3–5 sentences.
   - `## Done when`: the top acceptance criteria.
   - `## Out of scope`: from triage "no" and from decisions.
   - Adjust `size` and `confidence` if the decisions changed them; tell the
     user if that moves the roadmap (`omgp roadmap`).
   - Remove placed decisions from "Open decisions"; keep deferred ones there
     with owner and trigger.
5. **Propose issues** (format below). Show them to the user as a list first;
   write them into `handoff.md` under `## Issues` after they agree.
6. **Validate and show.** `omgp validate`; give the user the studio URL
   `http://localhost:4747/#/p/<id>` and a summary: decisions taken, open items
   with owners, number of issues.
7. **Linear (optional)**, only after explicit confirmation (see below).

## Rules for implementing agents (put them into every handoff)

Copy this block into handoff.md, under the summary:

```markdown
> **For implementing agents:** Follow the decisions below. If you hit a product,
> UX or business choice that this document does not cover, do not pick one
> silently: use the stated default if there is one, otherwise stop and add the
> question to "Open questions" with the options you see. Tech choices that are
> invisible to users and easy to undo are yours.
```

## Issues

Each issue is less than one day of work and can be implemented by an agent
without asking: it says who, where, what happens, and how to check it.

- Slice vertically where possible (data + API + screen for one behavior)
  rather than "all migrations", "all UI".
- Order them so something works end to end early (the walking skeleton
  first), and note dependencies between issues.
- One issue per behavior. If the acceptance list has more than ~6 checks,
  split it.
- Link the spec section and the prototype state the issue implements.
- Tracking events and the feature flag are issues too.

```markdown
### 3. Dispatcher changes a series: "only this visit" or "all future"
Role: dispatcher · Screen: Series → Edit (prototypes/series.html#scope-ask)
Behavior: Saving a changed series asks for the scope. "Only this visit" changes
the selected visit. "All future" changes every visit after today that is not
started, and the rule.
Acceptance:
- [ ] Changing the time with "only this visit" changes exactly one visit
- [ ] "All future" changes all not-started visits from today on, and the rule
- [ ] Started and done visits never change
- [ ] Event `series_changed` with property `scope` is sent
Spec: handoff.md#decisions (d-change-scope) · Depends on: 1, 2 · Size: ~6h
```

## Linear

Only after the user confirmed exactly what will be created. Show first:
project name and description, the list of issue titles, team, labels.

- Use a Linear MCP or CLI if your agent has one; otherwise ask the user to
  create them, or use the API with their `LINEAR_API_KEY` if they say so.
- Project description in this format:

```markdown
**Problem:** Dispatchers re-create ~450 maintenance jobs per quarter by hand; some get forgotten.
**Solution:** Jobs can repeat by rule; the app creates visits 3 months ahead; existing copies are suggested as series.
**Metric:** Minutes per week re-creating jobs, 90 → 15.
Spec: handoff.md in the omgp workspace (projects/recurring-jobs).
```

- Issue descriptions: the issue text from handoff.md, unchanged.
- Write the Linear ids back: `linear: { id, url }` in project.md and the issue
  ids next to each issue in handoff.md. Run `omgp validate`.

## When decisions change later

If a decision changes during building: do not edit the old decision in place.
Add the new decision with date, who decided and why, mark the old one
"superseded", and update the affected issues. If it is a one-way door,
put it in front of the decider first (a short `review` session via
`omgp-kickoff`).

## Done when

- [ ] Every `now` decision from the sessions is in the spec with its reason, or listed as missing.
- [ ] Deferred decisions have owner, trigger and a default (or "blocked").
- [ ] Scope (must / should / later / out) matches the triage.
- [ ] Data model, states and screens are concrete enough to build from.
- [ ] Done-when checks are verifiable.
- [ ] project.md is `scoped` with Solution, Done when and Out of scope.
- [ ] Issues are < 1 day each, ordered, agreed by the user.
- [ ] Nothing pushed to Linear without confirmation; `omgp validate` passes.
