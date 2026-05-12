# Upcoming changelog

## Dependencies

- Bumped `@proposit/proposit-core` peer dependency from `^0.11.2` to `^0.12.0`
  and dev dependency to `^0.12.1`. The v0.12.1 follow-up fixes
  (`populateFromSupports` dedup, stricter axiom-assignment guard, new
  `CITATION_NOT_FOUND` / `AXIOM_NOT_FOUND` invariant codes on connection-library
  `remove`) were audited as no-impact for shared — zero callers of the affected
  core APIs and existing `InvariantViolationError` catches don't switch on
  `.code`.

## Breaking changes — engine accessor renames

- `PropositArgumentEngine.getSourceClaimsForCitingClaim(id)` →
  `getCitationsForClaim(id)`.
- `PropositArgumentEngine.getClaimCitations()` → `getCitations()`.
- `PropositArgumentEngine.addClaimCitation(cc)` → `addCitation(cc)`.
- `PropositArgumentEngine.removeClaimCitation(edgeId)` →
  `removeCitation(edgeId)`.
- `PropositArgumentEngine` constructor no longer accepts a citation-lookup
  argument (3rd parameter dropped); callers update to the 3-argument form
  `(argument, claimLookup, options)`.

## Breaking changes — type renames

- `TProjectReactiveSnapshot.claimCitations` → `TProjectReactiveSnapshot.citations`.

## Breaking changes — wire-format renames

- `FullArgumentSchema.claimCitations` → `FullArgumentSchema.citations`.
- `ArgumentDiffSchema.claimCitations` → `ArgumentDiffSchema.citations`.

## Breaking changes — inherited from `@proposit/proposit-core` v0.12

- `TClaimCitation` field renames (`Static<typeof ClaimCitationSchema>`):
  `citingClaimId` → `claimId`, `citingClaimVersion` → `claimVersion`,
  `sourceClaimId` → `supportingClaimId`,
  `sourceClaimVersion` → `supportingClaimVersion`.
- `EMPTY_CLAIM_CITATION_LOOKUP` is no longer re-exported from
  `src/engine/library-adapters.ts`. Core's replacement is
  `emptyClaimConnectionLookup<TConn>()`, but `proposit-shared` has zero
  callers and does not re-export it.

## Internal

- `PropositArgumentEngine`'s private `claimCitationsMap` and related
  cache/dirty fields renamed to `citationsMap` / `citationsDirty` /
  `cachedCitations`.
- JSDoc and code comments updated to use the `claim` / `supportingClaim`
  vocabulary throughout.
