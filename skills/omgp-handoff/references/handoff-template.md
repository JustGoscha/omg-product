# handoff.md template

`omgp handoff` produces the raw material (problem, metric, decisions with
rationale and rejected alternatives, triage scope, answers, annotation change
requests, deferred and escalated items, open questions). Rearrange and enrich
it into the structure below. Keep the decision step ids for traceability. Mark
everything you derived yourself with *(inferred)*.

```markdown
# Recurring maintenance jobs — Handoff

Sessions: kickoff (2026-10-21) · Decider: Priya · Owner: Dana · Status: scoped

> **For implementing agents:** Follow the decisions below. If you hit a product,
> UX or business choice that this document does not cover, do not pick one
> silently: use the stated default if there is one, otherwise stop and add the
> question to "Open questions" with the options you see. Tech choices that are
> invisible to users and easy to undo are yours.

## Summary
**Problem:** Dispatchers re-create ~450 maintenance jobs per quarter by hand; some get forgotten.
**For whom:** Dispatchers at customers with maintenance contracts.
**Metric:** Minutes per week re-creating jobs, 90 → 15. Proxy: `job_duplicated` per account.

## Decisions
| id | Decision | Why | Rejected | Door |
|---|---|---|---|---|
| d-horizon | Create visits 3 months ahead | Technicians see their quarter; edits stay small | 1 month (too short), 12 months (crowded) | two-way |
| d-series-change | Store the rule in `job_series`; visits link via `series_id` | Changing all future visits must be possible | Copies (closes "change all") | one-way |
| d-change-scope | Ask "only this visit / all future" on every change | Works like calendar apps | Always all future (accidental bulk edits) | two-way |
| d-migration | Suggest series from copied jobs; dispatcher confirms | Setup in minutes, dispatcher in control | Leave (a day per customer), auto (wrong guesses) | one-way |
| d-rights | Dispatchers create and change series; team leads may skip a visit | Fewer people editing rules | Team leads too | two-way |

Notes from the room: "Externals already know the visit dates from contracts" (Lea, d-horizon).

## Scope
**Must (v1):** repeat every N weeks/months · upcoming visits per series · change scope dialog · suggest series from copies · series badge on visits
**Should (v1 if time allows):** pause a series
**Later:** move visits off public holidays · end-customer reminders
**Out of scope:** contract prices and billing · route planning

## Data model
| table | change |
|---|---|
| `job_series` | new: id, customer_id → customers, title, rule (RRULE text), horizon_months (default 3) *(inferred)*, paused_until (nullable), created_by |
| `jobs` | add `series_id` → job_series, nullable |

Migration: none for existing rows; suggestions are computed, not stored *(inferred)*.

## States
Visits keep today's statuses (scheduled → in progress → done; scheduled → cancelled).
Series: active ⇄ paused (Should) → ended (rule end date reached).
Only not-started visits are ever changed by a series edit.

## Screens and behavior
- **Series → Edit** (`prototypes/series.html#edit-series`): repeat picker …
- **Scope dialog** (`prototypes/series.html#scope-ask`): …
- Change requests from the session:
  - "Assign should also allow team leads to skip" (Marco, annotation a-3) → covered by d-rights.

## Permissions
| action | dispatcher | team lead | technician |
|---|---|---|---|
| create / change series | ✓ | – | – |
| skip one visit | ✓ | ✓ | – |

## Tracking
`series_created` {rule, horizon} · `series_changed` {scope} · `series_suggestion_confirmed` {count}
Baseline before release: `job_duplicated` per account per week.

## Rollout
Flag `recurring-jobs`, on for 3 beta customers (Lea picks), then all maintenance customers after 2 weeks.

## Done when
- [ ] A dispatcher sets up a series in under a minute (prototype flow, timed with Marco)
- [ ] Visits exist for the next 3 months for every active series, every morning
- [ ] Changing a series never changes started or done visits
- [ ] Suggestions find ≥ 80% of the series Marco would set up by hand (test on Harbor's data)
- [ ] Events above arrive in analytics

## Out of scope
Contract prices, billing, route planning, importing contracts from other systems.

## Deferred decisions
| decision | owner | decide by / trigger | default until then |
|---|---|---|---|
| End-customer reminders | Priya | after 4 weeks of v1 use | none sent |
| Public holidays | Jonas | before rollout to all | visits stay on the holiday, flagged |

## Open questions
- What exactly counts as "the same job" for suggestions (title match? customer + address)? — needs owner

## Issues
(see the omgp-handoff skill for the format)
```
