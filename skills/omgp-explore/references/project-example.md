# Example project.md after exploration

```markdown
---
id: recurring-jobs
name: Recurring maintenance jobs
initiatives: [less-admin-time]
stage: exploring
priority: high
size: m
confidence: medium
stream: core
owner: Dana
stakeholders:
  - { name: Marco, role: Dispatcher (customer), kind: user }
  - { name: Priya, role: Head of Product, kind: decider }
  - { name: Jonas, role: Tech lead, kind: tech }
  - { name: Lea, role: Customer success, kind: expert }
metrics:
  - name: Minutes per week a dispatcher spends re-creating repeat jobs
    baseline: 90 min (estimate, 5 interviews)
    target: 15 min
    source: { posthog: { insight: "4411" } }
linear: { id: ACME-P-31 }
---

## Problem
Dispatchers at maintenance companies re-create the same jobs every quarter by
hand: boiler services, elevator checks, filter changes. A mid-size customer has
300–600 of these per quarter. They copy old jobs one by one, forget some, and
the end customer notices only when no technician shows up. 3 of the last 10
churn interviews named this.

## For whom
Dispatchers at customers with maintenance contracts (about 40% of accounts).
Not the target: repair-only businesses with one-off jobs.

## Metric
Minutes per week a dispatcher spends re-creating repeat jobs: 90 → 15.
Proxy until we measure directly: `job_duplicated` events per account per week
(today ~50). Secondary: forgotten maintenance visits per month (support tickets).

## Solution
Draft: a job can repeat on a schedule, and the app creates the upcoming visits
ahead of time.

## Out of scope
- Billing per maintenance contract
- Route planning for technicians
- Importing contracts from other systems

## Deep dive
### What exists
- `jobs` has no link between repeated jobs; dispatchers use "duplicate"
  (`job_duplicated`, ~2,100/week across all accounts, PostHog insight 4411).
- Linear: 14 customer requests tagged `recurring` (ACME-812, ACME-907, …).
- The calendar loads one week at a time; no view of the next quarter.

### Assumptions
- [value] Dispatchers trust visits the app creates for them. Check: ask 3 dispatchers.
- [usability] "This visit / all future visits" is understood without training. Check: prototype test.
- [feasibility] Generating 600 visits per account per quarter is cheap. Check: Jonas, 1h.

### Open decisions
- Store a rule or pre-created visits? — tech, now, one-way → kickoff
- When a series changes, which visits change? — ux, now, two-way → kickoff
- How far ahead are visits created? — product, now, two-way → kickoff
- What happens to existing duplicated jobs? — product, now, one-way → kickoff
- Remind end customers before a visit? — product, later (after v1 adoption)

### Parking lot
- "Copy last quarter" button (Marco)
- Contract object with price and visit plan (Lea) — likely its own project
```
