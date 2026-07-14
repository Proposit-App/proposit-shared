# Plan

TDD: failing schema tests first, then the schema change, then docs + release.

1. **Tests (red).** Extend `src/schemas/api/auth/__tests__/index.test.ts`:
   - `MobileSessionRequest` accepts valid `email` and `testing-and-qa` bodies.
   - Rejects `email` missing `code`; rejects `testing-and-qa` missing `identity`.
   - New `EmailCodeRequest` / `EmailCodeResponse` describe blocks (accepts
     `{ email }`, rejects `{}` and extras; accepts `{ status: "sent" }`).

2. **Schema (green).** Add the two union members + `EmailCodeRequest` /
   `EmailCodeResponse` and their `Static` exports to
   `src/schemas/api/auth/index.ts`.

3. **Verify.** `pnpm run check` (typecheck + lint + test + build).

4. **Docs Sync.** Append additive entries to `docs/changelogs/upcoming.md` +
   `docs/release-notes/upcoming.md`.

5. **Release candidate.** `pnpm version minor`, rotate the upcoming docs to the
   new version, tag `v{version}`, `pnpm run build && pnpm pack`. Do NOT publish.

6. Leave the item active — orchestrator completes after the cross-node chain.
