# Outcome

## What changed

- `src/schemas/api/auth/index.ts`: added required
  `password: Type.String({ minLength: 1, maxLength: 254 })` to the
  `testing-and-qa` member of `MobileSessionRequest`. `TMobileSessionRequest`
  derives automatically. Updated the header comment (no longer "credential-less").
- `src/schemas/api/auth/__tests__/index.test.ts`: existing testing-and-qa accept
  case now carries a password; added a missing-password reject case and an
  empty-password reject case; the empty-identity reject now carries a valid
  password to isolate the identity check.
- Docs-sync: one-line entries in `docs/release-notes/upcoming.md` and
  `docs/changelogs/upcoming.md`.

## TDD evidence

- Wrote tests first; before the schema change the missing-password and
  empty-password cases failed (`expected true to be false`).
- After the schema change: `pnpm run check` passed — typecheck, lint
  (prettier + eslint), 984 tests across 101 files, build. dist rebuilt and
  contains the new `password` field.

## Publish gate

- No `pnpm version`, no tag, no publish (gated at workspace root).
- Suggested bump: minor (additive schema field; pre-1.0 minor may carry
  breaking changes, and this one tightens the contract for `testing-and-qa`).
