# Spec

Authoritative design is the core seed spec, **Layer 2 — `@proposit/shared`**
section:
`proposit-core/docs/work/active/2026-07-21-usage-based-default-variable-assignments-and-inline-t-f-u-review-in-the-argument-text-view/spec.md`

This item implements that section. Deltas from the sketch, forced by the real
codebase, are recorded below.

## Surface (`src/engine/review/`)

- `types.ts`
  - `export type TAssignmentProvenance = "user" | "default"`.
  - Extend `TReviewOverlay` (additively, all new fields optional so the existing
    wizard `buildReviewOverlay` still satisfies it):
    - `claimProvenance?: Record<string, TAssignmentProvenance>` — per `claimId`.
    - `claimPropagatedValues?: Record<string, TCoreTrivalentValue>` — per
      `claimId`, the propagated (`unknown → true`) value the chip renders.
    - `grade?: TCoreEvaluationGrade` — argument-level grade for the conclusion.

- `overlay.ts`
  - **New** exported builder `buildInlineReviewOverlay(...)`. The existing
    `buildReviewOverlay({ draft, result, argEngine })` serves the multi-step
    review **wizard** (pre-evaluated `TReviewResult`, operator decisions from the
    draft) and has an incompatible signature and purpose; overloading it would
    make it a mode-dependent Frankenstein. The inline flow gets its own focused
    builder that self-evaluates. Both return the shared `TReviewOverlay`.

### `buildInlineReviewOverlay` contract

Inputs (single params object):
- `argEngine: PropositArgumentEngine` — provides `deriveDefaultAssignment()`,
  `getVariableIdForClaim` / `getClaimIdForVariable`, `getClaims()`, `evaluate()`.
- `reactions: Record<string, TTrivalentValue>` — the caller's OWN reaction per
  `claimId`. **Key presence = reacted** (a present `null` is an "unsure"
  reaction, not "no reaction"). Callers omit the key for un-reacted claims.
- `overrides: Record<string, TAssignmentPill>` — in-review overrides per
  `claimId`. Key presence = overridden. May be `"skipped"`.

Per claim:
```
effective  = override ?? reaction→pill ?? default→pill
provenance = (override present || reaction present) ? "user" : "default"
```
- reaction → pill: `true → "true"`, `false → "false"`, `null → "unknown"`.
  Reactions never produce `"skipped"`.
- default → pill: `true → "true"`, `null → "unknown"` (defaults are never
  `false`, never `"skipped"`).

Evaluation: build the effective variable assignment (**strip axiom-bound keys —
`evaluate()` throws `AXIOM_VARIABLE_ASSIGNMENT_FORBIDDEN` on any axiom key; keep
citation keys**), feed to `argEngine.evaluate()` with **all operators accepted**
so transitive grounding (`unknown → true`) propagates, then
`gradeEvaluation(result).grade`. Carry `propagatedVariableValues` back to
`claimId` keys via `getVariableIdForClaim`.

Perf: hoist a single `claimId ↔ variableId` map from one pass over the engine's
variables; never call the O(N) `getVariableIdForClaim` per claim.

### One-way write invariant (consumer-enforced)

The merge is **read-only**. Assigning / overriding in review NEVER writes a
reaction, and reacting NEVER writes an override. Consumers must keep the two
stores independent — `buildInlineReviewOverlay` only reads them.

## Capabilities

`proposit-shared` is the canonical product-capability master. Declare the new
inline-review capabilities here as `Missing` (a runtime-agnostic library asserts
no support of its own; server + mobile flip their overrides to Supported).

## Tests

Precedence (override > reaction > default), provenance per source, trivalent
reaction mapping, lazy fallback (change reaction → effective moves; add override
→ pins; clear override → falls back to reaction).
