# Spec — shared slice of the argument-diff epic

Design (authoritative): `docs/design/2026-07-12-argument-diff-modification-semantics.md`.
Epic: `docs/work/active/2026-07-12-argument-diff-unified-modification-semantics-cross-repo/`.
Upstream shipped: `@proposit/proposit-core@2.5.0` — four-state model in
`proposit-core/src/lib/types/diff.ts` + `proposit-core/src/lib/core/diff.ts`.

This slice delivers three things (design "Architecture / placement" table): the
enriched wire `TArgumentDiff`, the claim+citation composition module, and the
render-intent policy module. Plus the core dep bump.

## 1. Enriched `TArgumentDiff` wire schema

### Current (lossy)

`proposit-shared/src/schemas/model/arguments.ts:73-102`:

```
claims:            { added, removed, updated }            // 3-bucket, no state
propositionalLogic.variables:    { added, removed, updated }
propositionalLogic.expressions:  { added, removed }       // NO modified
propositionalLogic.premises:     { added, removed }       // NO modified, NO nested expressions
citations:         { added, removed }                     // NO modified
```

It cannot carry core's `state`, `expressions.modified`, or conclusion `roles`.
The server already computes those in core@2.5.0 but flattens them away — e.g.
`argumentDiff` maps variables to `updated: modified.map((m) => m.after)`
(`proposit-server/src/model/argument/forks.ts:846`), dropping `before`,
`changes`, and `state`; and premise/expression `modified` never reach the wire
at all (`forks.ts:783-805` only reads `.added`/`.removed`).

### Target (lossless — mirrors core)

Core's diff shape (`proposit-core/src/lib/types/diff.ts`) is the model to mirror,
specialized onto shared's app-level entity schemas:

- `TCoreDiffState = "added" | "removed" | "modified-own" | "modified-within"`
  (types/diff.ts:28); `state` on a matched record is only the `modified-*` pair
  (types/diff.ts:39).
- `TCoreEntityFieldDiff<T> = { before, after, changes, state }` (diff.ts:35).
- `TCoreEntitySetDiff<T> = { added, removed, modified: TCoreEntityFieldDiff<T>[] }`
  (diff.ts:43).
- `TCorePremiseDiff` = `TCoreEntityFieldDiff<TPremise>` + `expressions:
  TCoreEntitySetDiff<TExpr>` (diff.ts:50).
- `TCoreRoleDiff = { conclusion: { before, after } }` (diff.ts:67).

New TypeBox primitives (author in `arguments.ts` alongside `ArgumentDiffSchema`,
or a colocated block — no new subpath needed):

```ts
const DiffStateSchema = Type.Union([
    Type.Literal("modified-own"),
    Type.Literal("modified-within"),
])
const FieldChangeSchema = Type.Object({
    field: Type.String(),
    before: Type.Unknown(),
    after: Type.Unknown(),
})
const entityFieldDiff = <T extends TSchema>(schema: T) =>
    Type.Object({
        before: schema,
        after: schema,
        changes: Type.Array(FieldChangeSchema),
        state: DiffStateSchema,
    })
const entitySetDiff = <T extends TSchema>(schema: T) =>
    Type.Object({
        added: Type.Array(schema),
        removed: Type.Array(schema),
        modified: Type.Array(entityFieldDiff(schema)),
    })
```

Re-shaped `ArgumentDiffSchema`:

```ts
export const ArgumentDiffSchema = Type.Object({
    claims: entitySetDiff(ClaimSchema),                 // was added/removed/updated
    variables: entitySetDiff(PropositionalVariableSchema),
    premises: Type.Object({                             // premise set + nested expressions
        added: Type.Array(PropositionalPremiseSchema),
        removed: Type.Array(PropositionalPremiseSchema),
        modified: Type.Array(
            Type.Intersect([
                entityFieldDiff(PropositionalPremiseSchema),
                Type.Object({
                    expressions: entitySetDiff(PropositionalExpressionSchema),
                }),
            ])
        ),
    }),
    citations: entitySetDiff(ClaimCitationSchema),      // modified now expressible (see §4)
    roles: Type.Object({
        conclusion: Type.Object({
            before: Nullable(UUID),
            after: Nullable(UUID),
        }),
    }),
})
```

Notes / deltas:

- Drop the `propositionalLogic` wrapper — flatten `variables`/`premises` to the
  top level so every entity family is a uniform `entitySetDiff`. (Consumers
  reshape anyway; a flat shape is what the render module wants.) The api-client
  round-trips it opaquely (`src/api-client/argument/index.ts:135` just validates
  against `ArgumentDiffSchema`), so no api-client logic change — only the schema.
- Entity schemas are the existing app-level ones: `ClaimSchema`
  (`schemas/model/claims.ts`), `PropositionalVariableSchema` /
  `PropositionalExpressionSchema` / `PropositionalPremiseSchema`
  (`schemas/logic.ts:98,59,112`), `ClaimCitationSchema`
  (`schemas/model/citations.ts:5`).
