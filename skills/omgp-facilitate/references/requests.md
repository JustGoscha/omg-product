# Live requests: worked examples

All examples use the session `projects/recurring-jobs/sessions/kickoff.yaml`
from the `omgp-kickoff` example.

---

## option — the room describes its own option

Request (printed by `omgp listen`):

```json
{
  "id": "r-20261021-094012-d-series-change",
  "kind": "option",
  "project": "recurring-jobs",
  "session": "kickoff",
  "step": "d-series-change",
  "text": "Keep the rule, but create the visits only when the previous one is done",
  "sketch": "projects/recurring-jobs/assets/sketch-d-series-change.png",
  "status": "working"
}
```

What to do:
1. Look at the sketch. Here it shows an arrow from "visit done" to "next visit".
2. The siblings use `tables`. Copy the `rule` option's tables (closest), keep
   all names, change only what differs: no horizon, so nothing changes in the
   tables, but the rule now needs to know the last done visit.
3. Append:

```yaml
          - id: custom-1
            requestId: r-20261021-094012-d-series-change
            label: Next visit after done
            summary: The rule creates the next visit only when the previous one is done
            effort: m
            pros: [No future visits to change, Calendar stays short]
            cons: [Technicians cannot see their next quarter, A missed visit stops the series]
            forecloses: [Planning a quarter ahead]
            visual:
              type: tables
              tables:
                - name: jobs
                  columns:
                    - { name: id, type: uuid, pk: true }
                    - { name: customer_id, type: uuid, fk: customers.id }
                    - { name: scheduled_at, type: timestamp }
                    - { name: series_id, type: uuid, fk: job_series.id, nullable: true }
                - name: job_series
                  note: one per repeating job
                  columns:
                    - { name: id, type: uuid, pk: true }
                    - { name: customer_id, type: uuid, fk: customers.id }
                    - { name: rule, type: text }
                    - { name: paused_until, type: date, nullable: true }
                    - { name: last_done_job_id, type: uuid, fk: jobs.id, nullable: true }
```

4. `omgp validate` → `omgp done r-20261021-094012-d-series-change`.

Compare against `rule` now shows one added column; the cons tell the room what
it costs. If the sketch suggests a behavior change rather than a data change,
a `states` or `sequence` visual on a slide may help, but the option itself keeps
the siblings' type.

## option on a prototype step

Siblings use `prototype` visuals with `focus: "[data-focus=scope-dialog]"`.
Request text: "Ask, but default to all future visits".

Fast path (under 2 minutes):
1. In `prototypes/series.html`, copy the state `#scope-ask` to a new state
   `#scope-custom-1`, change the default radio button. Keep `data-focus="scope-dialog"`.
2. Append the option with
   `visual: { type: prototype, src: prototypes/series.html#scope-custom-1, focus: "[data-focus=scope-dialog]", height: 380 }`.

If the prototype is hard to change quickly: give the option a small `html`
visual of just the dialog now, `omgp done`, then add the prototype state and
switch the option's visual to it.

## revise-option

Request text: "Suggest series, but only for jobs from the last 12 months",
step `d-migration`, option `suggest`.

Edit the existing option, keep `id: suggest`:
- `summary`: "The app finds repeats from the last 12 months; the dispatcher confirms them"
- in the flow: change the `old` node label to "Copied jobs (12 months)" in
  this option only; keep the node id.
- adjust `pros` / `cons` if the change affects them.

If `d-migration` is already `decided` in the results, do not edit; fail with
"d-migration is already decided; add a new step to revisit it?".

## visual

Request text: "Show what the technician sees" on step `f-upcoming`.

Add a second visual (keep the existing one):

```yaml
        visuals:
          - { type: prototype, src: prototypes/series.html#overview, focus: "[data-focus=series-list]", height: 360 }
          - { type: prototype, src: prototypes/tech-phone.html#week, focus: "[data-focus=week-list]", height: 520, caption: Technician's week on the phone }
```

(`visual` → `visuals` when there is more than one.) If `tech-phone.html`
does not exist, use a small `html` mock at phone width instead.

## step

Request text: "We need to decide what happens when a technician is on holiday",
requested on step `d-rights`.

Insert after `d-rights`:

```yaml
      - id: d-tech-absent
        type: choice
        title: Who takes a series visit when the technician is away?
        body: |
        level: product
        decider: [decider, user]
        timing: now
        reversibility: two-way
        recommended: flag
        because: Dispatchers already plan absences.
        options:
          - id: flag
            label: Flag it
            summary: The visit stays unassigned and shows up in the dispatcher's list
            visual: { type: states, states: [ { id: scheduled, label: Scheduled, kind: initial }, { id: unassigned, label: Needs technician } ], transitions: [ { from: scheduled, to: unassigned, label: technician absent, by: system } ] }
          - id: backup
            label: Backup technician
            summary: Each series has a backup technician who takes over
            visual: { type: states, states: [ { id: scheduled, label: Scheduled, kind: initial }, { id: unassigned, label: Needs technician } ], transitions: [ { from: scheduled, to: scheduled, label: "technician absent → backup", by: system }, { from: scheduled, to: unassigned, label: backup also absent, by: system } ] }
```

## prototype

Request text: "Make the repeat picker also allow 'every 2nd Tuesday'".

- If only this step shows `#edit-series`, edit it in place.
- If other steps or options show the same state and should keep the old
  picker, fork: copy to `series-custom-1.html`, change the copy, point this
  step at `prototypes/series-custom-1.html#edit-series`.
- Keep `data-focus="repeat-picker"` on the changed element.

## Failing well

Fail when the request is unclear, impossible in the time, or targets a decided
step. The message is shown to the room, so make it actionable:

```bash
omgp done r-20261021-095501-d-horizon --fail "Unclear which option to change: 3 or 12 months?"
```
