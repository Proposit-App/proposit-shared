# `ClaimSchema` discriminated-union refactor

**Status:** draft — design phase
**Target version:** `@proposit/shared` v0.8.0 (bundled with the in-flight proposit-core v0.12 upgrade)
**Date:** 2026-05-13

## Goal

Split the flat `ClaimSchema` in `src/schemas/model/claims.ts` into a discriminated union of three variant schemas — `NormalClaimSchema`, `CitationClaimSchema`, `AxiomaticClaimSchema` — discriminated by the `type` field, mirroring the pattern that `proposit-core` uses for `BasicsClaimSchema`. Each variant has the same field set, with type-appropriate fields required and inapplicable fields set to `Type.Null()` literal. This bump also lands a concrete `AxiomaticClaimSchema` with an `axiom` payload, and re-bases `ClaimWithChildrenSchema` on `NormalClaimSchema`.

## Motivation

- The existing flat `ClaimSchema` carries citation-only fields (`url`, `citation`, `citationContentHash`) as `Type.Optional(Nullable(...))`. The schema can't distinguish a well-formed Normal claim from a malformed Citation claim, so validation does no work for the discriminator.
- Core's `BasicsClaimSchema` already uses a per-type discriminated union. Shared and core diverging on the same conceptual structure adds cognitive load for anyone reading both.
- Core v0.12 widened `CoreClaimTypeSchema` to include `"axiomatic"`; shared has been forced to accept that wider union for `ClaimSchema.type`, but with no per-variant validation, axiomatic claims are indistinguishable from malformed Normal claims at the wire-format level.
- The shared schema cleanup is the right opportunity to also (a) move `titleContentHash` to a non-optional field, (b) introduce a real `axiom` payload on `AxiomaticClaimSchema`, and (c) drop the dead-end "claim type kind on every variant" assumption — `kind` is now `Null` on Citation/Axiomatic variants.

## Capability changes

No new or removed user-facing capabilities. This is a schema-shape refactor that the orchestrator and per-repo agents propagate through. The `AxiomaticClaimSchema` payload is shipped as a schema slot only; engine accessors and UI rendering for axiomatic claims remain deferred (see "Out of scope").

## Design

### Module shape

