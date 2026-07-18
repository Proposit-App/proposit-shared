# Spec — engine derive/render/algebra/overlay layer

## Goal

Give the *derived-view* layer (derivations + render policy built on top of the
engine math) a canonical home in `@proposit/shared/engine/*`, so `proposit-server`
and `proposit-mobile` consume one implementation instead of drifting copies.

**Correctness bar:** BYTE-IDENTICAL derived output vs the canonical (server-first)
source, locked by golden fixtures SV/MV reuse.

## New subpaths + exports

### `@proposit/shared/engine/derive`

- `counterargumentPremiseIds(snapshot)` — Set of freeform premise ids whose
  consequent is `not(<claim-bound variable>)`. **Source: server** `text-derivations.ts`.
- `attackTargetsByClaimId(snapshot)` + type `TAttackTarget` — map attacked-claim →
  rebuttal locator. **Source: server** `text-derivations.ts`.
- `wrappedOperatorExpressionIds(snapshot)` — expr ids whose parent is a NOT.
  **Source: server** `text-derivations.ts`.
- `citationsByClaimId(snapshot)` — Map citingClaimId → sorted citation edges.
  **Source: server** `text-derivations.ts`.
- `partitionItemsByTab(items, counterSet, tab)` + type `TArgumentTab` — split the
  flat text tree by tab. **Source: mobile** `counterargument.ts`.
- `loneRebuttalTargets(snapshot)` — rebuttals whose root IS the `not` (no reason
  yet). **Source: mobile** `counterargument.ts`.
- `findLoneConclusion(items)` + type `TLoneConclusion` — lone freeform conclusion.
  **Source: mobile** `lone-conclusion.ts`.
- `REPAIRABLE_CODES` (2-code client-detectable subset) + `detectRepairs(snapshot)`.
  **Source: mobile** `argument-repairs.ts`.
- Re-export `getClaimProofState`, `TClaimProofState` from `../argument-metrics`
  (already lives there — do NOT duplicate).

### `@proposit/shared/engine/render`

- `buildArgumentFormula(snapshot)` + types `TArgumentFormula`, `TPremiseFormula` —
  symbolic infix formula + legend. **Source: mobile** `argument-formula.ts`.
- `serializeArgumentToMarkdown(snapshot)` — full markdown export. **Source: server**
  `utils/shared/argument-markdown.ts`.
- `serializeArgumentText(header, items)` + type `TArgumentHeader` (narrowed to
  `{ title; description }`) — plain-text export. **Source: mobile**
  `serialize-argument-text.ts`.
- Citation display projection: `humanizeCitationTypeMap`, `humanizeCitationType`,
  `getInlineSourceLabel` (**server** `citation-display.ts`); `describeSource` +
  type `TSourceDetail` (**mobile** `argument-inspect.ts`); `parseByline`
  (**mobile** `parse-byline.ts`).

### `@proposit/shared/engine/algebra`

- `mergeWithAddedModifiedReconciliation(a, b)` — changeset merge with bucket
  reconciliation. **Source: server** `model/claim.ts` (self-contained; type-only
  dep on `ProjectChangeset`).
- `nextVariableSymbol(variables)` — next unused P..O / X-n symbol. **Source: server**
  `util/next-variable-symbol.ts` (canonical `Record<string,{symbol?}>` signature).

### `@proposit/shared/engine/overlay`

- ATV item model: `TAtvItem`, `TAtvSlotItem`, `TAtvOperatorItem`, `TOperatorLabelEdge`,
  `buildAtvEditableItems(items, snapshot)`, `collectOperatorLabelEdges(snapshot, premiseId)`.
  **Source: server** `text-derivations.ts`.
- Ghost item type `TAtvGhostItem`. **Source: server** `text-tree-ghosts.ts` (TYPE only).
- Skeleton overlay: `TAtvSkeletonItem`, `TAtvOverlayItem`, `TSkeletonOverlayContext`,
  `applySkeletonOverlay(items, snapshot, ctx)`, `nextSkeletonOperator(current, root, advancedMode)`;
  re-exports of `computeWrap`/`defaultSkeletonOperator`/`planSkeletonCommit`/`rootNegationUnitId`
  + their plan types from `../skeleton-inference`. **Source: server** `skeleton-overlay.ts`.

## Out of scope (deliberate)

- `getClaimProofState`, `consequentClaimIds` — already in `argument-metrics`; reuse.
- Ghost *builders* `buildRemovedGhostItems` / `spliceGhostItems` — depend on the
  server-local ReactFlow-coupled `@/engine/graph/types` (`TArgumentDiffWithGhosts`);
  stay server-local. Only the platform-neutral `TAtvGhostItem` type lifts.
- Presentational leaves (server MUI component, mobile RN band/pill/ghost, per-premise
  operator-cycle overrides) — per-platform, not lifted.

## Server ↔ mobile divergences (server chosen unless noted)

- `nextVariableSymbol`: server takes `Record<string,{symbol?}>`; mobile takes
  `readonly string[]`. **Chose server.** Mobile adapts its call site post-swap.
- `counterargumentPremiseIds`: server + mobile are behaviorally identical walks.
  **Chose server** (canonical).
- Repair detection: server's `detectRepairIssues` reads `TCoreValidationIssue`
  (server-only core access); mobile's `detectRepairs` filters snapshot validation
  issues by the 2 client-detectable codes. Brief names mobile's symbols
  (`REPAIRABLE_CODES` + `detectRepairs`) → **chose mobile** for the runtime-agnostic
  client projection.
- IEEE humanization: server has the full 33-type `humanizeCitationTypeMap`; mobile's
  `describeSource` uses its own regex `humanizeType`. Both ported (different call
  sites) — server map is the canonical named export; describeSource keeps its private
  regex humanizer byte-identical.

## Also

- Taxonomy note (doc-only): import = user-facing verb; ingestion = internal pipeline
  vocab. No code rename.
- Normalize two bare `crypto.randomUUID()` → `globalThis.crypto`.
- Core peerDep → `^3.0.0`; devDep pinned to the 3.0.0 tarball.
