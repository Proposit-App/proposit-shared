# Outcome

Implemented the `@proposit/shared` slice of the claim quick-reactions epic: the
wire schema, API request/response bodies, api-client methods, and the
stance-validation helper — all reusing the review vocabulary
(`TrivalentValue` + `ClaimReasonCode`), no parallel enum. Built TDD (failing
test first for every new function/schema).

## What changed

- **`getStanceForClaimReason(code): TTrivalentValue`** added to
  `src/engine/review/reasons.ts` beside the reason buckets — reverse of
  `getClaimReasonsForValue` (true-bucket → true, false-bucket → false, otherwise
  null; unrecognized code → null). Exported via the existing
  `@proposit/shared/engine/review/reasons` wildcard subpath (no exports change).
- **`ClaimReactionSchema`** (+ `TClaimReaction`, `TClaimReactionSafe`) in
  `src/schemas/model/claim-reaction.ts`:
  `{ id, argumentId, argumentVersion, claimId, claimVersion, value, reasonCode,
  userId, createdOn }` — `value` and `reasonCode` both required; `TClaimReactionSafe`
  omits `userId`/`createdOn`. Re-exported from `schemas/model/index.ts`.
- **API bodies** in `src/schemas/api/claim-reaction/index.ts`:
  `ClaimReactionCreateRequest` (`{ value, reasonCode }`, single-select — no
  `reactionsToRemove`), `ClaimReactionCreateResponse` (`{ addedReaction }`),
  `ClaimReactionGetResponse` (`{ counts: { affirm, disagree, neutral }, own:
  Nullable({ value, reasonCode }) }`), `ClaimReactionDeleteResponse`
  (`{ removedReaction }`), plus `ClaimReactionSelectionSchema` /
  `ClaimReactionStanceCountsSchema` and all `T…` types.
- **api-client** in `src/api-client/argument/claim-reactions.ts`:
  `createClaimReactionImpl` / `deleteClaimReactionImpl` over the nested route
  `/api/v1/argument/[id]/[version]/claim/[claimId]/reactions(/[reactionId])`;
  registered `createClaimReaction` / `deleteClaimReaction` in
  `src/api-client/factory.ts`.
- **Exports:** new `./schemas/api/claim-reaction` subpath in `package.json`
  (`types`/`import`/`default` triplet). No other subpath needed — model rides
  `./schemas`, helper rides `./engine/*`, api-client rides `./api-client`.
- **Docs:** `docs/changelogs/upcoming.md` + `docs/release-notes/upcoming.md`
  updated (additive Public-API surface).

## Files

Added:
- `src/schemas/model/claim-reaction.ts`
- `src/schemas/api/claim-reaction/index.ts`
- `src/api-client/argument/claim-reactions.ts`
- `src/schemas/__tests__/claim-reaction.test.ts`
- `src/schemas/__tests__/claim-reaction-api.test.ts`
- `src/api-client/argument/__tests__/claim-reactions.test.ts`

Changed:
- `src/engine/review/reasons.ts` (+ `src/engine/review/__tests__/reasons.test.ts`)
- `src/schemas/model/index.ts`
- `src/api-client/factory.ts`
- `package.json` (exports)
- `docs/changelogs/upcoming.md`, `docs/release-notes/upcoming.md`

## Verification

`pnpm run check` — PASS (typecheck + lint + 581 tests across 72 files + build).
Confirmed dist emission and live subpath resolution by package name for
`@proposit/shared/schemas/api/claim-reaction`, `@proposit/shared/schemas`
(`ClaimReactionSchema`), `@proposit/shared/engine/review/reasons`
(`getStanceForClaimReason`), and the new api-client methods.

## Publish status

NOT published / NOT versioned — versioning + `pnpm publish` are human-gated
behind the orchestrator consumer-validation sequence (`pnpm pack` → `pnpm add`
in `proposit-server` → server `pnpm run check:full`). This slice is left at
`active`; the server slice (Phase B) depends on the published `@proposit/shared`.

## Refinement — natural-key delete

A review of the consuming server slice found `deleteClaimReaction` should be
natural-key rather than id-keyed. Because claim reactions are single-select
(`UNIQUE(argumentId, argumentVersion, claimId, userId)`), the row is fully
addressed by the path coordinates plus the session user, so the `reactionId` in
the delete path was redundant — and it forced the server to add an SSR loader
just to fetch the id, creating an optimistic-clear race.

- `deleteClaimReactionImpl` now takes `(config, argumentId, version, claimId)`
  (dropped `reactionId`) and issues `DELETE` to the collection route
  `/api/v1/argument/[id]/[version]/claim/[claimId]/reactions` (no
  `/[reactionId]` segment) — still via `parseResponse` +
  `ClaimReactionDeleteResponse`.
- `src/api-client/factory.ts` needed no edit: the public `deleteClaimReaction`
  type is derived from the impl signature via `TStripConfig`, so dropping the
  impl param updated the client type automatically.
- `ClaimReactionGetResponse.own` (`{ value, reasonCode }`, no id) and
  `ClaimReactionSchema` (create/delete still echo the full row incl. `id`) were
  left intact — correct under natural-key delete.
- api-client test updated for the new signature + collection URL. `docs/changelogs/upcoming.md`
  + `docs/release-notes/upcoming.md` note the breaking signature change (rides a
  minor bump pre-1.0).
- `pnpm run check` — PASS (typecheck + lint + 581 tests / 72 files + build).
  Still NOT versioned / NOT published (human-gated).

## Open questions / deviations

- Stance count keys are named `affirm` / `disagree` / `neutral` (mapping to value
  true / false / null). The design fixed "3 per-stance counts" but not the exact
  keys; the server slice must consume these names (or we rename in lockstep).
- `ClaimReactionCreateResponse` / `ClaimReactionDeleteResponse` return the full
  `ClaimReactionSchema` (incl. the caller's own `userId`/`createdOn`), matching
  the argument-reaction create/delete responses; identity-stripping applies only
  to the public aggregate (`ClaimReactionGetResponse`, which exposes counts + the
  caller's own `{ value, reasonCode }`).
