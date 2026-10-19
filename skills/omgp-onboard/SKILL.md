---
name: omgp-onboard
description: Set up an omgp workspace for how this person or company actually works, by interviewing them. Finds every project (folders, git hosts, trackers, other machines), sets the profile in product.yaml (personal or company, goals, what "done" means, focus), writes vision.md and rules.md with the decision criteria, and gives every project its stage, how far it is out in the world (reach) and its next move. Use when a workspace is new or still has the scaffold from `omgp init`, when the user says "onboard me", "set up omgp for us", "get an overview of all my projects", "what should I work on", or when projects have no reach or next yet.
---

# omgp-onboard — what are we deciding, and by what?

Prioritizing only works when the criteria are clear. A solo maker deciding between
side projects and a company deciding what to build next need different questions,
different stages that count and different people voting. This skill finds that out
once, writes it into the workspace, and every other skill and the Pulse use it.

Workspace format: `../omgp/references/format.md` (product.yaml `profile`, project
`reach` and `next`, `pulse`).

**Technically done is not done.** A project that is built but sits on one machine,
or is public but nobody knows about it, still needs a release, an integration, a
launch or marketing. `stage` says how far it is built, `reach` how far it is out in
the world, `next` what the next move is. The Pulse then compares next moves, not
project names.

## 0. Before asking anything: look

Gather evidence first, so the interview is about corrections, not dictation.

- Folders: siblings of the workspace, `~/dev`, `~/code`, `~/projects` (ask before
  reading outside them). Per folder: README first lines, last commit date, commit
  count, remote, live URLs (GitHub Pages, homepage, store links).
- Git host: `gh repo list --limit 200` (descriptions, homepage, private, last push).
  Repos without a local folder count too.
- Trackers: Linear (`omgp linear pull`), Notion, a roadmap file, if connected.
- Duplicates and forks: merge `x`, `x-old`, `vibe-x` into one project, mention them
  under `## Where`. Leave out clones of other people's repos, course
  assignments and empty helper folders, but list what you left out.

## 1. The interview

Ask in small batches (2–4 questions at a time, options where possible, always with a
free answer). Recommend; don't make them type what you can propose.

**Both:**
1. Personal or company workspace? Who decides, who should have a say (Pulse voters)?
2. What are the projects for? Personal: income, reputation/portfolio, learning, fun,
   tools I use myself. Company: strategy, revenue, retention, customers' pain,
   tech health.
3. When is a project done? `released` (public), `launched` (people were told: a
   post, a launch, customers informed), `traction` (used / paying). This becomes
   `profile.doneMeans`.
4. How many projects at once? Hours per week (personal) or people and streams
   (company). This becomes `profile.focus` and the streams.
5. Projects you can't see from here: other computers, other accounts, ideas only
   in your head. (One user restarted a game on another PC; no folder scan finds that.)

**Personal, add:**
- Improve what is out (users, polish, marketing) or start something new? Which
  projects feed each other (shared stack, audience, skills)? Write synergies in a
  `## Synergies` section of each project, and as `dependsOn` with `kind: loose`.
- What do you say no to? (Things that are fun but go nowhere, client work beyond X.)

**Company, add:**
- Where do decisions come from today (roadmap owner, sales asks, support, CEO)?
- Who votes in the Pulse, named or anonymous (`pulse.anonymous`), hosted for phones
  (`omgp serve --hosted --key …`, see the README)?
- Which stages do you really have? Map them to omgp stages; write the mapping into
  rules.md instead of inventing stages.

## 2. Per project: stage, reach, next

Propose from the evidence, in a table, and let the user correct in one pass:

| project | stage | reach | next |
|---|---|---|---|
| 30DayAnimator | done | released | Launch: email list + three posts with student results |

- `stage`: how far it is **built** (idea … done, paused, dropped).
- `reach`: how far it is **out**: unreleased · released · launched · traction.
- `next`: one sentence, the next move, concrete enough to start tomorrow. Typical
  moves: build X · release (deploy, store, publish) · integrate with Y · launch
  (post, mailing, Product Hunt, tell customers) · market (landing page, SEO, ads)
  · improve for users · maintain · sunset.
- Mark what you guessed: "_(guessed from the last commit — correct it)_" in
  `## Status`. Never present a guess as a fact.
- Paused projects stay in. "Revive or drop?" is a decision worth asking.

## 3. Write

- `product.yaml`: `profile` (kind, goals, doneMeans, focus, capacity), streams,
  `pulse` (daily, more, anonymous).
- `vision.md`: where this is going in a year, the goals in order, the decision
  criteria ("we pick what moves income within 3 months over what is fun", "a
  project is not done before it is launched"), what we say no to.
- `rules.md` via `omgp learn "…" --why "…"`: process rules other skills must follow
  (e.g. "Never set a project to done before reach is launched").
- `initiatives/<id>.md`: themes that group the projects (5–8, not more).
- `projects/<id>/project.md`: frontmatter with `stage`, `reach`, `next`,
  `initiatives`; sections `## Where`, `## Status`, `## Problem`, `## Solution`
  (what it is / does), `## Go-to-market` (for whom, how they find it, how it
  earns), `## Synergies`.
- Run `omgp validate` and fix errors.

## 4. Hand over

- `omgp roadmap` and the studio's findings: "built, not out in the world" and "more
  in progress than your focus" are the first things to talk about.
- Start the first Pulse round with them (`#/pulse`): five duels, which of two next
  moves matters more. Say that ratings settle after a few rounds, and that random
  opponents let forgotten projects come back.
- Summarize in chat: how many projects, what is in progress against focus, what is
  built but not out, and the three questions you could not answer from the files.
