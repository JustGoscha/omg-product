---
name: omgp-facilitate
description: Be the live co-pilot while an omgp session runs in the studio. Waits for requests with `omgp listen` and builds them into the session within 1–2 minutes — a custom option someone typed, dictated or sketched after rejecting all options, a revised option, a new visual, a new step, or a prototype change — then validates and marks them done with `omgp done`. Also takes notes into the results when asked, without ever changing recorded decisions. Use when a meeting is running or about to start, when the user says "join the meeting", "listen", "be my co-pilot", or when the studio started you for a request.
---

# omgp-facilitate — live co-pilot during a session

While people decide in the studio, someone may reject all options and describe
their own, or ask for a change. The studio files a request in
`.omgp/requests/`. You build it into the session file; the studio reloads and
shows it to the room. **Speed matters**: the room is waiting. Aim for under
1–2 minutes per request.

Workspace format: `../omgp/references/format.md` (sections "Sessions", "Live
loop", "Results"). Worked examples per request kind:
[references/requests.md](references/requests.md).

## Before the meeting

- [ ] `omgp serve` is running; the session opens at `http://localhost:4747/#/p/<id>/s/<session>`.
- [ ] `omgp validate` passes.
- [ ] Read the session YAML, project.md and the prototypes it uses, so you know
      the step ids, the visual types per step and the `data-focus` hooks. This
      is what makes you fast later.

## The loop

```bash
omgp listen --timeout 540     # blocks; prints the next request as JSON and marks it "working"
```

- If your agent can run commands in the background, run `omgp listen` in the
  background and react when it returns. Otherwise run it in the foreground with
  a timeout below your command time limit.
- No request before the timeout: run it again.
- After each request: handle it, then listen again.
- Stop when the user says so or the session `status` is `done`.

**Started by the studio for one request** (`agent.command` in product.yaml;
the request is in your prompt): handle that one request, run `omgp done <id>`,
and exit. Do not start `omgp listen`.

## Handling one request

1. Read the request JSON: `kind`, `step`, `text`, `sketch`. If `sketch` is set,
   open the image (path is relative to the workspace root) and look at it; the
   sketch often carries more than the text.
2. Read that step in the session YAML and its sibling options.
3. Make the **smallest valid edit**: insert lines, don't reformat or re-serialize
   the file, keep comments and order.
4. Run `omgp validate`. Fix errors in what you touched. Ignore unrelated
   errors elsewhere during the meeting; mention them afterwards. If you changed
   a prototype, run `omgp check <project> --shots`, fix what it reports and look
   at the screenshots of the states you changed. The worker checks again when
   you exit and sends you back if the prototype is broken.
5. Run `omgp done <id>`. If you cannot do it, run
   `omgp done <id> --fail "<one short sentence the room can read>"`.

Take a good-enough structured visual now over a perfect prototype in five
minutes. If a prototype change would take longer, deliver the option with a
structured or small `html` visual first, mark the request done, then improve
the prototype and point the option at it.

## Per request kind

**`option`** — the room rejected all options and described its own.
- Append to the step's `options`: `id: custom-<n>` (next free number in this
  step), `requestId: <request id>`.
- `label` ≤ 4 words in the room's own words; `summary` one line.
- `visual`: the **same type as the sibling options**. Copy the closest
  sibling's visual and change only what the request changes, keeping all ids,
  so the compare view shows exactly the difference.
- `pros`, `cons` (≤ 3 each, concrete and honest, including what it
  forecloses), `effort`, `enables` / `forecloses` where they matter.
- Do not change `recommended`, and do not reorder or remove other options.

**`revise-option`** — rebuild an existing option from the request text and
the comment threads it lists (`omgp comments <project>` shows each with its
target, e.g. `column:jobs.series_id` or `pros[1]`). Keep its `id` (votes and
results refer to it). Update visual, pros, cons and effort so they stay
consistent; keep element ids stable so the compare view still diffs. Then
`omgp reply <thread> "<what changed>"` and `omgp resolve <thread>` for each
thread you handled.

**`revise-step`** — the same for a whole decision: options, visuals,
`recommended` and `because`. Keep option ids that still make sense.

**`comment`** — one thread asked to be fixed ("Fix with agent" in the studio).
Change what its target points at, reply, resolve. If it needs a human
decision, reply with the question and leave it open.

**`visual`** — add or replace the visual of the step (or of the named option).
Follow the visual rules of `omgp-kickoff`: lifecycle → `states`, data →
`tables`, systems → `flow` / `sequence`, UI → `prototype` with `focus`,
scope → `matrix`.

**`step`** — insert a new step right after the requested step, with a unique
id. Usually a `choice` (a decision that just came up) or a `question`. Same
writing rules as `omgp-kickoff`: one decision, short title, recommendation
with reason if you have one.

**`prototype`** — edit the prototype HTML. If other steps show the same file
and the change would alter what they show, fork it
(`<name>-custom-<n>.html`) and point only this step or option at the fork.
Keep existing hashes and `data-focus` names working.

## Never

- Never change a recorded decision: do not edit `status`, `value` or `votes`
  in `*.results.json`.
- Never modify an option that the room already picked, or a step that is
  already `decided`. Fail the request with a reason ("d-horizon is already
  decided; add a new step to revisit it?").
- Never remove options or steps during a meeting.
- Never argue with the room inside the file. If you see a risk in their
  option, write it as a con.

## Notes into the results

When the user asks you to take notes:
- Write to the `note` of the step being discussed (`current` in
  `sessions/<id>.results.json`).
- Append, never overwrite: `existing note` + `\n` + `Name: what was said`.
- The studio writes this file too. Read it immediately before writing, change
  only `note` fields, write it back at once. Never touch `status`, `value`,
  `votes` or `annotations`.

## After the meeting

- Run `omgp validate` and fix anything left.
- Tell the user which requests you handled and which failed.
- Suggest the next step: `omgp-handoff` (results → spec and issues).
