---
from: .
initiative: 2026-07-18-add-claims-with-relationships-on-mobile-lift-operator-inference-to-proposit-shared
---

# Lift operator-inference (skeleton overlay) into @proposit/shared/engine

Slice 1 of the cross-node epic
`2026-07-18-add-claims-with-relationships-on-mobile-lift-operator-inference-to-proposit-shared`
(root node). Mobile needs the server's "add a claim *relative to* a selected claim,
operator inferred from structure" authoring UX. The inference logic must be shared,
not re-copied — mobile already has a narrow hardcoded-`implies` copy and the shared
module meant to prevent that drift is still empty.

## Problem / root cause

The operator-inference functions are pure functions over the shared engine snapshot
type, but they live **only** in `proposit-server`
(`src/app/view/[argumentId]/[version]/contexts/skeleton-overlay.ts`). `@proposit/shared`
has none of them, so mobile can't consume one implementation. Three copies are
forming (server general, mobile narrow, shared empty).

## Proposed fix

Extract these into `@proposit/shared/engine` as pure functions over
`TProjectReactiveSnapshot` (from `@proposit/shared/engine/engine`):

- `computeWrap`
- `defaultSkeletonOperator`
- `rootNegationUnitId`
- `planSkeletonCommit` (+ the commit-routing plan type it returns)

**Inference rules** (from server `skeleton-overlay.ts` / `skeleton-commit.ts`):

- Selected claim is the premise **root** (no non-`not` operator ancestor) → default
  **`implies`** (cyclable implies↔iff; advanced adds and/or).
- Selected expression's direct parent is `and`/`or` → operator **pinned** to that
  parent (non-cyclable; engine flattens the new sibling into it).
- Otherwise (nested, parent not and/or) → default **`and`** (cyclable and↔or).
- Lone-negated claim → wrap so `implies(newLeg, NOT(existing))` (negation stays the
  conclusion).
- Operand order depends on which empty leg is filled (consequent-top vs
  antecedent-bottom).
- Commit routing: `lone` / `wrap-associative` → createClaim+createVariable+createExpression;
  `wrap-nest` → createClaim+createVariable+createExpressionWithOperator. Compensating
  deletes on failure. (The api calls stay in the consumers; shared owns the *plan*.)

Operators are `not`/`and`/`or`/`implies`(ordered)/`iff` — core `propositional.ts`,
re-exported as `LogicalOperatorType`.

Reference the server implementation for exact behavior; the extraction is mechanical
because the inputs are already the shared snapshot type. Export via a new `./engine`
sub-path entry (declare `types`/`import`/`default` in `package.json` `exports`, per
this repo's exports-map rule).

## Test cases (write failing first)

Unit tests over synthetic `TProjectReactiveSnapshot`s covering each rule:
root→implies, and/or-parent→pinned, nested→and, lone-negation→wrap, and operand
order for both filled-leg directions. Assert the returned commit plan
(`lone`/`wrap-associative`/`wrap-nest`) matches.

## Consumer impact

- `proposit-mobile` (Slice 2): replaces its hardcoded-`implies`
  `use-inference-editing.tsx` path with this; its shipped
  `convert-to-inference.test.tsx` must stay green (parity check).
- `proposit-server` (follow-up): later drops its local copy to consume shared. The
  extracted functions must preserve server's current behavior exactly.

## Capability

Broadens the shared-master `authoring/add-a-claim-to-a-premise` (cap-1792cc) to cover
related claims with an inferred operator. Coordinate wording over the inbox channel
(non-blocking).
