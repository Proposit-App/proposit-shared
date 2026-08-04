# Verification: Retitle the curated argument premises

**Accepted** 2026-08-04.

All 28 premise titles across the four showcase arguments replaced with noun
phrases naming the inferential move. Diff constraint verified by inspection,
not assertion: no `symbol`, `body`, `type`, `operator`, `children`, `role`,
`description`, `documentCurationId`, or `provenance` line appears in the fixture
diff.

Rendering confirmed in a browser against a live local database, in both light
and dark schemes: the header names the move and the claim rows beneath state
the propositions, with no duplication.

`content.generated.ts` — a committed build artifact embedding the same strings —
was regenerated and included, so a later `build` produces no unexplained diff.
