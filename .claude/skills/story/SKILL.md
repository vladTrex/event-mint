---
name: story
description: Generate a draft .feature file (User Story, acceptance criteria, Gherkin scenarios) from a feature brief in docs/briefs/<feature>.md.
---

# Story Skill

Usage: `/story <feature>`

Implements the **User Story + BDD** stage of `docs/ai-development/WORKFLOW.md`. It defines **what** should happen, never how.

## Preconditions

`docs/briefs/<feature>.md` must exist. If not, **stop** and say so. Do not invent a brief.

If `specs/<feature>/<feature>.feature` already exists, **stop** and ask before overwriting.

## Steps

1. Read `docs/briefs/<feature>.md`.
2. Read `AGENTS.md` for domain terms.
3. Write `specs/<feature>/<feature>.feature`.

## Output format

```gherkin
# Status: draft

Feature: <name>
  As a <role>
  I want <capability>
  So that <benefit>

  # Acceptance criteria
  # - <criterion>

  # Open questions
  # - <anything the brief leaves undecided>

  Scenario: <name>
    Given ...
    When ...
    Then ...
```

## Rules

- First line is exactly `# Status: draft`.
- Cover only behavior stated in the brief; undecided points go to Open questions, never guessed.
- Include happy path, error and edge-case scenarios the brief implies.
- No technical design, endpoints, schemas or code.
- Do not write `spec.md` or any code.

## After generation

**Stop.** Human review is next. A developer changes the first line to `# Status: approved`; only then may `/spec` run.
