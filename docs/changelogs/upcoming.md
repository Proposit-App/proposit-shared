# Upcoming changelog

## Dependencies

- Bumped `@proposit/proposit-core` peer dependency from `^0.11.2` to `^0.12.3`
  and dev dependency from `^0.12.1` to `^0.12.3`. The v0.12.1 follow-up fixes
  (`populateFromSupports` dedup, stricter axiom-assignment guard, new
  `CITATION_NOT_FOUND` / `AXIOM_NOT_FOUND` invariant codes on connection-library
  `remove`) were audited as no-impact for shared — zero callers of the affected
  core APIs and existing `InvariantViolationError` catches don't switch on
  `.code`. The v0.12.2 schema-surface cleanup removed `CoreClaimCitationSchema`
  in favor of the unified `CoreClaimConnectionSchema` — shared's
  `ClaimCitationSchema` intersect now reads from the unified schema (see
  "Breaking changes — inherited from core v0.12.2" below). The v0.12.3 release
  is documentation and internal refactor only and is a safe drop-in.

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

## Breaking changes — inherited from `@proposit/proposit-core` v0.12.2

- Shared's `ClaimCitationSchema` (in `src/schemas/model/citations.ts`) now
  intersects `CoreClaimConnectionSchema` instead of the deleted
  `CoreClaimCitationSchema`. Wire shape is unchanged — both core schemas
  carried identical fields; `CoreClaimCitationSchema` was an empty wrapper.
  Downstream consumers that only ever touched the local `ClaimCitationSchema`
  / `TClaimCitation` names see no observable change. Consumers that imported
  `CoreClaimCitationSchema` or `TCoreClaimCitation` directly from
  `@proposit/proposit-core` must switch to `CoreClaimConnectionSchema` /
  `TCoreClaimConnection` themselves; shared does not re-export them.

## Internal

- `PropositArgumentEngine`'s private `claimCitationsMap` and related
  cache/dirty fields renamed to `citationsMap` / `citationsDirty` /
  `cachedCitations`.
- JSDoc and code comments updated to use the `claim` / `supportingClaim`
  vocabulary throughout.
