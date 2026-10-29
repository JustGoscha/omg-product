# Issues an agent can implement

An issue is good when a coding agent can finish it in one sitting without
asking a question, and a reviewer can check it without reading the whole spec.

## Fields

| field | content |
|---|---|
| Title | verb + object, in user terms: "Dispatcher pauses a series" |
| Role | who does it (dispatcher, technician, system, end customer) |
| Screen | where, with the prototype state: `prototypes/series.html#pause` |
| Behavior | what happens, 2–5 sentences, including what does *not* change |
| Acceptance | 3–6 checks, each verifiable by a test or a click |
| Spec | link to the handoff section and the decision id |
| Depends on | issue numbers |
| Size | hours, < 8; split if more |

## Splitting

Split by behavior, not by layer. Good slices for the example project:

1. `job_series` table and `series_id` on jobs (migration only, no UI) — walking skeleton starts here
2. Nightly job creates visits 3 months ahead for active series
3. Dispatcher creates a series from a job (repeat picker)
4. Dispatcher changes a series with the scope dialog
5. Series badge on visits in calendar and list
6. Suggest series from copied jobs: detection
7. Suggest series: confirmation list
8. Tracking events and baseline insight
9. Feature flag and beta rollout switch

Signs an issue is too big: acceptance has more than 6 checks; it touches more
than two screens; the title needs "and".

Signs an issue is too small: it cannot be checked on its own ("add column"),
unless it is a deliberate first step of a walking skeleton.

## Checks that work

- Observable: "the list shows 7 upcoming visits", not "visits are generated correctly".
- Include the negative case: "started visits never change".
- Include the edge case from the prototype data: long names, empty state, 600 items.
- Tracking: name the event and its properties.
