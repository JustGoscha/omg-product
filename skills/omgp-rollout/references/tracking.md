# Tracking: plan, verify, measure

## The plan, as a table in project.md

Under `## Rollout`:

```markdown
### Tracking plan
| event | properties | answers | exists? |
|---|---|---|---|
| `series_created` | rule, horizon_months, from_suggestion | tried / repeated | new |
| `series_changed` | scope (this / future) | is the scope dialog understood? | new |
| `series_suggestion_confirmed` | count, rejected_count | does migration help? | new |
| `job_duplicated` | — | metric proxy: should drop | yes (insight 4411) |

Baseline (2026-10-01 → 2026-10-28, beta accounts): `job_duplicated` 52 / account / week.
Metric insight: 4412 (minutes per week, from session duration on the job form).
```

Rules:
- Every event answers a question you will ask in the review. No question, no event.
- Prefer one event with a property over several events (`series_changed` +
  `scope`, not `series_changed_this` and `series_changed_future`).
- Attach the account and the user's role, so you can segment by the user group
  in project.md.
- No personal data in event properties (names, addresses, phone numbers).

## Verify

After the tracking issue is implemented:
1. Trigger each event once on a test account.
2. Check it arrived with all properties: the analytics tool's live events
   view, or a query over the last hour.
3. Check the property values are what the code says (enum values, not
   `undefined`).
4. Note "verified 2026-11-04" next to the event in the plan.

## PostHog specifics (if the workspace uses it)

- product.yaml: `integrations.posthog.host` and `.project` say where to look.
- Use a PostHog MCP if your agent has one; otherwise the HTTP API with a
  personal API key the user provides (never write the key into the workspace).
- Useful insights: trend of the metric event (weekly, per account), funnel
  reached → tried → repeated, retention (used again in week 2, 3, 4).
- Write the insight id into project.md:
  `metrics[].source: { posthog: { insight: "4412" } }`.
- Feature flags: if the rollout uses a PostHog flag, compare flagged vs.
  not-flagged accounts for the metric, over the same window.

## Other analytics

Same plan and checks. If there is no analytics tool, a read-only SQL query on
the product database often answers adoption (count of `job_series` per
account, created per week). Ask before running queries against production.

## Reading numbers honestly

- State the window and the group: "beta accounts, 4 weeks after release".
- Compare with the baseline over a window of the same length and season.
- Small numbers: report counts, not only percentages ("27 of 33").
- Name other changes in the same period (pricing change, holidays, outage).
- Self-reported minutes are estimates; say so.
