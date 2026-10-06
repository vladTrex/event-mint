# AI-Assisted Development Workflow

```
Brief / Ticket
→ /story
→ User Story + BDD (.feature, draft)
→ Human Review                 ← gate
→ .feature approved
→ /spec
→ Technical Specification (spec.md)
→ Human Review                 ← gate
→ Implementation
→ Deslop / Ponytail
→ Code Review
→ Capture Learning
```

## Stages

| Stage | Purpose | Input | Output |
|-------|---------|-------|--------|
| User Story + BDD (`/story`) | What should happen? | `docs/briefs/<feature>.md` | `specs/<feature>/<feature>.feature` with `# Status: draft` |
| Human Review | Approve behavior | `.feature` | a developer changes the first line of the `.feature` to `# Status: approved` |
| Technical Specification (`/spec`) | How does the system satisfy it? | approved `.feature` (never the brief), `AGENTS.md`, existing code | `specs/<feature>/spec.md` |
| Human Review | Approve design | `spec.md` | `spec.md` approved by a human |
| Implementation | Build exactly what the spec says | `.feature` + `spec.md` | code + tests |
| Deslop / Ponytail | Simplify without changing behavior (rules in `CLAUDE.md`) | the diff | smaller diff |
| Code Review | Verify code against `.feature` and `spec.md` | diff + both files | findings |
| Capture Learning | Keep what was learned | review findings | reusable rules → `AGENTS.md`; feature decisions → `spec.md` |

## Rules

- A stage starts only when the previous stage's output exists. If it is missing or unapproved, stop and say so. Never substitute a provisional output.
- `/story` drafts the `.feature`; only a human approves it. `/spec` never runs on a draft and never falls back to the brief. `spec.md` is written by a human or drafted by `/spec` on request, and approved by a human.
- Code is never the specification. If code and spec disagree, fix one of them explicitly.
- Open questions stay in the `.feature` / `spec.md` until a human resolves them.
- Deslop / Ponytail never weakens or reinterprets requirements.

## Where things live

- Project-wide conventions → `AGENTS.md` (short).
- Feature-specific files → `specs/<feature>/` (`<feature>.feature`, `spec.md`)
- Briefs → `docs/briefs/<feature>.md`..
- Process → this file.
