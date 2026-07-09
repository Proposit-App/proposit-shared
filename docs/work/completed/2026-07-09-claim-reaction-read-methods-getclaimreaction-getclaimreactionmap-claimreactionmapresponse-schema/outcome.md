# Outcome

Slice ① of epic
`2026-07-09-claim-reaction-stance-ui-on-mobile-shared-read-methods-server-bulk-route-mobile-ui`.

## What changed

Purely additive to `@proposit/shared`:

- **Schema** — `src/schemas/api/claim-reaction/index.ts`: added
  `ClaimReactionMapResponse = Type.Record(Type.String(), ClaimReactionGetResponse)`
  and `TClaimReactionMapResponse`. Exposed automatically via the existing
  `@proposit/shared/schemas/api/claim-reaction` subpath (no `package.json`
  exports change needed).
- **Api-client** — `src/api-client/argument/claim-reactions.ts`: added
  `getClaimReactionImpl(config, argumentId, version, claimId)` →
  `GET /api/v1/argument/{argumentId}/{version}/claim/{claimId}/reactions`
  (validated against `ClaimReactionGetResponse`) and
  `getClaimReactionMapImpl(config, argumentId, version)` →
  `GET /api/v1/argument/{argumentId}/{version}/claim-reactions`
  (validated against `ClaimReactionMapResponse`). Both use the repo's GET
  client idiom (`parseResponse`, no request body), matching `getMyReviewImpl`.
- **Factory** — `src/api-client/factory.ts`: registered `getClaimReaction` and
  `getClaimReactionMap`, parallel to `createClaimReaction`/`deleteClaimReaction`.
- **Tests** — `src/api-client/argument/__tests__/claim-reactions.test.ts`: added
  TDD unit tests for both methods (correct URL + method + no body + parsed
  response, incl. a `null` `own` entry in the bulk map).

## Verification

- Full gate `pnpm run check` (typecheck + lint + test + build) run against a
  clean tree (the unrelated in-progress historical-figures fixture WIP was
  temporarily stashed): **PASS** — 672 tests passed (78 files), typecheck clean,
  lint clean, build clean.
- `pnpm pack` produces a clean tarball (`proposit-shared-0.36.0.tgz`, written to
  a scratch destination); no stray `*.tgz` left in the package root. Built
  `dist/` contains the new schema + both methods.

## Candidate version

**v0.36.0** (minor). `package.json` bumped, `docs/release-notes/v0.36.0.md` +
`docs/changelogs/v0.36.0.md` written, `upcoming.md` working files left fresh,
tag `v0.36.0` created.

**Publish gate satisfied:** `@proposit/shared@0.36.0` published to npm, tag
`v0.36.0` pushed, `origin/main` up to date. `proposit-server` re-pinned to
`^0.36.0`. Mobile stays on `^0.35.0` — its re-pin rides epic slice ②
(mobile claim-reaction stance UI), not this slice. Slice ① complete.