```ts
// src/schemas/model/claims.ts

import Type, { type Static } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"
import { IEEEReferenceSchema } from "./references.js"
import {
    CoreClaimAxiomaticTypeSchema,
    CoreClaimCitationTypeSchema,
    CoreClaimNormalTypeSchema,
    CoreClaimTypeSchema,
} from "@proposit/proposit-core"

// ── Re-export aliases (kept for backwards-compatible imports) ──

export const ClaimTypeSchema = CoreClaimTypeSchema
export type TClaimType = Static<typeof ClaimTypeSchema>

// ── Axiom kinds ──

export const AxiomKindSchema = Type.Union([
    Type.Literal("definition"),
    Type.Literal("stipulation"),
    Type.Literal("logical-principle"),
    Type.Literal("mathematical-principle"),
    Type.Literal("domain-rule"),
    Type.Literal("background-assumption"),
])
export type TAxiomKind = Static<typeof AxiomKindSchema>

// ── Atomic fragments used as parents below ──
// Single source of truth for `digest`; everything that needs digest inherits
// from this rather than re-declaring the field.
const ClaimMetadataFieldsSchema = Type.Object({
    digest: Type.String(),
})

// Normal-only mutable fields. Citation/Axiomatic variants do NOT inherit from
// this — they redeclare title/body/titleContentHash inline as `Type.Null()`.
// Per design: `MutableClaimFieldsSchema` represents the literal shape of a
// Normal claim's user-mutable surface; if a future route needs a permissive
// nullable variant, it gets its own schema.
export const MutableClaimFieldsSchema = Type.Object({
    title: Type.String(),
    body: Type.String(),
    titleContentHash: Type.String(),
})
export type TMutableClaimFields = Static<typeof MutableClaimFieldsSchema>

// Update request: Normal mutable fields + digest. Update is Normal-only in
// this bump (creation/update for Citation/Axiomatic comes when those flows
// are introduced).
export const ClaimUpdateRequestSchema = Type.Interface(
    [MutableClaimFieldsSchema, ClaimMetadataFieldsSchema],
    {}
)
export type TClaimUpdateFields = Static<typeof ClaimUpdateRequestSchema>

// ── Claim kinds (presentation taxonomy; Normal-claim-only) ──
// Renamed to make Normal-only scoping explicit. The previous
// `ChildClaimKinds` / `LogicalClaimKinds` / `ClaimKindsSchema` names quietly
// claimed universality; under the discriminated union, `kind` is `null` on
// Citation and Axiomatic claims.

export const NormalClaimKinds = {
    CLAIM: "claim",
    CONCLUSION: "conclusion",
    DEFINITION: "definition",
    CRITERION: "criterion",
} as const

const NormalClaimChildKindsSchema = Type.Union([
    Type.Literal(NormalClaimKinds.DEFINITION),
    Type.Literal(NormalClaimKinds.CRITERION),
])
const NormalClaimLogicalKindsSchema = Type.Union([
    Type.Literal(NormalClaimKinds.CONCLUSION),
    Type.Literal(NormalClaimKinds.CLAIM),
])

export const NormalClaimKindsSchema = Type.Union([
    NormalClaimChildKindsSchema,
    NormalClaimLogicalKindsSchema,
])
export type TNormalClaimKinds = Static<typeof NormalClaimKindsSchema>

// ── Shared identity / lineage fields, inheriting digest from metadata ──

const ClaimSharedFieldsSchema = Type.Interface([ClaimMetadataFieldsSchema], {
    id: UUID,
    argumentId: UUID,
    version: Type.Number(),
    claimForkId: Nullable(UUID),
    creatorId: UUID,
    createdOn: EncodableDate,
    parentId: Nullable(UUID),
})

// ── Per-variant schemas ──

export const NormalClaimSchema = Type.Interface(
    [ClaimSharedFieldsSchema, MutableClaimFieldsSchema],
    {
        type: CoreClaimNormalTypeSchema,
        kind: NormalClaimKindsSchema,
        url: Type.Null(),
        citation: Type.Null(),
        citationContentHash: Type.Null(),
        axiom: Type.Null(),
    }
)
export type TNormalClaim = Static<typeof NormalClaimSchema>

export const CitationClaimSchema = Type.Interface([ClaimSharedFieldsSchema], {
    type: CoreClaimCitationTypeSchema,
    kind: Type.Null(),
    title: Type.Null(),
    body: Type.Null(),
    titleContentHash: Type.Null(),
    url: Type.String(),
    citation: IEEEReferenceSchema,
    citationContentHash: Type.String(),
    axiom: Type.Null(),
})
export type TCitationClaim = Static<typeof CitationClaimSchema>

export const AxiomaticClaimSchema = Type.Interface([ClaimSharedFieldsSchema], {
    type: CoreClaimAxiomaticTypeSchema,
    kind: Type.Null(),
    title: Type.Null(),
    body: Type.Null(),
    titleContentHash: Type.Null(),
    url: Type.Null(),
    citation: Type.Null(),
    citationContentHash: Type.Null(),
    axiom: AxiomKindSchema,
})
export type TAxiomaticClaim = Static<typeof AxiomaticClaimSchema>

// ── The union and its narrowing helpers ──

export const ClaimSchema = Type.Union([
    NormalClaimSchema,
    CitationClaimSchema,
    AxiomaticClaimSchema,
])
export type TClaim = Static<typeof ClaimSchema>

export function isNormalClaim(claim: TClaim): claim is TNormalClaim {
    return claim.type === "normal"
}
export function isCitationClaim(claim: TClaim): claim is TCitationClaim {
    return claim.type === "citation"
}
export function isAxiomaticClaim(claim: TClaim): claim is TAxiomaticClaim {
    return claim.type === "axiomatic"
}

// ── Claim-with-children: re-based on Normal, since server only queries normal ──
// See "Wire format and database expectations" for the server-side smell this
// surfaces in `getEntireArgument`.

export const ClaimWithChildrenSchema = Type.Interface([NormalClaimSchema], {
    childClaimIds: Type.Array(UUID),
    childCitationIds: Type.Array(UUID),
})
export type TClaimWithChildren = Static<typeof ClaimWithChildrenSchema>
```

