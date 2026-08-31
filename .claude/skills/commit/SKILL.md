---
name: commit
description: >
  Commit message convention for this repo: semantic (Conventional Commits)
  one-liner, no body, no trailers, no Co-Authored-By. Load WHENEVER you write a
  commit message, run git commit, or stage changes to commit. Also on:
  "commit", "commit message", "write a commit", "git commit".
---

# commit

Repo commit convention. One rule set, no exceptions.

## Format
- **Semantic one-liner only.** `type(scope): subject` — single line, nothing else.
- **No body.** No blank line + paragraphs. No bullet lists.
- **No trailers / footers.** No `Co-Authored-By`, no `Generated with`, no issue refs unless asked.
- Imperative mood, lowercase subject, no trailing period. Aim ≤72 chars.

## Types
`feat` `fix` `docs` `chore` `refactor` `style` `test` `build` `ci` `perf`

**The type decides the released version** — semantic-release reads master's
history on every push (`L2-DEVOPS-29`):

| Type | Release |
|------|---------|
| `feat` | minor (1.2.0 → 1.3.0) |
| `fix`, `perf`, `revert` | patch (1.2.0 → 1.2.1) |
| everything else | none |

A PR of only `docs`/`chore`/`refactor`/`test`/`ci` commits ships no release.
That is intended, not a fault.

## Breaking changes — `!`, never a footer
Mark them `type(scope)!: subject`. The `!` is what triggers a **major** bump.

- `feat(auth)!: drop the legacy session cookie`

The usual Conventional Commits way — a `BREAKING CHANGE:` footer — is
unavailable here, because this repo bans bodies and footers. Forget the `!`
and a breaking change ships as a minor, silently.

## PR titles are commit messages
Merges land on master as one squashed commit whose subject is the **PR
title** (see `feat(web): … (#33)` in the log), and that subject is what
semantic-release analyses. A PR titled "Fix the thing" releases nothing.
Title every PR by these same rules.

## Scope
Optional. Package/area: `web`, `ui`, `auth`, `docs`, … Use when it sharpens meaning.

## Examples
- `feat(auth): add google login callback`
- `fix(ui): mount tooltip provider in root layout`
- `chore(web): run dev server on port 3070`
- `docs: bootstrap three-level doc system`

## Do NOT
- Multi-line bodies, "why" paragraphs, checklists.
- `Co-Authored-By:` or any co-author trailer.
- Tool/agent attribution footers.

## Commit command
`git commit -m "type(scope): subject"` — single `-m`, one line.
