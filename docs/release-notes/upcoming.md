# Upcoming release notes

Tracks `@proposit/proposit-core` v0.12.0 through v0.12.3 — the rename of
citation-edge endpoint vocabulary (`citingClaim*` / `sourceClaim*` →
`claim*` / `supportingClaim*`), the rename of `PropositCore`'s
`claimCitations` field to `citations`, the `ArgumentEngine` constructor's
dropped `claimCitationLookup` parameter, and (v0.12.2) the unification of
`CoreClaimCitationSchema` / `CoreClaimAxiomSchema` into a single
`CoreClaimConnectionSchema`. Shared follows core's vocabulary throughout — the
rename surfaces are listed under "Breaking changes" below so server and mobile
can sequence their own bumps. Also re-points shared's `ClaimTypeSchema` /
`TClaimType` exports at core's `CoreClaimTypeSchema` (the symbol names
stay), which widens `ClaimSchema.type` to include `"axiomatic"` at the
schema level (engine-side axiom support remains deferred — see "Out of
scope" below).

## What changed

### Dependency

- `peerDependencies` for `@proposit/proposit-core` bumped from `^0.11.2` to
  `^0.12.3`; `devDependencies` bumped from `^0.12.1` to `^0.12.3` (this
  repo's tests and builds run against the latest 0.12.x). The v0.12.1
  follow-up bug fixes — `populateFromSupports` dedup, stricter
  axiom-assignment guard, and the new `CITATION_NOT_FOUND` /
  `AXIOM_NOT_FOUND` invariant codes on `ClaimCitationLibrary.remove` /
  `ClaimAxiomLibrary.remove` — were audited as no-impact for shared: zero
  references to those APIs and the existing `InvariantViolationError`
  catches don't switch on `.code`. The v0.12.2 schema-surface cleanup
  deleted the empty `CoreClaimCitationSchema` and `CoreClaimAxiomSchema`
  wrappers in favor of the unified `CoreClaimConnectionSchema` — see
  "Citation schema source" below. The v0.12.3 release is documentation
  and internal cleanup only.

### `PropositArgumentEngine` accessor renames

| Before                                         | After                           |
| ---------------------------------------------- | ------------------------------- |
| `getSourceClaimsForCitingClaim(citingClaimId)` | `getCitationsForClaim(claimId)` |
| `getClaimCitations()`                          | `getCitations()`                |
| `addClaimCitation(cc)`                         | `addCitation(cc)`               |
| `removeClaimCitation(edgeId)`                  | `removeCitation(edgeId)`        |

The internal `claimCitationsMap` field is now `citationsMap`. (Private — listed
for completeness only.)

### `TProjectReactiveSnapshot` snapshot key

`snapshot.claimCitations` → `snapshot.citations`. Code reading
`engine.getSnapshot().claimCitations` must rename.

### Wire-format renames

- `FullArgumentSchema.claimCitations` → `FullArgumentSchema.citations`
- `ArgumentDiffSchema.claimCitations` → `ArgumentDiffSchema.citations`

The values inside these fields are still `TClaimCitation[]` and
`{ added: TClaimCitation[]; removed: TClaimCitation[] }` respectively. Only
the wrapper key changed.

### Citation-edge field renames

Inherited from core: `TClaimCitation` (`Static<typeof ClaimCitationSchema>`)
field names changed from `citingClaim*`/`sourceClaim*` to
`claim*`/`supportingClaim*`. Concretely:

| Before               | After                    |
| -------------------- | ------------------------ |
| `citingClaimId`      | `claimId`                |
| `citingClaimVersion` | `claimVersion`           |
| `sourceClaimId`      | `supportingClaimId`      |
| `sourceClaimVersion` | `supportingClaimVersion` |

The `argumentId` and `createdOn` app-level fields are unchanged.

### `ArgumentEngine` constructor

Core's `ArgumentEngine` no longer accepts a `claimCitationLookup` argument —
the field was vestigial in v0.11 and never read. Direct callers of
`new ArgumentEngine(...)` (notably `detectDivergence` in
`src/engine/optimistic/verification.ts`) drop the third argument.
`PropositArgumentEngine` similarly drops the parameter from its constructor —
external callers don't pass a citation lookup anymore.

The `EMPTY_CLAIM_CITATION_LOOKUP` re-export is gone from
`src/engine/library-adapters.ts`. Shared no longer has any callers that need
it; consumers who imported it via `@proposit/proposit-core` should use core's
new `emptyClaimConnectionLookup<TCoreClaimConnection>()` factory.
(`TCoreClaimCitation` was removed in core v0.12.2.)

### Citation schema source (core v0.12.2)

`src/schemas/model/citations.ts` now intersects `CoreClaimConnectionSchema`
instead of the deleted `CoreClaimCitationSchema`. The two schemas carried
identical fields — `CoreClaimCitationSchema` was an empty wrapper that core
removed in v0.12.2 alongside `CoreClaimAxiomSchema`. Shared's
`ClaimCitationSchema` and `TClaimCitation` keep their names and shape;
this is a source-level cleanup with no wire-format or type-shape impact for
downstream consumers that import shared's names. Consumers that imported
`CoreClaimCitationSchema` or `TCoreClaimCitation` directly from
`@proposit/proposit-core` (not via shared) must switch to
`CoreClaimConnectionSchema` / `TCoreClaimConnection` themselves; shared
does not re-export either.

### `ClaimTypeSchema` / `TClaimType` widened to core's union

`src/schemas/model/claims.ts` previously defined a local
`ClaimTypeSchema = Type.Union([Type.Literal("normal"), Type.Literal("citation")])`
and exported its inferred `TClaimType`. The local definition is gone;
`ClaimTypeSchema` and `TClaimType` are now thin re-export aliases for
core's `CoreClaimTypeSchema` / `TCoreClaimType`, so existing imports from
`@proposit/shared/schemas` keep working without code edits. The
shape change is the union widening from `"normal" | "citation"` to
`"normal" | "citation" | "axiomatic"`.

Code change required on the consumer side: exhaustive switches over
`claim.type` need an `"axiomatic"` arm (or an explicit guard that asserts
the case is impossible for that flow). Shared's own
`src/engine/text-tree.ts` has one such site that needs widening — tracked
as a follow-up below.

Shared's engine surface still has no axiom-specific accessors — see "Out
of scope" below for what is *not* in this bump.

## Why the wire-format rename is in this bump

The naming-authority rule (`@proposit/shared` follows
`@proposit/proposit-core` for any name it consumes) requires the
wire-wrapper rename. Server's response builders will need a coordinated
rename when they bump their `@proposit/shared` dep — see "Migration impact"
below.

## Migration impact

### `proposit-server`

After bumping `@proposit/shared` past this release, server's TypeScript code
that builds `FullArgument` and `ArgumentDiff` responses must rename the
`claimCitations` field on the response object to `citations`. Likely
locations: the API route handlers that load an argument with its claim
citations and the diff-computation utility. Engine callers that read
`engine.getSourceClaimsForCitingClaim` etc. rename per the table above.

Note: the `src/api-client/argument/claims.ts` helper `createClaimCitationImpl`
still has a parameter named `citingClaimId`. That's intentional — it's a URL
path segment identifying the claim a new citation attaches to, not a
`TClaimCitation` schema field. Server callers do not need to rename it; a
later cleanup pass on the api-client surface will revisit that name in
isolation.

### `proposit-mobile`

Likely no engine-accessor callers today, but verify any code that reads
`reactiveSnapshot.claimCitations` from the project store — that key is now
`citations`.

## Out of scope (deferred)

- **Engine and wire-level axiomatic-claim support.** Core v0.12 adds a
  parallel `ClaimAxiomLibrary` alongside the schema-level `"axiomatic"`
  member. Shared's `ClaimSchema.type` now accepts `"axiomatic"` (via the
  switch to `CoreClaimTypeSchema` — see above), so the type-shape side of
  axiomatic claims is in this bump. The engine side is not:
  `PropositArgumentEngine` still has no `axiomsMap` / `getAxiomsForClaim` /
  `addAxiom` / `removeAxiom` accessors, and `FullArgumentSchema` /
  `ArgumentDiffSchema` still have no `axioms` slot. A follow-up bump will
  add these once a server flow or mobile UI needs them; that follow-up also
  decides how `text-tree.ts` should render axiomatic claims.

## Versioning intent

Pre-1.0 minor bump (`0.7.2` → `0.8.0`) per the policy in `CLAUDE.md`. Multiple
breaking renames; consumers should pin caret and expect a coordinated update.

## See also

- `docs/changelogs/upcoming.md` — machine-parseable rename table accompanying this release.
- `proposit-core` v0.12.0 release notes — full upstream rename and the
  axiomatic-claim feature; this upgrade surfaces the schema-level widening
  but not the engine accessors or wire-format axiom slots.
- `proposit-core` v0.12.2 release notes — `CoreClaimCitationSchema` /
  `CoreClaimAxiomSchema` consolidation into `CoreClaimConnectionSchema`,
  plus parser-builder and parser changes (parser changes are no-impact
  for shared; the schema consolidation is sourced under "Citation schema
  source" above).
- `proposit-core` v0.12.3 release notes — documentation-only follow-up
  (no shared-side surface).