- `roles.conclusion.before/after` are premise ids (`Nullable(UUID)`), matching
  core `TCoreRoleDiff.conclusion` (`string | undefined`) and the persisted
  `conclusionPremiseId`.
- The three-bucket `updated` name is retired; `modified` (with `state`) replaces
  it. This is the breaking wire change.

## 2. Complete-diff composition module

Fold claim-content + citation four-state onto core's structural diff. Core owns
neither (design table); today the fold lives in the server (`forks.ts:702-864`).
Promote the platform-agnostic core of it into shared. Runtime-agnostic: **no DB,
no `console`** — inputs are plain arrays the server (or mobile) supplies.

New file: `src/engine/diff.ts` (resolves via the `./engine/*` wildcard export —
`package.json:171`; no exports-map edit needed).

```ts
export function composeArgumentDiff(input: {
    coreDiff: TCoreArgumentDiff<TArgument, TPropositionalVariable,
                                TPropositionalPremise, TPropositionalExpressionCombined>
    claimsBefore: TClaim[]           // normal claims only (caller pre-filters)
    claimsAfter: TClaim[]
    citationsBefore: TClaimCitation[]
    citationsAfter: TClaimCitation[]
    derivationPremiseIds: ReadonlySet<string>   // filtered from expressions/premises
    claimForkMap?: ReadonlyMap<string, string>  // entityId -> forkedFromEntityId (fork pairing)
}): TArgumentDiff
```

Responsibilities lifted from `forks.ts`:

- Claim four-state (`forks.ts:712-728`): match after→before by
  `claimForkMap.get(id) ?? id`; digest change (`claims.ts:52`,
  `forks.ts:721`) ⇒ `modified-own`. `added`/`removed` by membership. (Claim
  `modified-within` is derivable by the render policy from the citation diff;
  the composition keeps claims to `own` + add/remove — no over-scoping.)
- Citation four-state (§4).
- Derivation-premise filtering (`forks.ts:807-834`): drop derivation premises
  from `premises.*` and expressions whose `premiseId` is a derivation premise —
  mirror the existing `Set`-based filter (design OQ5: derivation premises stay
  filtered, no within-leakage).
- Re-attach premise `role` from the entity data (`forks.ts:783-790` re-attaches
  role because core premise objects drop it) — the caller passes full app-level
  premise entities, so `modified`/`added`/`removed` premise records already
  carry `role`; the composition just carries them through (no core-object
  substitution needed).

The server's `argumentDiff` (`forks.ts:574`) keeps: permission checks, DB
loads, fork-record loading + `core.diffArguments`, then calls
`composeArgumentDiff(...)` and returns its result — shrinking from ~290 lines to
orchestration. Mobile calls the same module with its own data source.

## 3. Render-intent policy module

Promote `buildDiffMaps`
(`proposit-server/src/app/view/[argumentId]/[version]/contexts/diff-context.tsx:15-133`)
into shared and apply the design's "origin + affected containers" rule. The
existing function is already platform-agnostic (pure `Map`s; its only non-shared
import is the local `DiffStatus` string-union type from
`@/engine/graph/types.ts:22` — `"added" | "removed" | "updated" | "unchanged"`).

New file: `src/engine/diff-render.ts` (also via `./engine/*` wildcard).

```ts
export type DiffCue = "added" | "removed" | "origin" | "touched"
//  origin  = modified-own  (strong ◆ / ring)
//  touched = modified-within (subtle)  — design "Rendering policy"

export interface DiffRenderMaps {
    nodeDiffMap: Map<string, DiffCue>       // expressions + "claim:"/"variable:" prefixed
    premiseDiffMap: Map<string, DiffCue>
    edgeDiffMap: Map<string, DiffCue>       // operator expressions
    citationDiffMap: Map<string, DiffCue>   // keyed `${claimId}:${supportingClaimId}`
    removedClaims: Map<string, TClaim>
    removedVariables: Map<string, TPropositionalVariable>
    removedPremises: Map<string, { role: TPremiseRoleType; title: string | null }>
    removedCitations: Map<string, TClaimCitation[]>   // grouped by citing claimId
}
export function buildDiffRenderMaps(diff: TArgumentDiff): DiffRenderMaps
```

Policy mapping (design "Rendering policy — origin + affected containers"):

- `added`/`removed` set membership ⇒ `"added"`/`"removed"` (as
  `diff-context.tsx:40-63,66-100`).
- `modified` entry with `state === "modified-own"` ⇒ `"origin"`; `state ===
  "modified-within"` ⇒ `"touched"`. This is the new signal the old three-bucket
  map could not express — an in-place expression edit or a claim edit reaching a
  premise by reference now renders (previously invisible per design "Problem").
