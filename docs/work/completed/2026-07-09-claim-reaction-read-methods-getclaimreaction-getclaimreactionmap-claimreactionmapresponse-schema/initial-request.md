# Claim-reaction read methods: getClaimReaction + getClaimReactionMap + ClaimReactionMapResponse schema

Slice ① of the cross-node epic
`2026-07-09-claim-reaction-stance-ui-on-mobile-shared-read-methods-server-bulk-route-mobile-ui`.

## Product changes

None directly. Enables mobile's claim-reaction stance UI (later epic slices) to
read stance counts + the caller's own selection, both per-claim and in bulk per
argument version.

## Technical changes

Purely additive to `@proposit/shared`:

1. **Schema** (`src/schemas/api/claim-reaction/index.ts`):
   - `ClaimReactionMapResponse = Type.Record(Type.String(), ClaimReactionGetResponse)`
     — bulk per-argument-version map keyed by `claimId`, value `{ counts, own }`.
   - `TClaimReactionMapResponse = Static<typeof ClaimReactionMapResponse>`.

2. **Api-client methods** (`src/api-client/argument/claim-reactions.ts`):
   - `getClaimReactionImpl(config, argumentId, version, claimId)` →
     `GET /api/v1/argument/{argumentId}/{version}/claim/{claimId}/reactions`,
     validated against `ClaimReactionGetResponse`. (Route exists server-side.)
   - `getClaimReactionMapImpl(config, argumentId, version)` →
     `GET /api/v1/argument/{argumentId}/{version}/claim-reactions`,
     validated against `ClaimReactionMapResponse`. (Server bulk route is a
     sibling slice — client wrapper only, against the agreed path.)

3. **Factory** (`src/api-client/factory.ts`): register `getClaimReaction` and
   `getClaimReactionMap`, parallel to `createClaimReaction`/`deleteClaimReaction`.

4. **Tests**: unit tests mirroring the existing claim-reaction api-client tests
   (correct URL + parsed response for both new methods).

## Meta changes

Minor version cut (additive read methods); rotate `upcoming.md` release-notes +
changelog. Slice stays open until the human publish + consumer re-pin.
