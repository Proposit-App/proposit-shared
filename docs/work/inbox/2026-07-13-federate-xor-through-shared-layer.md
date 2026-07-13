---
from: .
initiative: 2026-07-13-add-xor-propositional-logic-operator
---

# Federate XOR through shared layer

Slice 2 of the cross-node epic **Add XOR propositional logic operator**.
**Depends on the `@proposit/proposit-core` publish that adds `xor`** (Slice 1) —
plan/scaffold now, finish after that publishes.

## Locked design decisions (from the epic)

- **XOR is variadic and nestable — same family as `and`/`or`** (parity
  semantics). It is **not** an inference operator (no child-order reversal).

## What inherits automatically (core-bump only)

`src/schemas/logic.ts` re-exports `CoreLogicalOperatorType`, so all expression
schemas and the api/argument/batch schemas gain `xor` transitively once the
`@proposit/proposit-core` dep is bumped. No edits needed there.

## Hardcoded spots that must be edited by hand

- `src/fixtures/argument-yaml/schema.ts` — add `Type.Literal("xor")` to the
  `ExprNode` operator union (does **not** derive from core).
- `src/engine/text-tree.ts` — add an `xor` entry to `OPERATOR_LABELS`
  (natural-language label — this is **canonical product wording**); extend the
  operator member type. Keep `isInference = implies||iff` (xor does **not**
  reverse child order).
- `src/engine/mutations/expressions.ts` — include `xor` in the variadic branch
  (`operator === "and" || "or"` → `… || "xor"`) so multi-child detection,
  `mutateChangeOperator`, and `mutateCreateExpressionWithOperator` treat it as
  n-ary.
- `src/schemas/review.ts` — **no change** (xor is non-inference).
- `src/checksum.ts` — **no change** (field-set based; operator is hashed content).

## Capability (shared master — declared here FIRST)

Declare the new cross-platform capability via `tcw capabilities`, seeded
`Status: Missing`: *a user can express exclusive-or / mutual-exclusivity
relationships between claims (parity semantics).* This is the master the
consumers federate from; server will override → `Supported`, mobile inherits.
Coordinate label wording over escalate/inbox — non-blocking.

## Consumer impact

- Minor bump. Server + mobile pick up `xor` labels + n-ary mutation behavior.
  Publish gated on orchestrator consumer-side validation against **both**
  server and mobile.

## Test cases

- `src/engine/__tests__/text-tree.test.ts` — xor label rendering.
- `src/engine/mutations/__tests__/expressions.test.ts` — create/change to xor as
  n-ary (multi-child).
- `src/fixtures/argument-yaml/__tests__/argument-yaml.test.ts` — xor in the YAML
  union validates.

## Version / publish

Flip the core dep to the published version first. Then `pnpm version minor`;
roll release notes/changelog. Do **not** self-publish (orchestrator gate).