**Why `Type.Interface([Parent], { ... })` and not `Type.Composite` or `Type.Intersect`:**

- `Type.Composite` does not exist on the public surface of `typebox@^1.1.14` (the package this repo uses; this is `typebox`, not `@sinclair/typebox` — different libraries). It's an internal evaluator only, not on the `Type` namespace.
- `Type.Intersect([A, B])` produces an `allOf` JSON Schema requiring values to satisfy both members simultaneously. In _this_ spec it happens to work (the variant overrides moved title/body/titleContentHash out of `ClaimSharedFieldsSchema` precisely so there's no field overlap), but it's a fragile basis — anyone who later moves a shared field back will silently produce an impossible schema.
- `Type.Interface([Parent], { ... })` is the codebase's existing pattern (used in `tasks.ts`, `arguments.ts`, `forks.ts`, current `claims.ts`). It produces a flat object schema and has clean override semantics. **This is the choice.**

**Wire-format contract (explicit):** every claim on the wire carries _every_ field; fields that don't apply to the variant serialize as JSON `null`. Consumers must not strip nulls before sending or validating. This is what makes `Value.Check(ClaimSchema, row)` work as a discriminated union — the `type` literal disambiguates, and the field-shape constraints validate.

### Axiom-kind labels and descriptions

A new module `src/consts/axioms.ts` carries the user-facing strings, re-exported via `@proposit/shared/consts`:

```ts
// src/consts/axioms.ts

import type { TAxiomKind } from "../schemas/model/claims.js"

export const AXIOM_KIND_LABELS: Readonly<Record<TAxiomKind, string>> = {
    definition: "True by definition or meaning",
    stipulation: "Assumed for this argument",
    "logical-principle": "Basic logical principle",
    "mathematical-principle": "Basic mathematical principle",
    "domain-rule": "Rule or authority within a system",
    "background-assumption": "General background assumption",
} as const

export const AXIOM_KIND_DESCRIPTIONS: Readonly<Record<TAxiomKind, string>> = {
    definition:
        "Use when the claim is treated as true because of what the relevant words, categories, or concepts mean. Example: 'A bachelor is unmarried.'",
    stipulation:
        "Use when the argument explicitly defines or assumes something for its own purposes. Example: 'For this argument, an active user means someone who logs in weekly.'",
    "logical-principle":
        "Use for basic principles of valid reasoning. Example: 'If P implies Q, and P is true, then Q follows.'",
    "mathematical-principle":
        "Use for basic mathematical identities, axioms, or quantitative rules. Example: 'For any number x, x + 0 = x.'",
    "domain-rule":
        "Use for rules, standards, texts, contracts, doctrines, protocols, or authorities internal to a system. Example: 'Under this contract, payment is due within 30 days.'",
    "background-assumption":
        "Use for a foundational assumption the argument relies on but does not prove. Example: 'Human well-being matters.'",
} as const
```

### Internal shared impact

| File                                | Change                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/schemas/model/claims.ts`       | Replaced wholesale with the module shape above. The renamed `NormalClaimKinds` / `NormalClaimKindsSchema` / `NormalClaimChildKindsSchema` / `NormalClaimLogicalKindsSchema` exports replace the previous `ClaimKinds` / `ClaimKindsSchema` / `ChildClaimKinds` / `LogicalClaimKinds` names.                                                                                                                |
| `src/schemas/model/arguments.ts`    | `ArgumentDiffSchema.added` / `.removed` are typed `Type.Array(ClaimSchema)`. After the bump, those arrays carry heterogeneous variants. No file edit needed — TypeBox handles the swap automatically — but server code that iterates these arrays needs to narrow before reading variant-specific fields. Call out in the server briefing.                                                                 |
| `src/schemas/model/index.ts`        | No change — re-exports `./claims.js` already.                                                                                                                                                                                                                                                                                                                                                              |
| `src/consts/axioms.ts`              | New file with `AXIOM_KIND_LABELS` and `AXIOM_KIND_DESCRIPTIONS`.                                                                                                                                                                                                                                                                                                                                           |
| `src/consts/index.ts`               | Add `export * from "./axioms.js"`.                                                                                                                                                                                                                                                                                                                                                                         |
| `src/engine/text-tree.ts`           | Fix the existing typecheck failure at line 121. Narrow `claim` via `isNormalClaim` before reading `claim.title` / `claim.body`. Widen the `claimType` local from `"normal" \| "citation"` to `TClaimType` (and update `TextTreeItem.claimType` similarly). For Citation/Axiomatic claims in this bump, fall back to empty `claimTitle` / `claimBody` — proper rendering for those variants is a follow-up. |
| `src/engine/engine.ts`              | No field-narrowing changes needed; the engine shuttles `TClaim` records and never reads variant-specific fields directly.                                                                                                                                                                                                                                                                                  |
| `src/engine/mutations/claims.ts`    | No field-narrowing changes needed for the same reason.                                                                                                                                                                                                                                                                                                                                                     |
| `src/engine/library-adapters.ts`    | No change — only touches `id` and `version`.                                                                                                                                                                                                                                                                                                                                                               |
| `src/api-client/argument/claims.ts` | `TClaimUpdateFields` now requires `titleContentHash: string` (was implicitly optional before). See the dedicated "PATCH-body break" call-out below the table.                                                                                                                                                                                                                                              |
| Tests under `src/**/__tests__/`     | Per-test fixture sweep — five files identified, enumerated in the "Testing" section below.                                                                                                                                                                                                                                                                                                                 |

**PATCH-body break (top-level call-out, not a one-line table entry):**

Adding `titleContentHash: string` to `MutableClaimFieldsSchema` makes it required on `TClaimUpdateFields`, which is the payload of the shared api-client's `updateClaim` (`src/api-client/argument/claims.ts:54-70`). Every caller of `updateClaim` must now compute and pass the title hash, or `strictFetch` validates the request body against `ClaimUpdateRequestSchema` client-side and rejects. Known callers:

- `proposit-server` internal call sites (search the server repo for `updateClaim` after the bump).
- `proposit-mobile` claim-edit UI (search the mobile repo after the bump).

The orchestrator's per-repo briefings for server and mobile must include "compute and pass `titleContentHash` on every claim update" as an explicit caller-update item, not a generic schema-bump note.

### Wire format and database expectations (server's problem)

Shared's spec defines what the wire format demands; shared has no DB and runs no migrations. Server is responsible for choosing how to satisfy the requirements below — DB backfill, API-boundary transform, or some hybrid. The orchestrator's per-repo briefing for `proposit-server` writes up the audit and migration options at the time of the dependency bump.

**`getEntireArgument` semantic smell to address in the server briefing.** Server's `proposit-server/src/model/argument/queries.ts:237-274` runs `getClaims()` with `.andWhere("s.type", "normal")` — that's the source of the "normal-only" framing that lets us re-base `ClaimWithChildrenSchema` on `NormalClaimSchema`. But further down in the same file (`getEntireArgument` at ~line 396-404), the bare citation `TClaim` records from `getCitations()` are appended into the same `claims: TClaimWithChildren[]` array — a static-type lie that the current wide `TClaim` permits. Under the new discriminated union those entries will be `TCitationClaim` values lacking `childClaimIds` / `childCitationIds`. The server briefing must include either (a) splitting the response so citations live on their own slot rather than mixed into `claims`, or (b) widening the response type so citation entries aren't pretending to be `TClaimWithChildren`. Either is fine; the current code is lying about types.

Separately, `childCitationIds` on `TClaimWithChildren` is populated from `claimCitations.id` (citation-edge IDs), not claim IDs. The field name reads as if those are IDs of citation-typed _claims_. Worth flagging for a future rename — out of scope for this bump.

Required wire-format shape per variant after this bump:

| Field                 | Normal                    | Citation        | Axiomatic          |
| --------------------- | ------------------------- | --------------- | ------------------ |
| `type`                | `"normal"`                | `"citation"`    | `"axiomatic"`      |
| `kind`                | one of `NormalClaimKinds` | `null`          | `null`             |
| `title`               | `string`                  | `null`          | `null`             |
| `body`                | `string`                  | `null`          | `null`             |
| `titleContentHash`    | `string`                  | `null`          | `null`             |
| `url`                 | `null`                    | `string`        | `null`             |
| `citation`            | `null`                    | `IEEEReference` | `null`             |
| `citationContentHash` | `null`                    | `string`        | `null`             |
| `axiom`               | `null`                    | `null`          | one of `AxiomKind` |

Server's likely audit before deciding migration path:

```sql
-- Are any Normal claims missing titleContentHash?
SELECT type, COUNT(*) FROM claims WHERE "titleContentHash" IS NULL GROUP BY type;
-- How much title/body content lives on existing Citation rows?
SELECT COUNT(*) FROM claims WHERE type = 'citation' AND (title IS NOT NULL OR body IS NOT NULL);
```

### Testing

**New / expanded coverage in `src/schemas/__tests__/claims.test.ts`** (existing file; currently covers Normal vs Citation acceptance):

- `Check(NormalClaimSchema, fixture)` passes for a well-formed normal claim; fails when any citation/axiom field is non-null.
- Same positive + negative for `CitationClaimSchema` (title/body/titleContentHash/axiom must be null; citation fields must be present and non-null).
- Same for `AxiomaticClaimSchema` (everything content-bearing is null; `axiom` is one of the six kinds).
- `Check(ClaimSchema, fixture)` accepts each variant; rejects a record with a `type` outside the three literals.
- Type-guard tests: `isNormalClaim`, `isCitationClaim`, `isAxiomaticClaim` narrow correctly.

Note: existing tests in that file (lines 6, 24, 51, 69, 93 in the pre-refactor file) become wrong-shape under the new schema — e.g., the line-24 test currently expects a citation claim to accept `title: "Smith 2024"`, which is now invalid. Rewrite each existing case to match the new per-variant constraints.

**Fixture sweep — five files need updating** (identified during spec review, not an open-ended search):

| File                                              | Issue                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/__tests__/engine.test.ts:41`          | Builds a `TClaim`-shaped fixture; needs the four new null fields and a non-null `titleContentHash`.                                                                                                                                                                                                                   |
| `src/engine/mutations/__tests__/helpers.ts:25-39` | `mkTestClaim` helper returns a partial `TClaim` cast with `as TClaim`. Becomes wrong under the new shape — the cast escape hatch silences the type error but the fixture is still semantically incorrect. Update to construct a full `TNormalClaim` (or accept a variant arg). Used by all mutation tests downstream. |
| `src/engine/review/__tests__/fixtures.ts:83-98`   | `makeClaim` factory — same problem as the mutations helper.                                                                                                                                                                                                                                                           |
| `src/schemas/__tests__/snapshot.test.ts:23`       | Currently passes `titleContentHash: null` on what is implicitly a Normal claim. Under the new schema, Normal claims require `titleContentHash: string`. Either supply a real hash or switch the fixture to a Citation/Axiomatic claim.                                                                                |
| `src/engine/__tests__/text-tree.test.ts`          | Add a case per variant to verify the new `isNormalClaim` narrowing branch in `text-tree.ts`. Existing cases need their fixtures updated to the new shape.                                                                                                                                                             |

Out of scope for testing here: wire/DB round-trip, engine behavior for axiomatic claims (no engine surface yet).

### Versioning and release sequencing

- Bump: pre-1.0 minor (`0.7.2` → `0.8.0`), same minor that ships the proposit-core v0.12 upgrade. Bundling avoids two coordinated breaking-changes bumps for server and mobile.
- After shared cuts `v0.8.0`:
    1. Orchestrator writes the per-repo briefing for `proposit-server` covering (a) the audit queries above, (b) the migration path the server agent picks, (c) the rename table for `claimCitations` → `citations` that's already part of the v0.12 work, (d) the `getEntireArgument` semantic smell flagged above.
    2. Server agent bumps `@proposit/shared`, runs the audit, picks a migration path, ships. _(Spec-review note: `proposit-server/src/` was confirmed to have zero usages of the renamed kind constants — `ClaimKinds`, `ChildClaimKinds`, `LogicalClaimKinds`, `ClaimKindsSchema`, `TClaimKindsSchema` — so the rename has no server impact beyond consuming the new schema.)_
    3. Mobile agent bumps when convenient — mobile mostly reads the engine snapshot rather than raw claim records, so the impact is smaller. The mobile briefing **must** include an explicit grep step for the five renamed identifiers above; the spec-review subagent could not access the mobile tree from this workspace, so the assumption "mobile has zero usages" remains unverified until the mobile agent confirms.

### Out of scope (deferred to later bumps)

- Engine-level axiomatic accessors (`axiomsMap`, `getAxiomsForClaim`, `addAxiom`, `removeAxiom` on `PropositArgumentEngine`).
- `axioms` slot on `FullArgumentSchema` / `ArgumentDiffSchema`.
- `text-tree.ts` rendering decisions for Citation and Axiomatic claims (falls back to empty title/body in this bump).
- An `observation` support/evidence taxonomy on Normal claims — flagged during brainstorming as the right home for empirical claims rather than the axiom union.
- UI consumption of `AXIOM_KIND_LABELS` / `AXIOM_KIND_DESCRIPTIONS` — those are shipped as strings here; mobile and server pick them up when they wire axiom-creation UI.

### Documentation Sync triggers expected to fire

- `docs/release-notes/upcoming.md` (Public-API): rewrite the `ClaimTypeSchema` subsection into a fuller "Discriminated `ClaimSchema` union" section; document the per-variant nullability requirements; document the renames `ClaimKinds` → `NormalClaimKinds`, `ChildClaimKinds` → `NormalClaimChildKindsSchema`, `LogicalClaimKinds` → `NormalClaimLogicalKindsSchema`, `ClaimKindsSchema` → `NormalClaimKindsSchema`, `TClaimKindsSchema` → `TNormalClaimKinds`; document the new top-level `titleContentHash` requirement on every `updateClaim` call; revise the "Out of scope" paragraph to reflect what's still deferred.
- `docs/changelogs/upcoming.md` (Any-Code-Change): add a "Breaking changes — `ClaimSchema` discriminated union" subsection enumerating the new exports (`NormalClaimSchema`, `CitationClaimSchema`, `AxiomaticClaimSchema`, `AxiomKindSchema`, the `isNormal/Citation/Axiomatic` type guards, and the renamed `NormalClaim*` kind schemas) and the field-shape changes; add a "Public-API" entry for the new `consts/axioms.ts` exports; add a "Breaking changes — caller updates required" entry for the `titleContentHash` PATCH-body break.

## See also

- `proposit-core` `src/extensions/basics/schemata.ts` — the discriminated-union pattern this design mirrors.
- `proposit-shared` `docs/release-notes/upcoming.md` — v0.8.0 release notes covering the proposit-core v0.12 upgrade.
- `proposit-shared` `docs/changelogs/upcoming.md` — v0.8.0 changelog.
