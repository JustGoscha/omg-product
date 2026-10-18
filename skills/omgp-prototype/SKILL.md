---
name: omgp-prototype
description: Build standalone HTML prototypes for an omgp project — screens, states, variants, simulated behavior over time, or non-UI flows like voice, push notifications, SMS and email — styled with the workspace brand, filled with realistic domain data, and addressable by URL hash so session decks can deep-link and spotlight one element. Use when a project needs something to look at before a decision, when a session step needs a prototype visual or a variant, or when the user asks for a mockup, click dummy, wireframe or "show me how it would look".
---

# omgp-prototype — something to look at before deciding

A prototype exists to make a decision easier. Build exactly what the next
session needs to show, no more. It is not production code.

Workspace format: `../omgp/references/format.md` (sections "Prototypes" and the
`prototype` visual).

## Hard rules

- One file per concept: `projects/<id>/prototypes/<name>.html`. It opens on its
  own by double-click. No build step.
- **Never import from the product's code.** Read the repo to copy names, fields,
  statuses, labels, layout and density; then write plain HTML/CSS/JS. CDN
  libraries (Tailwind CDN, icon fonts, Google Fonts) are fine.
- Link the brand: `<link rel="stylesheet" href="../../../brand/tokens.css">` and
  use its CSS variables. Read `brand/BRAND.md` first (voice, components, do/don't).
- `<title>` = prototype name; `<meta name="description">` = one-liner.
- **Realistic domain data.** Real-looking names, addresses, amounts, dates near
  `today` from product.yaml, in the product's language. Include the awkward
  cases: long names, empty lists, 0 and 600 items, a cancelled item. Never
  lorem ipsum, never "Test 1".
- **Every state has a hash.** `#overview`, `#edit-series`, `#scope-dialog`.
  No hash = the default state. Decks point at the exact state:
  `prototypes/series.html#scope-dialog`. List all states in a comment at the top.
- **Spotlight hooks.** Give every element a deck might discuss a stable
  `data-focus` attribute (`data-focus="scope-dialog"`, `data-focus="repeat-picker"`),
  or at least a stable `id`. Decks spotlight it with
  `focus: "[data-focus=scope-dialog]"`; the studio dims the rest and scrolls it
  into view. Sessions never show a whole app and ask for feedback; they show
  one element at a time, so this hook is what makes a prototype usable in a
  deck. Use the same `data-focus` names across variants. Never rename one that
  a session references (search `sessions/*.yaml` for the name first).
- No feedback widgets, comment boxes or annotation tools; the studio injects
  its own annotation layer.

## Workflow

1. Read `project.md` (problem, users, open decisions) and the session that will
   use the prototype, if it exists. List the decisions the prototype must
   support. Each one needs a state or a variant.
2. Read the brand (`brand/tokens.css`, `brand/BRAND.md`). Missing and a codebase
   exists? Create them: copy colors, fonts, radii, spacing from the product's
   theme or CSS into variables; write BRAND.md with tone of voice, key
   components and 3–5 do/don't rules. Ask the user before inventing a brand.
3. Read the product's real data model and screens (schema, models, the page
   components). Use the same entity names, fields and status labels so it looks
   like the product, not like a generic mockup.
4. Start from [assets/starter.html](assets/starter.html): hash router, data as a
   JS array, `data-focus` hooks, optional simulate menu.
5. Build the states. One screen per state; keep the file under ~500 lines.
6. Add variants only where a real choice exists (see below).
7. Look at what you built. `omgp check <project> --shots --state <new hashes>`
   opens the prototype in headless Chrome, visits every #state the sessions use,
   reports script errors, blank pages and missing focus targets, and saves a PNG
   per state to `.omgp/shots/`. Fix every problem, then open the screenshots of
   the states you built and check that each shows what the step needs. A syntax
   check is not enough: never report a prototype as working without this.
8. Run `omgp validate` (it checks `src` paths in sessions). Set `stage:
   prototyping` while you work; back to `kickoff` when the session can use it.

## Variants

Build variants when the room must choose between ways of doing it (where the
action lives, one list vs. tabs, ask vs. decide automatically). Do not build
variants of things nobody needs to decide.

- Layout differs → one file per variant with the same data and the same state
  hashes: `series-a.html#scope-dialog`, `series-b.html#scope-dialog`. Options in
  a `choice` step then point at the same hash in each file.
- Only one element differs → one file, one state per variant:
  `#scope-ask`, `#scope-future-only`. Same `data-focus` name on the element in
  each state.
- Name variants by what they do (`ask-each-time`), not `v1`/`v2`.

## Behavior over time

When the decision is about what happens later (automation, reminders, sync,
offline, errors), simulate it:

- Add a small "Simulate" menu (collapsed, bottom-left) with events such as
  "3 months pass", "technician goes offline", "customer replies".
- Every result of an event must also be reachable by hash (`#after-3-months`),
  because decks show states, not clicks.
- Show time explicitly ("Today: 14 Oct" → "Today: 14 Jan") so the room sees
  what changed.

## Not every prototype is a screen

Voice flows, push notifications, SMS, emails, PDFs and API payloads can be
prototyped as HTML too. Patterns and snippets:
[references/non-ui.md](references/non-ui.md).

## Small purpose-built mocks

For a decision about one element (a dialog, a badge, a line of copy), a small
mock is often better than a full screen. Either make a focused state in the
prototype and spotlight it, or put a tiny `html` visual directly into the
session step (see `omgp-kickoff`). Tired people decide faster on one element
than on a full app.

## Example: state list and focus hooks

```html
<!--
  states:
    #overview        upcoming visits of all series (default)
    #edit-series     edit form of "Boiler service, Müller Bakery"
    #scope-dialog    "Change this visit or all future visits?"
    #after-3-months  overview after the simulate event "3 months pass"
-->
<section data-state="scope-dialog" hidden>
  <div class="dialog" data-focus="scope-dialog">
    <h2>Change the time to 08:00?</h2>
    <label><input type="radio" name="scope" checked> Only this visit (14 Nov)</label>
    <label><input type="radio" name="scope"> This and all future visits (7 visits)</label>
  </div>
</section>
```

Session step using it:

```yaml
visual:
  type: prototype
  src: prototypes/series.html#scope-dialog
  focus: "[data-focus=scope-dialog]"
  height: 420
```

## Done when

- [ ] Every decision the session needs has a state or a variant with its own hash.
- [ ] Discussed elements carry stable `data-focus` names, same across variants.
- [ ] Data is realistic, in the product's language, with edge cases.
- [ ] Brand tokens linked; looks like the product, imports nothing from it.
- [ ] `omgp check <project> --shots` reports ok; you looked at the screenshot of every state you built; `omgp validate` passes.
- [ ] You told the user the studio URLs of the states that matter.
