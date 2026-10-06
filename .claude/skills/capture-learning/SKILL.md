---
name: capture-learning
description: Analyze a completed feature and recommend improvements to the development process, skills, AGENTS.md and the feature spec. Final workflow stage; does not review code.
---

# Capture Learning Skill

Usage: `/capture-learning <feature>`

## Purpose

Implements the **Capture Learning** stage of `docs/ai-development/WORKFLOW.md`.

Improves the process for future features. It is **not** a code review and changes nothing.

## Workflow Position

```
... → Implementation → Deslop / Ponytail → Code Review → Capture Learning (this skill)
```

Runs after Code Review of the feature is done.

## Inputs

- `specs/<feature>/<feature>.feature` and `spec.md`
- Code review findings from this session (or the PR), and the feature's commits/diff, only to see what happened, not to judge it
- `AGENTS.md`, `docs/ai-development/WORKFLOW.md`, `.claude/skills/*/SKILL.md`

If the `.feature` or `spec.md` is missing, **stop** and say so.

## Rules

- Never modify production code or the feature implementation.
- Do not review the code again.
- Do not write any file: the report goes to chat, a human applies it.
- Keep recommendations minimal; fewer, concrete ones beat a long list.
- Prefer changing an existing workflow rule or skill over introducing a new concept.
- `AGENTS.md`: only reusable, project-wide knowledge. Feature-specific decisions stay in `specs/<feature>/spec.md`.
- Every item names the file it would change and the exact change. If there is nothing to say for a section, write "Nothing."

## Output

```md
# Capture Learning

## What worked well

## Friction

## Workflow improvements

## Skill improvements

### /story

### /spec

## AGENTS.md recommendations

## Feature-specific notes

## Suggested next actions
```

## Completion Criteria

- Every section is filled or says "Nothing."
- Each recommendation points to a target file and a concrete edit.
- No recommendation belongs to the wrong place (project-wide in `AGENTS.md`, feature-specific in `spec.md`).
- Nothing was modified.

The workflow ends here; the human decides which recommendations to apply.
