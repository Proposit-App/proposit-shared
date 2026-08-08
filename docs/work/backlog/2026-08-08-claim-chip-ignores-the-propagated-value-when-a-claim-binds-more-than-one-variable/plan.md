# Plan

1. Reproduce against the engine before touching anything — confirm which of the
   two bound variables receives the propagated value and that first-wins selects
   the other.
2. Fixtures + failing tests in `src/engine/review/__tests__/`.
3. `overlay.ts`: `variableIdByClaimId: Map<string, string>` becomes
   `variableIdsByClaimId: Map<string, string[]>`; one `resolveClaimValue` helper
   serves both read sites, so the rule is written once.
4. `conflictedClaimIds?: string[]` on `TReviewOverlay` for the disagreement case.
5. `pnpm run check`; changelog; patch bump; retag; rebuild the tarball.
6. `tcw work escalate` to core about `getVariableIdForClaim`.
