# Loosen wire claim reasonCode read schema to tolerate out-of-union codes

Shared/upstream slice of proposit-server item
`2026-07-09-loosen-wire-claim-reasoncode-to-tolerate-codes-removed-from-the-union`
(which stays gated on this).

## Problem

After a coordinated code removal, a claim's stored `reasonCode` may fall OUT of
the closed `ClaimReasonCodeSchema` union. On the read path the server needs to
carry that stale code as a raw string for display, instead of 500'ing strict
response validation or dropping the field.

## Technical changes

- Loosen the **read/selection** shape's `reasonCode`
  (`ClaimReactionSelectionSchema.reasonCode` in
  `src/schemas/api/claim-reaction/index.ts`) to
  `Type.Union([ClaimReasonCodeSchema, Type.String()])` so known codes stay
  documented while unknown stored codes pass validation. This shape composes
  into `ClaimReactionGetResponse.own` and `ClaimReactionMapResponse`, so the fix
  at the schema root covers every read consumer.
- KEEP `ClaimReactionCreateRequest.reasonCode` as the CLOSED
  `ClaimReasonCodeSchema` union — writes are validated server-side in
  `addClaimReaction`; only reads loosen.

## Consumer impact

- The read `reasonCode` static type widens to `string`. The server-adoption
  slice must handle that widening (display-only; no exhaustive-switch guarantee
  on read).

## Meta changes

Bundled onto branch `work/shared-breaker-and-filter-param` for one upcoming
shared version alongside the AI_QUOTA_ABORT_CODE and status-filter slices.
