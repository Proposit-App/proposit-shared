# proposit-shared — Remove `ParticipantRoles.REVIEWER` (dead enum cleanup)

**Origin:** Long-standing follow-up tracked in workspace `docs/initiatives/INDEX.md` and `proposit-server.md`. User decision 2026-05-18: dead, remove it.

**Status:** Ready to dispatch. Single cycle expected. Tiny scope.

## Capability changes

None — this is internal type/consts cleanup with no user-facing capability impact.

## Context

`ParticipantRoles.REVIEWER` ("can only add suggested edits and comments") was declared forward-looking in `src/consts/roles.ts:43` but never wired up. Workspace-wide audit (2026-05-18) confirmed:

- **Declaration:** `proposit-shared/src/consts/roles.ts:43`
- **Single read-side usage:** `proposit-server/src/model/argument/shared.ts:34` — `latestArgumentCTE` includes `ParticipantRoles.REVIEWER` in an access-filter `whereIn`. (That callsite is the **server's** cycle, not this cycle.)
- **No write path** anywhere inserts `'reviewer'` into `participants.role`.
- Mobile, tests, migrations: zero references.
- DB column `participants.role` is `varchar(255)` (no Postgres enum) — no migration needed in either repo.

## Scope

1. **Delete** the `REVIEWER: "reviewer"` line from `ParticipantRoles` in `src/consts/roles.ts:42-43`. Keep the comment-style on the remaining `OWNER` and `EDITOR` lines as-is.
2. The derived `TParticipantRole` type (`(typeof ParticipantRoles)[keyof typeof ParticipantRoles]`) auto-narrows to `'owner' | 'editor'`. No manual type edits required.
3. The `canEditArgument` helper at `src/consts/roles.ts:53-59` already only checks `OWNER` and `EDITOR` — leave it.
4. Verify zero in-repo references remain: `grep -rn "REVIEWER\|'reviewer'\|\"reviewer\"" src/ __tests__/ database/ 2>/dev/null` should produce no hits after the edit.

## Version cut

- Patch bump: `pnpm version patch` → **0.11.1**.
- Per repo CLAUDE.md: rename `docs/release-notes/upcoming.md` → `docs/release-notes/0.11.1.md` and `docs/changelogs/upcoming.md` → `docs/changelogs/0.11.1.md`, then start fresh `upcoming.md` files. **NB:** no `upcoming.md` exists today (rotated at 0.11.0 cut). For this small cycle, create `docs/release-notes/0.11.1.md` and `docs/changelogs/0.11.1.md` directly with the entry below; don't create empty `upcoming.md` placeholders.
- Tag `v0.11.1` at the cut commit.

### Release notes (`docs/release-notes/0.11.1.md`)

Internal cleanup only — no user-facing impact. Recommended one-liner:

> **v0.11.1** — Internal cleanup: removed an unused `reviewer` participant-role enum value that was declared forward-looking but never wired up. No user-visible behavior change.

### Changelog (`docs/changelogs/0.11.1.md`)

```
# 0.11.1

- [<commit-sha>] Remove unused `ParticipantRoles.REVIEWER` enum value. The role was declared forward-looking in 0.x but no write path ever populated `participants.role = 'reviewer'`, and no consumer's UI exposes it. Cleanup only — `TParticipantRole` narrows to `'owner' | 'editor'`. Coordinated server-side whereIn cleanup follows in a separate server cycle (orchestrator-tracked).
```

## Operating posture

- Superpowers plugin (`using-superpowers` at start; `verification-before-completion` before commit).
- Use the brain-style TypeScript sub-skill for any naming touches (shouldn't be any beyond the deletion).
- Run `pnpm run check` (typecheck + lint + test + build) before commit.

## Don't

- **Don't publish to npm.** Orchestrator coordinates publish after dual-review GREEN.
- **Don't push to origin.** Orchestrator handles push.
- Don't touch the server repo. This cycle is shared-only.
- Don't touch `canEditArgument` (already correct).
- Don't touch any other consts.

## Commit policy

Two commits (matches recent shared pattern):

1. `feat(roles): remove unused ParticipantRoles.REVIEWER enum value` — the actual edit.
2. `chore: cut 0.11.1` — version bump + release-notes + changelog file creation + tag.

Or single combined — your judgment. Two commits is cleaner because the cut commit is mechanical.

## Verify before commit

1. `pnpm run check` exits 0.
2. `grep -rn "REVIEWER\|'reviewer'\|\"reviewer\"" src/ __tests__/ database/` produces zero hits.
3. `package.json` version is `0.11.1`.
4. `docs/release-notes/0.11.1.md` and `docs/changelogs/0.11.1.md` exist.
5. `git tag` shows `v0.11.1` at HEAD.

## Output expectations

Brief return summary (≤500 words):

1. **Commits landed** — SHA(s) + message(s).
2. **Verification** — `pnpm run check` passed; grep produces zero hits.
3. **Tag** — `v0.11.1` confirmed at HEAD.
4. **Files touched** — list.
5. **Discoveries to flag** — anything unexpected.
