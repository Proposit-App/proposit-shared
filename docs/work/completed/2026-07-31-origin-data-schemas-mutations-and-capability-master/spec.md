# Spec — Origin data schemas, mutations, and capability master

Slice **C** of the cross-node epic
[Argument origin data and enthymeme annotations](tcw://W/proposit-app/2026-07-29-argument-origin-data-and-enthymeme-annotations).

## Capability changes

Nine new entries, all cross-platform, all seeded `Status: Missing` — a
runtime-agnostic library asserts no support of its own. This node owns the
master; no other node may declare them.

**New** (`Feature=argument-browse`):

| Path                                       | Name                                  |
| ------------------------------------------ | ------------------------------------- |
| `arguments/see-the-original-source-text`   | See the original source text          |
| `arguments/see-where-content-came-from`    | See where argument content came from  |
| `arguments/see-what-goes-unspoken`         | See what an argument leaves unspoken  |
| `arguments/see-the-source-texts-citation`  | See the source text's citation        |

**New** (`Feature=argument-authoring`):

| Path                                    | Name                                        |
| --------------------------------------- | ------------------------------------------- |
| `authoring/attach-a-source-text`        | Attach a source text                        |
| `authoring/link-content-to-the-source`  | Link argument content to the source text    |
| `authoring/declare-the-sources-role`    | Declare the source text's role              |
| `authoring/mark-content-as-unspoken`    | Mark content as unspoken                    |
| `authoring/attribute-the-source-text`   | Attribute the source text to a real source  |

Each also carries
`Planning doc=2026-07-29-argument-origin-data-and-enthymeme-annotations`.

**Changed here:** `authoring/import-from-source` (`cap-4cac18`) — an import now
also retains the source text and the provenance the pipeline derives, and a
platform import fills in the citation with no prompt; stance is seeded `seed`,
never `representation`.

**Changed elsewhere:** `arguments/copy-to-clipboard` (`cap-778431`) is reworded
by the sibling markdown-export slice, not here.

**Contradiction check.** `tcw capabilities search` over `source` / `origin` /
`provenance` / `enthymeme` / `unspoken` surfaces only
`arguments/see-a-cited-sources-details`, `profile/browse-my-citation-library`,
and `authoring/import-from-source` — all about a *claim's* external reference or
the import mechanism, none about an *argument's* own source text. No
contradiction. `tcw capabilities check` currently reads `capabilities OK`.

**Taxonomy.** No new Vocabulary entries are needed. Core's slice A already
registered `origin-data`, `origin-document`, `origin-link`, `origin-stance`,
`origin-anchor`, and `enthymeme`, and this node federates from `proposit-core`
(`tcw taxonomy list` shows all six under `(proposit-core)`). Shared's local
`import-origin` Vocabulary entry — the *platform* an argument was imported from
— is adjacent but distinct and is linked, not extended.

## Problem

`@proposit/proposit-core` 3.4.0 ships the origin-data model (`OriginLibrary` as
the sixth snapshot slice, `enthymeme` on premises and claim expressions,
`normalizeOriginText` / `sliceByCodePoints` / `sha256Hex`, grammar rule `P-6`),
but neither consumer app can reach it. There are no app-level schemas over the
core entities, no mutation functions, no API bodies or client methods, and no
derivation of the two things the product actually shows: enthymeme *suggestions*
and the *contradiction* warning.

The reading surfaces are the sharp end. `TProjectReactiveSnapshot`
(`src/engine/engine.ts:62-71`) is the single object the web view, the mobile
view, and `serializeArgumentToMarkdown` (`src/engine/render/markdown.ts:15-31`)
all read. It already extends core's reactive snapshot with `claims`,
`citations`, and `validationIssues`. Origin data that does not land there forces
every consumer to fetch and thread it separately, and turns the sibling
markdown-export slice from a one-function change into a plumbing change in three
repos.

## Goals

1. App-level schemas over core's three origin entities, following the
   `citations.ts` idiom — core schema intersected with the app fields the server
   needs (`src/schemas/model/citations.ts:5-11`).
2. Origin data on `TProjectReactiveSnapshot`, populated the way `claims` and
   `citations` already are — internal map, dirty flag, cached record,
   `fromServerData` load path.
3. Mutation functions in the established `src/engine/mutations/` idiom, with the
   changeset-vs-model-surface split stated in each function's JSDoc.
4. Two new `UserTierLimits` entries with chosen values.
5. Runtime-agnostic, pure suggestion and contradiction derivation over the
   snapshot.
6. API body schemas and api-client functions for attach / set-stance / anchor /
   mark / attribute.
7. The nine capability-master entries.

## Non-goals

- **Persistence.** No SQL, no migrations, no `persistChangeset` extension — the
  server slice owns all of it. This slice defines the shapes it persists.
- **Enforcement of the tier limits.** Shared owns the numbers; the server owns
  the single write-path guard both entry points call.
- **The markdown export.** A separate slice, blocked on this one.
- **Automatic enthymeme detection.** Suggestions mutate nothing, ever.
- **A version bump, tag, or publish.** The shared release is deferred and
  bundled with the sibling markdown-export slice.
- **Fuzzy quote matching.** Core rejects an anchor whose slice does not equal its
  own `exact` quote; nothing in this slice locates quotes.
- **Multiple documents per argument version.** Core's library admits N; the
  product enforces at most one, and the snapshot shape reflects the product rule.

## Design

### 1. Schemas — `src/schemas/model/origin.ts`

Core exports `CoreOriginDocumentSchema`, `CoreOriginLinkSchema`,
`CoreOriginAnchorSchema`, `OriginStanceSchema`, `OriginAnchorTargetTypeSchema`,
and `OriginSegmentSchema` from the package root (verified in
`node_modules/@proposit/proposit-core/dist/lib/schemata/origin.d.ts`). App
extension follows `ClaimCitationSchema`:

- `OriginDocumentSchema` = core + `{ creatorId, createdOn, reference? }`.
  `creatorId` is load-bearing, not decorative: same-owner dedup and the
  aggregate storage limit are both per-user, and the server cannot compute
  either without an owner on the document. `reference` is the optional IEEE
  reference, typed from the schemas already re-exported by
  `src/schemas/model/references.ts:3` — this is attribution, and core's own
  design note says attributing a document leaves its checksum unchanged because
  the entity checksum covers `digest`, not the open properties.
- `OriginLinkSchema` = core + `{ createdOn }`.
- `OriginAnchorSchema` = core + `{ createdOn }`.

Stance and target-type schemas are re-exported unchanged so consumers have one
import path, exactly as `src/schemas/grammar/index.ts` does for the grammar wire
format.

`enthymeme` needs **no** schema work. Shared's `PropositionalPremiseSchema` and
the three expression schemas already intersect core's
(`src/schemas/logic.ts:33-56`, `:110-113`), so `Type.Optional(Type.Literal(true))`
is inherited verbatim — including its refusal of `null` and `false`.

Barrel: add to `src/schemas/model/index.ts`. No `package.json` `exports` change
is needed — `"./schemas/*"` and `"./engine/*"` are wildcard subpaths whose `*`
spans path separators, so `@proposit/shared/schemas/model/origin` and
`@proposit/shared/engine/origin` already resolve, and each wildcard already
declares `types`, `import`, and `default`.

### 2. Origin data on the reactive snapshot

```ts
export type TProjectOriginData = {
    document: TOriginDocument | undefined
    link: TOriginLink | undefined
    anchors: Record<string, TOriginAnchor[]>
}
```

`anchors` is keyed by the anchor's `targetId` — an expression id, a premise id,
or the argument id, per core's `targetType` union. This is the shape a reading
surface actually indexes by: "does this item have provenance, and what passage".

At most one document and one link, because the product enforces at most one
source text per argument version. Recording that as a scalar rather than an
array is what keeps the markdown-export slice a one-function change; a consumer
that had to pick a document out of an array would need the product rule
duplicated in three repos.

`TProjectReactiveSnapshot` gains `origin: TProjectOriginData`. Implementation
mirrors `citations` exactly (`src/engine/engine.ts:91`, `:213-216`, `:239-245`,
`:462-523`): a private field, an `originDirty` flag, a cached record, and
participation in the referential-equality short-circuit that keeps
`useSyncExternalStore` stable.

Engine accessors, named against the existing `getCitations` / `addCitation`
pair: `getOrigin()`, `setOriginDocument()`, `setOriginLink()`, `addOriginAnchor()`,
`removeOriginAnchor()`, `clearOrigin()`. `fromServerData` gains an optional
fourth parameter carrying the origin data, defaulted so every existing call site
keeps compiling.

### 3. Mutations — `src/engine/mutations/origin.ts`

Two families, and the split is the point:

**Changeset-bearing** — `enthymeme` lives on premises and expressions, which
*are* changeset entities, so the server persists these through
`persistChangeset`:

- `mutateMarkExpressionEnthymeme(engine, expressionId, marked)` — routes through
  core's `patchExpressionAppFields(id, { enthymeme: true })` /
  `{ enthymeme: undefined }`. Core documents that an `undefined` value *deletes*
  the key rather than assigning it, which is exactly the unmark semantics the
  checksum invariant requires. `patchExpressionAppFields` returns `void`, so the
  mutation reads the patched expression back via `engine.getExpression(id)` and
  returns `{ expression, changes: { expressions: { added: [], modified: [expr],
  removed: [] } } }` — the same `TCoreEntityChanges` shape every other mutation
  emits.
- `mutateMarkPremiseEnthymeme(engine, premiseId, marked)` — routes through
  `premiseEngine.updateExtras({ enthymeme: true | undefined })`, which already
  returns `{ changes }`. This is the same call shape as
  `syncPremiseExtrasRole` (`src/engine/mutations/premises.ts:238`).

**Model-surface** — origin documents, links, and anchors are a separate library
that never enters a `TCoreChangeset` (core's API reference states this
explicitly), so they follow the `claimCitations` precedent and persist through
their own model surface:

- `mutateAttachOriginDocument(engine, document, link)`
- `mutateSetOriginStance(engine, stance)`
- `mutateAddOriginAnchor(engine, anchor)` / `mutateRemoveOriginAnchor(engine, anchorId)`
- `mutateAttributeOriginDocument(engine, reference)`
- `mutateDetachOriginDocument(engine)` — drops the link, the document, and every
  anchor together, because replacing a document invalidates its anchors by
  design.

Each returns the mutated entity, never a changeset. The JSDoc on every function
in both families names which persistence route it belongs to; the server slice
depends on the distinction.

**No new call site passes a possibly-`undefined` field expecting the key to
survive.** Core 3.4.0 made `setExtras` / `updateExtras` and the `ArgumentParser`
`map*` hooks drop `undefined`-valued keys. The enthymeme mutations rely on that
deletion behavior deliberately; nothing else in this slice routes a maybe-value
through those methods.

### 4. Tier limits — `src/consts/user-tiers.ts`

Two fields added to `UserTierLimitsSchema`
(`src/schemas/model/users.ts:148-153`) and to all five entries of
`UserTierLimits` (`src/consts/user-tiers.ts:20-51`).

| Tier         | `maxSourceTextChars` | `maxStoredSourceTextChars` |
| ------------ | -------------------- | -------------------------- |
| `UNVERIFIED` | 0                    | 0                          |
| `FREE`       | 20 000               | 200 000                    |
| `PREMIUM`    | 100 000              | 5 000 000                  |
| `ENTERPRISE` | 500 000              | 100 000 000                |
| `NO_ASSIST`  | 20 000               | 200 000                    |

Both are measured on the **normalized** text. `UNVERIFIED` stays 0 across the
board, matching every existing entry. `NO_ASSIST` matches `FREE` because it
differs from `FREE` only in `maxTokensPerMonth`, and attaching a source text is
not an AI operation. The per-document ceiling is set so a long-form article or
essay fits comfortably while a pasted book does not; the aggregate is ten
documents at the ceiling for `FREE`.

### 5. Derivation — `src/engine/origin-derivation.ts`

Pure, runtime-agnostic, reads the snapshot and nothing else. Two functions:

```ts
deriveEnthymemeSuggestions(snapshot): TEnthymemeSuggestion[]
deriveEnthymemeContradictions(snapshot): TEnthymemeContradiction[]
```

Both return `{ targetType, targetId }` records; the contradiction additionally
carries the anchor ids that conflict with the mark.

Rules:

- Suggestions fire only when `snapshot.origin.link?.stance === "representation"`.
  With no document, or at stance `seed`, both functions return `[]`. Stance
  governs only whether *absence* is meaningful.
- A suggestion is emitted for each claim-bound variable expression and each
  premise with no anchor and no existing `enthymeme` mark. Premise-bound
  variable expressions are excluded — core's `P-6` reports a mark on one as a
  Presentable violation, so suggesting it would be suggesting a violation.
- A contradiction is emitted for content that is both anchored and marked
  `enthymeme`, under `representation` only.
- **Neither function mutates anything.** This is the epic's governing invariant —
  an enthymeme is declared, never derived — and it gets a dedicated test rather
  than a comment.

Provenance highlighting is *not* stance-gated: `snapshot.origin.anchors` is
populated under either stance, because "this came from here" is true regardless.

### 6. API bodies and client — `src/schemas/api/argument/origin.ts`, `src/api-client/argument/origin.ts`

Bodies for attach / set-stance / add-anchor / remove-anchor / mark / attribute,
exported through `src/schemas/api/argument/index.ts`. Client functions follow
`participants.ts` verbatim — `resolveBaseUrl(config)` then `strictFetch` with the
request and response schemas — and register in `src/api-client/factory.ts`'s
`impls` map.

Routes, following the existing `/api/v1/argument/{id}/{version}/…` shape:

| Method   | Path                                              |
| -------- | ------------------------------------------------- |
| `GET`    | `…/origin`                                        |
| `POST`   | `…/origin`                                        |
| `DELETE` | `…/origin`                                        |
| `PATCH`  | `…/origin`                                        |
| `POST`   | `…/origin/anchors`                                |
| `DELETE` | `…/origin/anchors/{anchorId}`                     |
| `PATCH`  | `…/premise/{premiseId}/enthymeme`                 |
| `PATCH`  | `…/expression/{expressionId}/enthymeme`           |

`PATCH …/origin` carries both the stance and the reference, because both are
single-field edits to the same link/document pair and two endpoints onto one
resource is where they drift.

**No new coded error envelope.** The tier-limit refusals the server raises are
ordinary 4xx bodies over the existing `schemas/api/errors` shape, so
`parseResponse` at the root normalizer needs no new detection branch. If the
server slice finds it needs a coded envelope, that is a change request back to
this node — a schema plus a type guard without a `parseResponse` branch leaves
the guard unreachable.

## Acceptance criteria

1. `snapshot.origin` is present on every `TProjectReactiveSnapshot`, with
   `document`/`link` `undefined` and `anchors` `{}` on an argument that has no
   source text.
2. Two successive `getProjectSnapshot()` calls with no intervening mutation
   return the identical `origin` object (referential equality holds, so
   `useSyncExternalStore` does not re-render).
3. `PropositArgumentEngine.fromServerData(snapshot, claims, citations)` — the
   existing three-argument call — still compiles and returns an engine whose
   `snapshot.origin` is the empty shape.
4. An argument with **no** origin document can have a premise and a claim
   expression marked `enthymeme`, and both survive a snapshot round-trip through
   `fromServerData`.
5. Unmarking deletes the key: after mark-then-unmark, `"enthymeme" in premise` and
   `"enthymeme" in expression` are both `false` — not `undefined`, not `false`.
6. `mutateMarkPremiseEnthymeme` and `mutateMarkExpressionEnthymeme` each return a
   changeset whose `premises.modified` / `expressions.modified` contains the
   marked entity.
7. The origin mutations return the mutated entity and **no** `changes` key.
8. Derivation matrix, all four cases:
   - no document → `deriveEnthymemeSuggestions` returns `[]`
   - `seed` + unanchored content → `[]`
   - `representation` + unanchored content → one suggestion per unanchored
     claim-bound variable expression and premise
   - `representation` + content both anchored and marked →
     `deriveEnthymemeContradictions` reports it
9. A test asserts that running both derivation functions over a snapshot leaves
   every entity's `enthymeme` state byte-identical — no derivation path writes a
   mark.
10. `UserTierLimits` has `maxSourceTextChars` and `maxStoredSourceTextChars` on
    all five tiers, both `0` for `UNVERIFIED`, and `UserTierLimitsSchema`
    validates each entry.
11. Every new api-client function appears on `TApiClient` and is reachable from
    `createApiClient(config)`.
12. `pnpm run check` passes.
13. `tcw capabilities check` passes with the nine new entries, each reading
    `Status: Missing`, the correct `Feature`, and the `Planning doc`
    back-pointer.
14. No source file reaching `dist/` references `window`, `document`, `Buffer`, or
    `process` — `lib: ["ES2022"]` holds, asserted by `pnpm run build` succeeding.

## Risks

- **The `null`-versus-absent checksum trap.** The epic's highest-severity risk.
  A present `enthymeme` key holding `null` or `false` changes the checksum of
  every premise and expression in the database. Shared cannot persist, but it
  *can* hand the server a wrongly-shaped entity. Mitigated by criterion 5 and by
  relying on core's `undefined`-deletes semantics rather than hand-rolling the
  unmark.
- **Snapshot shape is a one-way door for two consumer slices.** The server's web
  surfaces and mobile's reading surface both plan against `snapshot.origin`.
  Changing its shape after those slices start is a three-repo edit. Mitigated by
  naming it precisely in the report back and by the at-most-one-document product
  rule being encoded in the shape rather than in each consumer.
- **`fromServerData`'s signature.** Adding a required fourth parameter would
  break every existing call site in server and mobile at the moment they repin.
  The parameter is optional; criterion 3 pins that.
- **Tier-limit values are a judgment call with no usage data.** They are
  constants in a published library, so raising them later is a version bump, not
  a migration — the reversal cost is low and the numbers are deliberately not
  precise.

## Notes

- The request's *What changes* §5 warns that a new coded error envelope needs a
  `parseResponse` branch. This slice introduces none; the warning is recorded in
  the design so the server slice knows the branch does not exist yet.
- The request's *Documentation Sync* §1 predicts new `package.json` `exports`
  subpaths. None are needed — the existing `"./schemas/*"` and `"./engine/*"`
  wildcards already cover the new modules and already declare all three
  conditions. `README.md` still gets the new module names.
