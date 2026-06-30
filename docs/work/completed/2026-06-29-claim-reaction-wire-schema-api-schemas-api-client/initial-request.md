# Claim-reaction wire schema, API schemas & api-client

Implements Phase A of the cross-node epic
`2026-06-24-claim-quick-reactions-affirmation-disagreement-neutral`. The
authoritative design is the epic's `spec.md` / `plan.md` (Phase A) at the
workspace root — do not re-derive it. Adopted from the delegated inbox request
`docs/work/inbox/2026-06-29-claim-reaction-wire-schema-api-schemas-api-client-reuse-review-reason-code-vocabulary.md`.

A claim quick-reaction = `value: TrivalentValue` (affirm / disagree / neutral)
plus a required `reasonCode: ClaimReasonCode`, both reused from the review
subsystem; single-select; scoped to `(argumentId, argumentVersion, claimId)`.

## Product changes

None directly in this library (no `capabilities.md`). This slice ships the wire
contract the server slice (Phase B) and a later mobile slice consume.

## Technical changes

1. `getStanceForClaimReason(code): TTrivalentValue` in
   `src/engine/review/reasons.ts` — reverse lookup (true-bucket → true,
   false-bucket → false, otherwise null), used to validate a reason matches its
   stance.
2. `src/schemas/model/claim-reaction.ts` — `ClaimReactionSchema`
   `{ id, argumentId, argumentVersion, claimId, claimVersion, value, reasonCode,
   userId, createdOn }` (`value` + `reasonCode` both required) + a
   `TClaimReactionSafe` that strips `userId`/`createdOn`.
3. `src/schemas/api/claim-reaction/index.ts` — `ClaimReactionCreateRequest`
   (`{ value, reasonCode }`), `ClaimReactionCreateResponse`,
   `ClaimReactionGetResponse` (per-stance counts + caller's own selection),
   `ClaimReactionDeleteResponse`.
4. `src/api-client/argument/claim-reactions.ts` — `createClaimReactionImpl` /
   `deleteClaimReactionImpl` via `strictFetch`; register `createClaimReaction` /
   `deleteClaimReaction` in `src/api-client/factory.ts`.
5. Wire index re-exports + the new `package.json` `exports` subpath
   (`types`/`import`/`default` triplet). ESM `.js` suffixes throughout.

Vocabulary is reused, not redefined: `TrivalentValueSchema` +
`ClaimReasonCodeSchema` from `schemas/review.ts`; labels from
`engine/review/reasons.ts`. TDD — failing tests first.

## Meta changes

`docs/changelogs/upcoming.md` + `docs/release-notes/upcoming.md` (Public-API
surface change). Publish/version is human-gated behind the consumer-validation
gate — NOT done here.
