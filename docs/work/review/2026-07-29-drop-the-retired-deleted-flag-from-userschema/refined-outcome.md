# Refined outcome — Drop the retired deleted flag from UserSchema

**Accepted.** The user approved closeout on 2026-07-29 across the whole epic.

## Evidence

- `pnpm run check` — exit 0; 106 test files / 1016 tests, typecheck, prettier,
  eslint and the `dist/` build clean.
- The consumer-impact claim was checked, not asserted: `proposit-server` and
  `proposit-mobile` both pass their full gates against the published package,
  and neither reads `.deleted` off a user object outside fixtures.
- `delete-user.test.ts` was re-pointed at `accountState === "deleted"` rather
  than having its assertion dropped — the same claim about the same outcome,
  made against the field that now owns it.

## Why this was the right shape

Breaking on paper, dead weight in practice. It is also what made the paired
server slice possible at all: server routes validate outgoing user rows against
`UserSchema` via `createResponse`, and `deleted` was **required**, so dropping
the database column without this would have failed validation on every route
that returns a user. Seven route tests going 500 is exactly how that was found.

## Deferred

Nothing.

## Closeout

Merged to `main`; shipped in **v0.53.0** (`c564d41`) — the breaking change that
version carries, and the reason it is a minor rather than a patch.
