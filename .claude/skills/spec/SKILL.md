---
name: spec
description: Generate an implementation-ready technical specification from an approved User Story and BDD specification.
---

# Spec Skill

## Purpose

This skill implements the **Technical Specification** stage of the AI-Assisted Development Workflow.

Its purpose is to transform an approved behavioral specification into a concise, implementation-ready technical specification.

This skill defines **how** the required behavior should be implemented.

It never implements the feature itself.

---

## Workflow Position

```
Brief
→ /story
→ User Story + BDD (.feature, draft)
→ Human Review (status: approved)
→ Technical Specification (this skill)
→ Human Review
→ Implementation
```

This skill is executed only after the User Story and BDD have been reviewed and approved.
See `docs/ai-development/WORKFLOW.md`.

---

## Preconditions

Before doing anything else, check that:

1. `specs/<feature>/<feature>.feature` exists;
2. its first line is `# Status: approved`.

If either check fails, **stop**. Do not fall back to `docs/briefs/<feature>.md`. Tell the user which one failed and that the BDD stage and its Human Review must come first. Do not write `spec.md`, not even a provisional or partial one.

## Primary Input

```
specs/<feature>/<feature>.feature
```

The `.feature` file is the primary behavioral source of truth.

---

## Required Repository Context

Before generating the specification:

1. Read `AGENTS.md`.
2. Read the approved `.feature` file.
3. Inspect the existing implementation related to the feature.
4. Reuse existing project patterns whenever possible.
5. List the existing `specs/*/spec.md` whose behavior this feature changes (shared endpoints, tokens, data). Note them under **Affected Components** as "Specs to update" and update them in the same change, so specs do not drift from the code.

Never design from assumptions if the repository already provides the answer.

---

## Responsibilities

Produce an implementation-ready technical specification that defines:

- implementation approach
- affected components
- system interactions
- contracts
- data flow
- constraints
- error handling
- edge cases
- verification requirements

The specification should be concise, practical and easy to implement.

---

## Rules

- Do not implement production code.
- Do not modify unrelated files.
- Do not redefine business behavior.
- Treat the `.feature` file as the behavioral source of truth.
- Preserve the intent of the approved User Story.
- Reuse existing project architecture and patterns.
- Prefer the smallest solution that satisfies the specification.
- Avoid unnecessary abstractions.
- Avoid introducing new infrastructure unless clearly required.
- Clearly mark assumptions.
- If a technical detail is undecided, create **Open Questions** instead of making business decisions. This never applies to a missing or unapproved `.feature` file (see Preconditions).

---

## Output

Create or update:

```
specs/<feature>/spec.md
```

---

## Recommended Structure

```md
# <Feature> Technical Specification

## Context

## Scope

### In Scope

### Out of Scope

## Current Behavior

## Proposed Behavior

## Affected Components

## Technical Design

## API / Integration Contracts

## Data / State Changes

## Error Handling

## Edge Cases

## Verification

## Assumptions

## Open Questions
```

Remove sections that are not applicable.

---

## Completion Criteria

The specification is complete when:

- the approved behavior is fully covered;
- affected components are identified;
- implementation approach is clear;
- important edge cases are documented;
- verification requirements are defined;
- unresolved issues are explicitly listed as **Open Questions**.

Do not begin implementation.

The next workflow stage is **Human Review**.