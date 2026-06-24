# Spec — Claim schema decoupling (proposit-shared, Slice 1)

## Goal

Change the `@proposit/shared` `ClaimSchema` contract so a claim is modeled as a
first-class, independently-versioned entity (its own version trunk) rather than a
per-argument copy, and expose the claim-fork provenance type. This is the
schema/type half of the cross-node epic
`independently-versioned-claims-publish-propagation-forking-searchability`; the
proposit-server slice depends on these types.

Full design: `/Users/brian/Projects/Proposit-App/docs/work/backlog/2026-06-23-independently-versioned-claims-publish-propagation-forking-searchability/spec.md`.

## In scope (this repo only)

`src/schemas/model/claims.ts` + the package export chain.

### 1. `version` — claim's own trunk version

`ClaimSharedFieldsSchema.version` (`Type.Number()`) stays a number, but its
**meaning** changes: it is the claim's own monotonic trunk version, independent of
any argument version. Today it is a denormalized copy of the argument version.
Update the doc comment so consumers understand the new semantics. No structural
change to the field type.

### 2. `argumentId` → nullable `originArgumentId`

`ClaimSharedFieldsSchema.argumentId: UUID` becomes
`originArgumentId: Nullable(UUID)`. A shared claim is no longer owned by one
argument; this field records provenance only (the argument the claim was first
created in), and is null for claims with no single origin. This is a **breaking
rename** — it flows through `ClaimSharedFieldsSchema` into
`NormalClaimSchema` / `CitationClaimSchema` / `AxiomaticClaimSchema`,
`ClaimSchema`, and `ClaimWithChildrenSchema`, plus every derived `T*` type.

### 3. Add `published` + `publishedOn`

Add to `ClaimSharedFieldsSchema`:

- `published: Type.Boolean()` — whether this claim version is published. A `v0`
  draft is `false`; published versions are `true`.
- `publishedOn: Nullable(EncodableDate)` — timestamp of publish; null while
  unpublished.

Both flow to all variants via `ClaimSharedFieldsSchema`.

### 4. Re-export `ClaimForkSchema`

`ClaimForkSchema` / `TClaimFork` are defined in `src/schemas/model/forks.ts` but
re-exported nowhere (only `ArgumentForkSchema` is, via `model/arguments.ts`). Add a
re-export so consumers can import the claim-fork provenance type through the
package. Mirror the existing `ArgumentForkSchema` pattern: a
`export { ClaimForkSchema, type TClaimFork } from "./forks.js"` line in
`model/claims.ts` (already in the `model/index.ts` → `schemas/index.ts` chain, so
it surfaces at the existing `@proposit/shared/schemas` sub-path — **no new
export-map entry needed**).

## Out of scope

- All publish/fork/search **behavior** (server slice).
- Any other fork schema re-export (only `ClaimForkSchema` is requested).
- proposit-mobile, web UI, proposit-core.

## Constraints

- Runtime-agnostic: no DOM/Node-only APIs in source; `lib: ["ES2022"]`.
- All relative imports end in `.js`.
- brain-style naming.
- New/changed exports must keep `pnpm run check` green.

## Acceptance

- `claims.test.ts` validates the new shape: claims carry `originArgumentId`
  (nullable), `published`, `publishedOn`; the old `argumentId` field is gone.
- `ClaimForkSchema` / `TClaimFork` importable from `@proposit/shared/schemas`.
- `pnpm run check` green.
- `package.json` minor-bumped; `upcoming.md` release-notes + changelog rotated to
  the new version with fresh `upcoming.md` files. No publish, tag, or push.

## Consumer hand-off (server slice)

Final claim shape adds/changes these fields on every claim variant:
`originArgumentId: string | null` (was `argumentId: string`), `published: boolean`,
`publishedOn: Date | null`. `version: number` is now the claim's own trunk version.
`ClaimForkSchema` (`TClaimFork`) is importable from `@proposit/shared/schemas`.
