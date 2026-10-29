// Starter files for `omgp init` and `omgp new`.

export const productYaml = (name: string) => `name: ${name}
locale: en
brand:
  css: brand/tokens.css
  notes: brand/BRAND.md
roadmap:
  streams:
    - { id: core, name: Core team, capacity: 2 }
    - { id: student, name: Working student, capacity: 0.5 }
# integrations:
#   linear: { workspace: your-workspace }
#   posthog: { host: https://eu.posthog.com, project: 12345 }
# agent:
#   command: "claude -p --permission-mode acceptEdits"
`;

export const visionMd = `---
northStar: Write the one sentence that describes where the product is going.
lighthouses:
  - id: first-lighthouse
    name: A far goal you steer towards
    when: 2027-H2
    description: What is true for users when we get there.
---
Where we are going and why. Keep it short; the roadmap shows the steps.
`;

export const brandCss = `/* Visual language for prototypes. Link with ../../../brand/tokens.css */
:root {
  --color-bg: #ffffff;
  --color-surface: #f6f7f9;
  --color-text: #15171c;
  --color-muted: #5f6673;
  --color-primary: #3b5bdb;
  --color-danger: #d9480f;
  --radius: 8px;
  --font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
}
body { margin: 0; font-family: var(--font-body); color: var(--color-text); background: var(--color-bg); }
`;

export const brandMd = `# Brand

Describe how the product looks and talks: colors and when to use them,
typography, components, tone of UI copy. Prototype agents read this.
`;

export const initiativeMd = (id: string, name: string) => `---
id: ${id}
name: ${name}
summary: One sentence everyone in the company understands.
status: active
metric: { name: The number that tells us we got there, baseline: "?", target: "?" }
---
Why this matters.
`;

export const projectMd = (id: string, name: string, initiative?: string, stage = "idea") => `---
id: ${id}
name: ${name}
initiatives: [${initiative ?? ""}]
stage: ${stage}
priority: medium
size: m
confidence: low
dependsOn: []
---

## Problem
Who has the problem, what hurts, why it matters.

## For whom

## Metric
Which number tells us it is solved? Baseline → target.

## Solution

## Done when

## Out of scope
`;

export const sessionYaml = (id: string, title: string, kind: string) => `id: ${id}
title: ${title}
kind: ${kind}
status: draft
goal: What the room decides today, in one sentence.
participants:
  - { name: Someone, role: User, kind: user }
  - { name: You, role: Product, kind: decider }
sections:
  - id: context
    title: Why we're here
    phase: context
    steps:
      - id: problem-today
        type: slide
        title: The problem today
        body: |
          - One line per pain
  - id: problems
    title: Which problems matter?
    phase: problem
    steps:
      - id: p-first
        type: triage
        title: The first problem, in the user's words
  - id: decisions
    title: Decisions
    phase: decisions
    steps:
      - id: d-first
        type: choice
        title: The first decision
        level: product
        timing: now
        recommended: a
        options:
          - { id: a, label: Option A, summary: One line, pros: [], cons: [] }
          - { id: b, label: Option B, summary: One line, pros: [], cons: [] }
  - id: wrapup
    title: Wrap-up
    phase: wrapup
    steps:
      - id: q-open
        type: question
        title: What did we forget?
`;

export const rulesMd = `# Team rules

How this team wants omgp to work. Agents read this before every task and follow it
over the general skills. Add a rule when someone corrects how omgp works for you:
\`omgp learn "Problems are rated by severity, not priority" --why "a problem can't be nice to have"\`.

## Rules
`;
