# Plan

Trivial, one-file change. See `initial-request.md`.

1. Failing test: `ClaimReactionSelectionSchema` (and the composing read
   responses) accept an out-of-union string `reasonCode`; `ClaimReactionCreateRequest`
   still rejects it.
2. Change `ClaimReactionSelectionSchema.reasonCode` to
   `Type.Union([ClaimReasonCodeSchema, Type.String()])` in
   `src/schemas/api/claim-reaction/index.ts`. Leave `ClaimReactionCreateRequest` closed.
3. Verify: targeted vitest + typecheck, then full `pnpm run check`.

**Touch points:** `src/schemas/api/claim-reaction/index.ts`,
`src/schemas/__tests__/claim-reaction-api.test.ts`.
