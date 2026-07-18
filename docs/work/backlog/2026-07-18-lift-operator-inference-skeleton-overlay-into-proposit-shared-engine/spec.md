# Spec — Lift operator-inference (skeleton overlay) into @proposit/shared/engine

## Capability changes

None declared here. This slice is an internal cross-runtime code lift with no
user-facing behavior delta on its own; the product change (mobile's "add a claim
relative to a selected claim" UX) lands in the mobile slice that consumes this.
It does broaden the shared-master `authoring/add-a-claim-to-a-premise`
(cap-1792cc) conceptually, but the capability-ledger wording change is
coordinated over the inbox channel (non-blocking) and not owned by this slice.

## Problem

The operator-inference logic for the skeleton-building authoring UX is pure over
the shared engine snapshot type, yet lives **only** in `proposit-server`
(`src/app/view/[argumentId]/[version]/contexts/skeleton-overlay.ts`).
`@proposit/shared` has none of it. Mobile is starting a third, narrower copy
(hardcoded `implies`). Three divergent copies are forming (server general, mobile
narrow, shared empty), each free to drift.

## Goals

- One shared source of truth for skeleton operator-inference in
  `@proposit/shared/engine`, consumable by both server and mobile.
- Preserve server's current behavior **exactly** — a later slice has server drop
  its local copy and import shared, so any divergence is a bug.
- Pure functions over `TProjectReactiveSnapshot` (no UI/ATV coupling).

## Non-goals

- **Do not lift the ATV overlay layer.** `applySkeletonOverlay`,
  `nextSkeletonOperator`, `TAtvSkeletonItem`, `TAtvOverlayItem`,
  `TSkeletonOverlayContext` are coupled to server ATV item types
  (`TAtvItem`/`TAtvGhostItem`) — server-local rendering, out of scope. Only the
  four snapshot-pure functions + the commit-plan/target/operator types lift.
- No API-call execution. Shared owns the commit *plan*; the create/delete engine
  mutations stay in each consumer's executor.
- No new engine behavior — mechanical extraction, byte-for-byte logic parity.

## Functions and types to lift

From server `skeleton-overlay.ts`, verbatim logic:

- `computeWrap(expressionId, premiseId, snapshot)` — currently **private** in
  server; export it from shared. Returns `{ premiseId, root, operator, cyclable }`
  or `null`.
- `defaultSkeletonOperator(root)` → `"implies"` when root else `"and"`.
- `rootNegationUnitId(expressions, expressionId)` — outermost NOT of a lone
  negated claim, else `null`.
- `planSkeletonCommit({ target, operator, snapshot })` → `TSkeletonCommitPlan`.
- Types: `TSkeletonOperator` (`"and" | "or" | "implies" | "iff"`),
  `TSkeletonCommitTarget`, `TSkeletonCommitPlan`.

All four read only `snapshot.premises[id].expressions[id]` fields
(`parentId`, `type`, `operator`, `id`) — every one carried by the shared
`TProjectReactiveSnapshot` (base `TReactiveSnapshot.premises[id].expressions`) and
`TPropositionalExpressionCombined` (from `@proposit/shared/schemas/logic`). No
snapshot-shape gap.

## Inference rules (preserved exactly)

- Selected expression is the premise **root** (no non-`not` operator ancestor) →
  default `implies`, cyclable.
- Direct parent is `and`/`or` → operator **pinned** to that parent, non-cyclable
  (engine flattens the new sibling into it, dropping any other operator).
- Otherwise (nested, parent not and/or) → default `and`, cyclable.
- Lone-negated claim (ancestor chain to root is all `not`) → `planSkeletonCommit`
  routes `wrap-nest` on the outermost NOT unit with `direction: "before"` so the
  negation stays the conclusion: `implies(newLeg, NOT(existing))`.
- Empty-leg target → `route: "lone"`.
- Wrap target whose direct parent is `and`/`or` → `route: "wrap-associative"`.
- Wrap target otherwise → `route: "wrap-nest"`; `existingIsConsequent` (consequent
  leg filled first) adds `direction: "before"`, else default (antecedent).

## Export surface

New sub-path `@proposit/shared/engine/skeleton-inference` backed by
`src/engine/skeleton-inference.ts`. Declared explicitly in `package.json`
`exports` with all three conditions (`types`/`import`/`default`) per this repo's
exports-map rule — matching the precedent of `./engine/mutations` and
`./engine/optimistic` being explicit even though an `./engine/*` wildcard exists.

## Acceptance criteria

- The four functions + three types exist in
  `@proposit/shared/engine/skeleton-inference`, logic identical to server's.
- `@proposit/shared/engine/skeleton-inference` resolves (all three export
  conditions), and `dist/engine/skeleton-inference.{js,d.ts}` build.
- Unit tests over synthetic snapshots pass, covering every rule and every
  returned `route` (`lone`/`wrap-associative`/`wrap-nest`) plus both operand-order
  directions.
- `pnpm run check` green.
- No planning-label strings ported into shipped source (strip server's `(B3)` tag).

## Risks, dependencies, related work

- **Consumer parity is the top risk.** Server behavior must be preserved bit-for-
  bit. Mitigation: lift the logic verbatim; tests assert each documented rule.
- Additive shared **minor** (new sub-path). Pre-1.0 caret pins tolerate it.
- Consumer adoption (server drops local copy; mobile replaces its narrow copy) are
  separate slices of the epic, gated on a root-coordinated publish. Not owned here.