- Argument header quiet unless `roles.conclusion.before !== after` or the
  argument entry is `modified-own` (design: "argument header stays quiet unless
  its own metadata changed").
- Keep the derivation-premise belt-and-braces filter
  (`diff-context.tsx:24-37`) even though composition already filtered.

The server's `diff-context.tsx` becomes a thin React wrapper calling
`buildDiffRenderMaps`; its `DiffStatus`→visual mapping adopts the `DiffCue`
vocabulary (`origin`/`touched` are new visuals — design's `◆`/subtle cue).
Mobile builds its native visuals off the same `DiffCue`.

## 4. Citation identity — open question 4 (RESOLVED)

**Recommendation: no new stable-id column. Match citations on the endpoint pair
`(claimId, supportingClaimId)`; a version-pin/checksum change on a matched edge
is `modified-within`. Digest/checksum-identity does NOT work; row `id` does NOT
work.**

Evidence:

- A `ClaimCitation` is `CoreClaimConnectionSchema` + `{argumentId, createdOn}`
  (`schemas/model/citations.ts:5-11`). The connection fields
  (`claim-connection.ts:3-32`) are: `id`, `claimId`, `claimVersion`,
  `supportingClaimId`, `supportingClaimVersion`, `checksum`. A citation has **no
  free-form own content** — it is purely a directional edge between two claims
  plus version pins.
- **Row `id` is unusable as identity:** the fork path mints a fresh
  `id: generateId()` when carrying an edge forward
  (`forks.ts:280`), so the same logical edge has different ids across
  versions/forks.
- **`checksum`/digest is unusable as identity:** it is a hash of the edge's
  content (`claim-connection.ts:23` "checksum for sync detection"), so it
  *changes on the very modification we want to detect* — it is the content, not
  the identity.
- **The endpoint pair is already the de-facto key.** Today's citation diff keys
  by `supportingClaimId` set membership only (`forks.ts:766-774`) and the render
  map keys by `` `${cc.claimId}:${cc.supportingClaimId}` `` (`diff-context.tsx:91,97`).
  Two edges with the same `(claimId, supportingClaimId)` within one argument
  version would be a claim citing the same support twice — nonsensical — so the
  pair is unique per side.
- **Why `modified` is needed:** today a `supportingClaimVersion` (or
  `claimVersion`) bump on an otherwise-stable edge is present on both sides, so
  it is neither added nor removed — it is **invisible**, exactly the class of
  dropped signal the design targets. Matching on the endpoint pair and comparing
  the version pins/checksum surfaces it.
- **State assignment:** a citation has no `modified-own` case — changing an
  endpoint *is* a different edge (add old + remove new). A matched edge whose
  pins moved reflects that a *referenced* claim advanced, so it is
  `modified-within` (design "single origin": the origin is the supporting
  claim's `modified-own`; the edge is a container the change reaches). This
  aligns with design semantic-specific #2: "a claimVersion pin bump is the
  evidence that a referent changed."

Composition (§2) therefore matches citations on `(claimId, supportingClaimId)`;
membership ⇒ `added`/`removed`; matched-with-changed-pin/checksum ⇒
`modified-within`. This needs **no schema migration** — the fields already
exist.

## 5. Core dep bump strategy

`proposit-shared/package.json`: devDep `@proposit/proposit-core` `^2.3.1`→`^2.5.0`
(line 218), peerDep `^2.3.0`→`^2.5.0` (line 210). Then `pnpm install` to pull
2.5.0 into the workspace. `TCoreArgumentDiff`, `TCoreDiffState`, `TCoreRoleDiff`
etc. are imported directly from `@proposit/proposit-core` by the composition
module (server already imports core diff types directly — `forks.ts:17-20` — so
no new shared re-export is required). Peer bump is a breaking-ish floor lift;
consumers already track core@2.5.0 (published). Shared version bump: **minor**
(pre-1.0 policy — minor may carry breaking changes; the wire-schema break rides
this minor per `CLAUDE.md` versioning policy).

## Consumer impact / boundary

- `proposit-server`: `argumentDiff` (`forks.ts`) thins onto `composeArgumentDiff`;
  `diff-context.tsx` thins onto `buildDiffRenderMaps` + adopts `DiffCue` visuals
  (renders the previously-invisible in-place-expression & conclusion cues); its
  `compareVariableIgnoringVersionMetadata` narrowing (`forks.ts:559-572`) is the
  **server** slice's job (OQ1) — not this slice.
- `proposit-mobile`: consumes both modules; no reimplemented semantics.
- Do not self-publish; publish is gated on consumer validation at the workspace
  root.

## Out of scope (other slices)

- Core enrichment (four-state, `expressions.modified`, roles, reference-version)
  — done + published in core@2.5.0.
- `claimVersion`-filter narrowing + curated changed-premise id stability —
  server slice.
- Native diff visuals — mobile slice.
