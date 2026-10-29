# Decision mining: probes per area

How to use: for each area, read the probes against the project (project.md,
prototypes, the codebase's data model and screens). Every probe that has no
obvious answer, and whose answer someone other than the implementer should
own, becomes a candidate decision. Write it as a question, then sort it
(level, timing, reversibility, decider) and cut it with the YAGNI table.

Each area lists: probes · decisions that usually hide there · usual door type ·
picture.

---

## 1. Scope & stages

- What is the smallest version that moves the metric?
- Which features from the prototype are must, which are nice?
- What will people assume is included that is not? (contract billing, exports, mobile)
- Are there stages (v1 for one customer group, v2 for all)? What triggers v2?
- What is the deadline, and what gets cut if we miss it?

Hidden decisions: v1 boundary; which user group first; "build it right" vs.
"ship in 2 weeks". Door: two-way for features, one-way for promises to
customers. Picture: `triage` per feature, then a `matrix` (feature × v1 / v2 / later).

## 2. Users & permissions

- Who can see it? Create? Edit? Delete? Approve?
- Are there roles today, and does this need a new one?
- Can externals (end customers, subcontractors) see or act?
- Multi-site or multi-team accounts: does a user see everything or only their team?
- What happens when a person leaves the company?

Hidden decisions: role model, visibility rules, who can undo. Door: one-way
once customers rely on it (taking rights away hurts). Picture: `matrix`
(roles × actions), same rows and columns in every option.

## 3. Data model & ownership

- Which new things do we store? What is one record (one visit? one series?)
- What is the source of truth if the same data exists twice?
- Copy or reference? (copying an address into a visit vs. linking the customer)
- Do we need history (who changed what, when)?
- What happens on delete: hard delete, archive, cascade to children?
- What identifiers will others see or store (numbers, URLs, addresses)?

Hidden decisions: entity boundaries, copy vs. reference, delete semantics,
public IDs. Door: almost always one-way. Picture: `tables`, stable table and
column names across options.

## 4. States & lifecycles

- Which statuses does each thing have? Which are new?
- Who or what moves it from one status to the next (user, system, time)?
- What are the end states? Can something come back from an end state?
- What happens to children when the parent changes status (pause a series → its visits)?
- What does each role see in each status?

Hidden decisions: extra confirmation states, automatic transitions, undo.
Door: two-way if additive, one-way if existing statuses change meaning
(reports and integrations depend on them). Picture: `states`, `today` as
baseline.

## 5. Integrations

- Which external systems are touched (calendar, accounting, mail, SMS, maps)?
- Direction: do we push, pull, or both? Who is master if they disagree?
- What happens when the other system is down or slow?
- Do customers configure it themselves? Per account or per user?
- Rate limits, cost per call, contracts?

Hidden decisions: master system, sync timing, failure behavior. Door: one-way
for contracts and what customers configure, two-way for internal retries.
Picture: `flow` for the data path, `sequence` for timing and failure.

## 6. Migration of existing data

- What existing records are affected (the duplicated jobs of the last two years)?
- Convert automatically, offer conversion, or leave as is?
- Do old and new ways live side by side? For how long?
- Do reports or exports change numbers after the migration?
- Who checks the result, and can it be undone?

Hidden decisions: auto vs. assisted vs. none, coexistence period. Door:
one-way (converted data is hard to un-convert). Picture: `flow` (old records →
step → new records) or `tables` (before / after).

## 7. Notifications

- Who needs to know what happened, and when?
- Which channel: in-app, push, email, SMS, daily summary?
- How many messages per day in the worst case? Can people turn them off?
- Who pays per message (SMS)? Which language and sender name?
- What if the recipient has no phone number or email?

Hidden decisions: channel, frequency, opt-out default, sender identity. Door:
two-way, except what end customers come to rely on. Picture: `sequence`
(who notifies whom when), or a `prototype` of the message (see omgp-prototype
non-UI patterns).

## 8. Mobile / offline

- Which roles use this on a phone? In a basement, on a roof, in a lift shaft?
- What must work without network? Read only, or also edit?
- What if two people edit the same thing, one offline?
- Native app, mobile web, or both?

Hidden decisions: offline scope, conflict rule. Door: one-way for offline
editing (architecture), two-way for layout. Picture: `sequence` (offline edit,
reconnect, conflict) or `prototype` at phone width.

## 9. Rollout & flags

- Who gets it first (beta customers, one team, everyone)?
- Behind a flag? Who can turn it on?
- Do users need training, a changelog entry, a help article, a call from customer success?
- How do we go back if it goes wrong, and what happens to data created meanwhile?

Hidden decisions: beta group, default on/off, communication. Door: two-way,
except rollback of data. Picture: `matrix` (group × week) or `mermaid` timeline.

## 10. Metrics & tracking

- Which events show that the metric moved? Do they exist today?
- Do we have a baseline before release? If not, measure it now.
- Which user group and time window do we compare?
- Which property tells us the feature was used (e.g. `series_id` on a visit)?

Hidden decisions: the event list, what counts as success. Door: two-way, but
a missing baseline cannot be recovered later. Picture: `matrix` (event ×
property × question it answers).

## 11. Legal & compliance

- Do we store new personal data (end customer phone numbers, locations, voice)?
- Retention: how long, and who can delete it?
- Consent needed (SMS to end customers, recording calls)?
- Audit trail required by customers or regulation?
- Does a contract or SLA change?

Hidden decisions: consent flow, retention period, data location. Door:
one-way. Decider: business plus whoever owns compliance. Picture: `flow` of
the personal data, `matrix` of data × retention.

## 12. Cost

- Running cost per use (SMS, AI calls, storage, third-party API)?
- Which plan includes it? Does pricing change?
- Support load: what will customers ask, who answers?
- Build cost vs. value: is a smaller option enough to move the metric?

Hidden decisions: plan gating, usage limits, who pays. Door: one-way once
communicated to customers. Picture: `matrix` (option × cost per month at 10 /
100 / 1,000 accounts).

---

## Also scan

- **Edge cases**: empty, one, thousands; two people at the same time; time
  zones and public holidays; deleted parent records.
- **Search & reporting**: will people need to find or count this? Which
  existing reports change?
- **Locale**: languages, date and number formats, units.
- **Accessibility**: keyboard use, contrast, screen readers for the main flow.

## Who should decide

| If the decision mainly affects | decider |
|---|---|
| what users get and when | product owner (`kind: decider`) |
| how users work day to day | decider, with users in the room (`kind: user`) |
| cost, contracts, legal | business owner (`kind: decider`) and the expert |
| how it is built, with no user-visible effect | tech lead (`kind: tech`) |
| how it is built, with user-visible effect | decider and tech together |

If nobody in the planned participants can decide it, it does not belong in
this session: note it in project.md with the person who can, and tell the user.
