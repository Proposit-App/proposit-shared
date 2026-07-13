# Drop local isNakedQDerivationPremise re-impl; import from @proposit/proposit-core

## Product changes

None. Internal refactor — no user-facing behavior change.

## Technical changes

`src/engine/review/evaluation.ts:33` carries a local re-implementation of
core's `isNakedQDerivationPremise` (with a comment noting it mirrors core's
internal predicate). Core now **exports** it publicly
(`@proposit/proposit-core` → `src/lib/index.ts:111`, shipped in core 2.4.3),
so shared can import the export and delete the local copy.

- Replace the local `isNakedQDerivationPremise` (and, if similarly mirrored,
  `isNakedQTree`) with the core import.
- Verify the review-evaluation tests still pass; the imported predicate must be
  behaviorally identical (it is the source the local copy mirrored).
- Requires shared's pinned `@proposit/proposit-core` to be >= 2.4.3.

## Meta changes

Consumer-side follow-up to the completed core item
`proposit-core/2026-06-21-proposit-core-batched-public-api-exports-cleanup-follow-ups`
(export shipped; consumer drop tracked here).
