# Loosen claim-reaction write/delete response reasonCode to tolerate out-of-union codes

## Problem

In `src/schemas/api/claim-reaction/index.ts`, the READ selection schema
(`ClaimReactionSelectionSchema.reasonCode`) was loosened in 0.38.1 to
`Type.Union([ClaimReasonCodeSchema, Type.String()])` so that a stored
`reasonCode` which has fallen out of the closed union (after a code was removed)
still survives strict response validation on reads and is carried for display.

But the **write/delete response** paths were not loosened. The
`addClaimReaction` / `deleteClaimReaction` responses surface a full reaction row
via `ClaimReactionSchema.reasonCode`, which is still the closed
`ClaimReasonCodeSchema`. If a code was removed from the union *after* the row was
written, those write/delete responses can still 500 on strict response
validation — the same failure the read path was hardened against, just on a
different surface.

## Root cause

The read path was loosened but the write/delete *response* reaction shape was
not. The add/delete responses compose `ClaimReactionSchema` (from
`src/schemas/model/claim-reaction.ts`):

- `ClaimReactionCreateResponse` → `{ addedReaction: ClaimReactionSchema }`
- `ClaimReactionDeleteResponse` → `{ removedReaction: ClaimReactionSchema }`

and `ClaimReactionSchema.reasonCode` (line 16) is still the closed
`ClaimReasonCodeSchema`. So a persisted row whose code has left the union fails
strict validation when it is echoed back in a write/delete response.

## Proposed fix

Loosen the `reasonCode` on the response reaction shape the same way the read
selection was loosened — tolerate an out-of-union string on reads/responses —
so a stored code that has left the closed union is carried through the
write/delete response rather than 500ing.

Keep the request/write-validation path strict: `ClaimReactionCreateRequest.reasonCode`
must stay the closed `ClaimReasonCodeSchema` so new writes can only supply a
currently-valid code.

**Before deciding the surface, confirm exactly which schema(s) the add/delete
responses compose.** Note that `ClaimReactionSchema` is a shared **model**
shape, not a response-only schema — loosening its `reasonCode` directly loosens
the model everywhere it is used, not just the two responses. Decide deliberately
whether to (a) loosen `ClaimReactionSchema.reasonCode` in place, or (b) derive a
response-specific loosened variant and compose that into the create/delete
responses, leaving the strict model intact. Pick the surface that keeps writes
strict while making reads/responses tolerant.

## Consumer impact

- **server** — stops the write/delete response 500s when a persisted reaction
  references a code that has since been removed from the union.
- **mobile** — already renders unknown codes via its raw-string fallback; no
  change required, benefits from the additive loosening.

This is an additive / back-compat loosening (a wider union on the read/response
side), not a breaking change.

## Origin

Surfaced in review of the server 0.38.1 adoption — companion to the read-path
loosening (`ClaimReactionSelectionSchema.reasonCode`) already shipped in 0.38.1.
The read path was fixed there; this is the matching write/delete-response gap.

## Meta

Good candidate to bundle into the next `@proposit/shared` version.
