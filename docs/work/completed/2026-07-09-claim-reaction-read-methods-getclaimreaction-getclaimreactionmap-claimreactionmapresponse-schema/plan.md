# Plan

Design is fixed; see [`initial-request.md`](./initial-request.md). Steps: add
`ClaimReactionMapResponse` schema → add `getClaimReactionImpl` +
`getClaimReactionMapImpl` (parseResponse GET style) → register both on the
factory → TDD unit tests → full `pnpm run check` → minor version cut.
