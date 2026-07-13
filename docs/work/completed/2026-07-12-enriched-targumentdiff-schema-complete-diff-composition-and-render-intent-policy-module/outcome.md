# Outcome — shared slice (argument-diff four-state)

## Status: implementation-complete, green, v0.38.0 cut, consumer-validated → PUBLISH-READY

Commits `9111e90..6618fad` (tcw-start + core bump ^2.5.0 + schema + composition + citation + render
policy + finalize hardening + docs). Release cut `3dc1388` (v0.38.0, tag local-only). `pnpm run check`
green: 696 tests. Dual review clean (spec ✅, quality Approved).

### Delivered
- Enriched `TArgumentDiff` wire schema (four-state `added`/`removed`/`modified-own`/`modified-within` +
  `roles.conclusion`, lossless mirror of core@2.5.0's `TCoreArgumentDiff`); `entitySetDiff`/`entityFieldDiff`.
- `composeArgumentDiff`: folds core-structural diff + claim four-state + citation four-state; re-attaches
  premise `role`/`title`; **throws** (no silent invalid output) on a premise absent from the supplied arrays.
- `buildDiffRenderMaps`: origin+affected-containers render policy (state → origin/touched cue).
- OQ4 resolved: citation identity = endpoint pair `(claimId, supportingClaimId)`; pin-bump = `modified-within`;
  keyed only on the supporting referent (`supportingClaimVersion`+checksum). No migration.

### Consumer-side tarball validation (both, per user request)
Tarballs: `proposit-shared-0.38.0.tgz`, `proposit-proposit-core-2.5.0.tgz`. Non-destructive (reverted).

- **core@2.5.0 retroactive:** server ✅ PASS (2387 tests) · mobile ✅ PASS (457). Purely additive — SAFE.
- **shared@0.38.0 prospective:** own tests green; **zero unexpected breaks**.
  - mobile: no adoption surface (doesn't consume `TArgumentDiff` yet).
  - server: bounded diff-only migration surface (the intended breaking-change adoption, for the server slice):
    producer `src/model/argument/forks.ts` (~840,857); readers `contexts/diff-context.tsx`,
    `contexts/graph-data-context.tsx`, `contexts/text-tree-ghosts.ts`; diff API route response;
    7 diff test-fixture files. Root cause: `updated`→`modified` bucket rename + `propositionalLogic`
    wrapper removed. NO unrelated code affected.
- Caret safety: consumers pinned `^0.37.1` do NOT auto-pull `0.38.0` → publishing breaks nothing on publish.

## VERDICT: PUBLISH-READY.
## Remaining: user publishes @proposit/shared@0.38.0 (+push tag v0.38.0). Then server slice (surface above) + mobile slice.
