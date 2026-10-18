---
name: omgp-rollout
description: After an omgp project ships, find out whether it worked. Defines and verifies tracking (PostHog or whatever analytics the workspace uses), collects adoption and metric numbers, compares them with the baseline and target in project.md, prepares a rollout-review session (polls and triage on what to fix next), and leads the decision done, iterate or drop. Use when a project is at stage building near release, rollout or measuring, when the user asks "did it work?", "how is X used?", about adoption, analytics, events, PostHog, feature-flag rollout, or what to fix next after a release.
---

# omgp-rollout — did it work?

A project is not done when it ships. It is done when the metric moved, or when
we decided it won't and stopped. This skill closes the loop from
`building` → `rollout` → `measuring` → `done` (or back to `building`, or
`dropped`).

Workspace format: `../omgp/references/format.md` (project `metrics`,
`integrations` in product.yaml, sessions).
Tracking details: [references/tracking.md](references/tracking.md).

## 1. Before release: tracking plan

Do this while the project is `building`. A missing baseline cannot be
recovered later.

- [ ] For the project metric, write down which events and properties measure
      it. Reuse existing events where possible.
- [ ] Add adoption events: reached (saw it), tried (used once), repeated
      (used again in a later week).
- [ ] Name events `object_action` in past tense (`series_created`,
      `series_changed`), properties in snake_case (`scope`, `horizon_months`).
- [ ] Measure the baseline now if it is missing or only an estimate.
- [ ] Add the tracking work as issues if it is not in the handoff.
- [ ] After implementation: verify events arrive (live events view, or a query
      for the last hour on a test account) with the right properties.
- [ ] Create the insight (or saved query) and write its id into project.md:
      `source: { posthog: { insight: "<id>" } }`.

Write the plan into project.md under `## Rollout` (sections are conventions;
adding one is fine).

## 2. Rollout

- Who gets it first (beta accounts, one team), behind which flag, for how long.
- What we tell users (changelog, help text, customer success call).
- What makes us stop (error rate, support tickets, a metric getting worse).
- Set `stage: rollout` when the first real users have it.

## 3. Collect the numbers

Sources, in order of preference:
1. Analytics MCP or API if your agent has one (`integrations.posthog` in
   product.yaml gives host and project).
2. A read-only database query if the user allows it.
3. Numbers the user pastes in. Ask for exactly what you need.

Report as a funnel per user group from project.md, for a stated time window:

| step | question | example |
|---|---|---|
| reached | how many of the target users saw it? | 41 of 52 beta dispatchers |
| tried | how many used it once? | 33 |
| repeated | how many used it again in a later week? | 27 |
| metric | did the number move, for those who use it? | 90 → 22 min/week |

Be honest about the data: sample size, time window, seasonality, other
changes in the same period, self-reported vs. measured. Say "too early to
tell" when it is.

Write the numbers with date and source into `## Rollout` in project.md. Set
`stage: measuring` when the feature is with all target users and you are
waiting for the metric.

## 4. Gather what people said

- Support tickets and customer success notes about the feature.
- Bugs and requests in Linear (MCP or CLI if available).
- Annotations from earlier sessions that were deferred.
- Short quotes; who said it.

## 5. Rollout review session

Prepare with `omgp new session <project> rollout-review --kind rollout-review`.
Same rules as `omgp-kickoff` (design for tired people, one thing per step,
recommendation with a reason). Arc, about 30 minutes:

1. **context** — slide: the goal and the metric target, one line each.
2. **problem** — slide: the funnel and the metric against baseline and target
   (`matrix` visual). Slide: what users said (3–5 quotes).
3. **poll** — "Is the problem solved for <user group>?" `[yes, partly, no]`.
4. **triage** — one step per fix or request: must / should / nice / no.
5. **decisions** — choice: done / iterate / drop, with your recommendation.
6. **wrapup** — slide: next steps, owners.

Example steps: [references/rollout-review.yaml](references/rollout-review.yaml).

## 6. Done, iterate or drop

| signal | recommendation |
|---|---|
| target reached (or close and trending up), no must-fix left | **done**: `stage: done`, update the initiative's metric |
| users who use it hit the target, but few use it | **iterate** on discoverability and onboarding, not on the feature |
| many use it, metric does not move | **iterate** on the solution; re-check the problem (back to `omgp-explore` for the open question) |
| must-fixes from the triage | **iterate**: new issues, or a follow-up project if larger than ~1 week |
| after a fair window, few use it and the problem turned out small | **drop**: turn the flag off, remove the code, `stage: dropped`, write down what we learned |

Dropping is a valid outcome and saves maintenance. Removing the feature is a
one-way door for the users who do use it; it belongs in the session as a
choice, not in your notes.

After the decision:
- Update project.md: `stage`, `## Rollout` with the final numbers and the
  decision, and why.
- Update the initiative's metric if the project moved it.
- If iterating: follow-up issues via `omgp-handoff`, or a new project via
  `omgp-explore`; check the roadmap (`omgp roadmap`).
- `omgp validate`.

## Done when

- [ ] Tracking verified with real events; insight id in project.md.
- [ ] Numbers with window, source and caveats in `## Rollout`.
- [ ] Review session held, or the user decided without one.
- [ ] Stage set to done, building (iterate) or dropped, with the reason written down.
