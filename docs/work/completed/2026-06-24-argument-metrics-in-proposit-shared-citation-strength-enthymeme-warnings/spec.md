# Spec — Argument metrics in @proposit/shared: citation strength & enthymeme warnings

## Capability changes

No capability delta in this repo. This is compute-only library work: two new
pure functions operating on the engine's `TProjectReactiveSnapshot`, invisible
to end users until a consumer wires them into a UI. `proposit-shared` has no
`capabilities.md` of its own (it isn't a UI surface). If/when `proposit-server`
(or `proposit-mobile`) surfaces citation strength or enthymeme warnings in a
view, that consumer-side work authors its own capability delta and reconciles
the relevant route's `capabilities.md` — tracked as a separate follow-up, not
part of this item.

## Problem

The engine can already answer "does this one claim have a citation?" (the
"Needs Support" badge logic, currently implemented only inside
`proposit-server`) but there is no argument-level rollup, and no structural
check for a specific reasoning smell: a premise that states `P ⇒ Q` when the
inference actually depends on more than `P` alone (a suppressed premise /
enthymeme). Per the initial request, this computation belongs in
`@proposit/shared` — both consumers should be able to derive the same numbers
from the same engine snapshot without re-deriving the logic, and whether/how
either consumer displays it is a separate decision.

## Goals

- A pure function that computes an argument-wide **citation strength** ratio:
  coverage of source citations across the claims whose support obligation
  falls to a citation (i.e., claims not already discharged by being a
  premise's consequent or by invoking an axiom).
- A pure function that flags **enthymeme warnings**: freeform premises shaped
  `P ⇒ Q` where `P` is a single antecedent claim rather than an explicit
  conjunction of ≥2 (e.g. `(P ∧ R) ⇒ Q`) — a purely structural check, no LLM
  involved in this slice.
- Both operate on the existing `TProjectReactiveSnapshot` (no new persisted
  state, no schema/wire changes, no `proposit-core` changes).
- Safe for any snapshot, including a maximally sparse one (no claims, no
  premises) — no throwing on missing pieces.

## Non-goals

- No LLM-based / semantic enthymeme detection. The initial request explicitly
  defers this ("likely later extension"); this slice is the structural check
  only.
- No REST endpoint, no TypeBox wire schema, no API-client method for exposing
  these metrics. That's a `proposit-server` decision if/when it wants to
  surface them, and belongs to that repo's own work item.
- No UI (badge, meter, warning icon) in either consumer. Out of scope by the
  initial request itself ("may or may not be displayed in the UI").
- No migration of `proposit-server`'s existing local "Needs Support" logic
  (`src/app/view/[argumentId]/[version]/contexts/text-derivations.ts`) onto
  the new shared functions. That duplication is real (see Risks below) but
  touching a consumer repo is out of scope for a shared-only planning pass.
- `iff` premises are not covered by the enthymeme check — the initial request's
  example is specifically `implies`. Treated as an open question below, not
  silently folded in.

## Current-state findings

- `TProjectReactiveSnapshot` (`src/engine/engine.ts:62-`) exposes
  `claims: Record<string, TClaim>`, `citations: Record<string, TClaimCitation[]>`
  (keyed by the **supported** claim's id — `TClaimCitation.claimId` per
  `CoreClaimConnectionSchema` in `proposit-core`), `premises` (each with
  `.premise`, `.expressions`, `.rootExpressionId`), and `variables`.
- The "Needs Support" concept **already exists but only in `proposit-server`**,
  not in shared:
  - `getClaimProofState(claimId, snapshot)` and `consequentClaimIds(snapshot)`
    in `proposit-server/src/app/view/[argumentId]/[version]/contexts/text-derivations.ts`.
  - Three-state posture: `"citation-backed"` (has a citation edge),
    `"axiom-backed"` (no citation, but the claim's own derivation premise's
    antecedent resolves to an `axiomatic`-typed claim), or `"empty"` (neither —
    covers conclusions, bare naked-Q claims, and claims with no derivation
    premise at all).
  - `atv-items.tsx` derives the visible badge as
    `needsSupport = proofState === "empty" && !consequents.has(claimId)` — a
    claim that is the consequent of some other freeform premise's `implies`/
    `iff` is treated as structurally supported by the surrounding inference,
    even with no citation of its own.
  - `consequentClaimIds` only scans **freeform** premises (`premise.type ===
    "freeform"`); derivation premises are deliberately excluded, since those
    are engine-managed single-antecedent citation/axiom wiring, not
    user-authored reasoning steps.
- Antecedent/consequent convention for `implies`/`iff` (also used by
  `src/engine/text-tree.ts` and `src/engine/premise-reading-order.ts`):
  arity-2 operator, children sorted by ascending `position`; the
  **highest-position child is the consequent**, the remaining (lowest-
  position, i.e. the only other one, since arity is 2) is the antecedent.
  Position is a sparse fractional index, not literally `0`/`1`.
- `src/engine/premise-reading-order.ts` already walks each freeform premise's
  antecedent/consequent split to build a proof DAG — a close structural
  neighbor, but its leaf-collecting helpers are private to that module and
  tuned for a different purpose (signature-keyed proof edges, not "how many
  distinct antecedent conjuncts does this premise assert").
- `ClaimSchema` is a union of `NormalClaim | CitationClaim | AxiomaticClaim`
  (`src/schemas/model/claims.ts`). Only `NormalClaim`s make sense in the
  citation-strength denominator: `AxiomaticClaim`s are self-justifying by
  definition (their `axiom` field carries the justification, no citation
  applies), and `CitationClaim`s are themselves the evidence, not something
  that itself needs evidence (`ClaimWithChildrenSchema`'s own comment already
  treats citation claims as evidence-only leaves).
- No existing `consequent`/`proofState`-flavored helper anywhere in
  `proposit-shared/src` today (confirmed by grep) — this is new surface, not a
  rename of something already exported.
- **`proposit-core`'s AN-1 auto-normalization rule** (`docs/Proposit_Grammar.md`
  §4.2) inserts a `formula` buffer any time a non-`not` operator becomes the
  direct child of another operator, and this runs on every mutation (not
  opt-in). Concretely: a freeform premise authored as `(P and R) implies Q`
  is **not** stored as `implies(and(P,R), Q)` — the `and` is a direct child of
  `implies`, so AN-1 wraps it: `implies(formula(and(P,R)), Q)`. The same
  applies to an `or`-antecedent. A **bare** antecedent (`P implies Q`, or
  `not(P) implies Q`) is unaffected — `not` is exempt from AN-1, and a bare
  `variable` is never an operator, so nothing needs a buffer. This directly
  shapes the enthymeme antecedent check below: testing the antecedent
  expression's `.type` for `"operator"`/`"and"` without first unwrapping one
  `formula` layer would never match real, engine-normalized data, and would
  wrongly flag every compound-antecedent premise. (This differs from a naive
  "check the node type" implementation; existing precedent for the unwrap —
  `unwrapFormulaLayer` in `proposit-server`'s `text-derivations.ts`,
  `consequentClaimIds`' own inline formula-unwrap at the consequent slot, and
  `premise-reading-order.ts`'s `collectLeaves` recursing transparently through
  `formula` nodes — all already do this for their own slots.)
- `getClaimProofState`'s `"empty"` state is not itself a gap to close: a
  claim can have a **derivation premise** (the engine-managed citation/axiom
  wiring premise) that is neither citation- nor axiom-backed yet — the
  "naked-Q form" (bare `Q`, no antecedent at all) before
  `populateFromCitations`/`populateFromAxioms` has been called, or a
  defensively-malformed antecedent. Both correctly report `"empty"`: the
  claim genuinely has no discharged support yet. Citation-backing is decided
  purely by `snapshot.citations[claimId]` (independent of the derivation
  premise's shape), so a claim actually wired to a citation is caught by that
  check regardless of its derivation premise's expression tree.
- `package.json`'s `exports` map already has an `"./engine/*"` wildcard
  entry — a new `src/engine/argument-metrics.ts` file needs **no exports-map
  edit** to become importable as `@proposit/shared/engine/argument-metrics`.
- No consumer (`proposit-server` API/UI, `proposit-mobile`) references
  "citation strength" or "enthymeme" anywhere in the workspace today (grep
  confirmed) — this is a green-field name, not a rename or extension of an
  existing wire concept.

## Proposed behavior

New module `src/engine/argument-metrics.ts`, mirroring the plain-TS-type style
of `src/engine/premise-reading-order.ts` / `src/engine/text-tree.ts` (no
TypeBox — this is derived/transient data, not a persisted or wire shape).

**Shared building blocks** (exported — see "why exported" in Risks below):

```ts
export type TClaimProofState = "empty" | "axiom-backed" | "citation-backed"

export function getClaimProofState(
    claimId: string,
    snapshot: TProjectReactiveSnapshot
): TClaimProofState

export function consequentClaimIds(
    snapshot: TProjectReactiveSnapshot
): Set<string>
```

Same algorithm as `proposit-server`'s existing private versions (three-state
short-circuit citation → derivation-premise-antecedent-is-axiomatic → empty;
freeform-only consequent scan). Deliberately reusing the same names: if a
future consumer-side item migrates `proposit-server`'s local copies onto these,
the rename is mechanical (delete-and-import), not a re-derivation.

**Citation strength:**

```ts
export interface TCitationStrengthMetric {
    eligibleClaimCount: number
    citedClaimCount: number
    /** 0..1. 1 when eligibleClaimCount === 0 (vacuously fully supported). */
    strength: number
}

export function computeCitationStrength(
    snapshot: TProjectReactiveSnapshot
): TCitationStrengthMetric
```

Algorithm:

1. `consequents = consequentClaimIds(snapshot)`.
2. `eligible` = every `NormalClaim` in `snapshot.claims` where
   `!consequents.has(claim.id)` AND
   `getClaimProofState(claim.id, snapshot) !== "axiom-backed"`.
   (Excludes: axiomatic/citation-typed claims outright; any claim already
   discharged by being a premise's consequent; any claim discharged by
   invoking an axiom.)
3. `cited` = the subset of `eligible` where
   `getClaimProofState(claim.id, snapshot) === "citation-backed"`.
4. `strength = eligible.length === 0 ? 1 : cited.length / eligible.length`.

This is the coverage reading of the initial request's wording: "the claims
that need support" is the pool whose support obligation can *only* be
discharged by a citation (not by structural position or an axiom), and
"coverage" is how many of that pool actually carry one. See the Open
questions section — the literal alternate reading (coverage over only the
claims *currently* flagged "Needs Support") is degenerate (always 0%, since a
flagged claim by definition has no citation) and is rejected.

**Enthymeme warnings:**

```ts
export interface TEnthymemeWarning {
    premiseId: string
    /** Distinct antecedent conjuncts found; < 2 is why this premise is flagged. */
    antecedentConjunctCount: number
}

export function detectEnthymemeWarnings(
    snapshot: TProjectReactiveSnapshot
): TEnthymemeWarning[]
```

Algorithm, per premise in `snapshot.premises`:

1. Skip non-`"freeform"` premises (derivation premises are engine-managed
   single-antecedent wiring, not user-authored inference steps — same
   exclusion `consequentClaimIds` already applies).
2. Skip if the root expression isn't an `implies` operator (bare assertions,
   `iff`, `and`/`or`-rooted premises, empty premises all skip).
3. Antecedent = the lower-position of the root's two children (may be
   missing, for a mid-edit premise with only a consequent filled in).
4. **Unwrap one `formula` layer** at the antecedent slot if present (per
   AN-1, a compound antecedent is stored as `formula(and(...))` /
   `formula(or(...))`, never bare — see Current-state findings). Then:
   `antecedentConjunctCount` = direct-child count of the (possibly-unwrapped)
   expression if it's an `and` operator; otherwise `1` if the antecedent slot
   is present (bare variable, `not(variable)`, an `or(...)` operator after
   unwrapping, or a malformed/empty formula — anything that isn't an explicit
   conjunction counts as a single antecedent block); `0` if the antecedent
   slot is missing entirely.
5. Push a warning when `antecedentConjunctCount < 2`.

`or`-rooted antecedents are deliberately **not** treated as satisfying "at
least two antecedents" — see Open questions.

**Rollup:**

```ts
export interface TArgumentMetrics {
    citationStrength: TCitationStrengthMetric
    enthymemeWarnings: TEnthymemeWarning[]
}

export function computeArgumentMetrics(
    snapshot: TProjectReactiveSnapshot
): TArgumentMetrics
```

Thin convenience wrapper calling both; each metric also remains independently
callable/importable.

## Open questions (decisions made here, flagged for confirmation before implementation)

1. **Citation-strength denominator.** Decided: "claims that need support" =
   the structural pool whose support can only come from a citation (not
   literally "claims currently missing one"), per the Proposed behavior
   section's rationale. If this doesn't match the intended product meaning,
   it needs correcting before Phase 2 of the plan.
2. **`or`-antecedents in the enthymeme check.** Decided: not exempted — only
   an explicit `and` with ≥2 children counts as "at least two antecedents",
   matching the initial request's own example (`(P and R) implies Q`). An
   `or`-antecedent is a different (already fully explicit) logical shape, not
   a hidden-premise smell, but it also isn't the ≥2-conjunct shape the request
   asked to exempt — flagging it is the conservative choice. Note this
   decision applies **after** the formula-unwrap step (AN-1 wraps `or` the
   same as `and`), not by treating an unwrapped node differently.
3. **`iff` premises.** Decided: out of scope for this slice (non-goal). Note
   for a future extension if wanted.
4. **In-progress/mid-edit premises** (missing antecedent entirely) register as
   `antecedentConjunctCount: 0`, i.e. also flagged. Whether a UI should
   suppress warnings for premises still being actively edited is a
   consumer/UI-layer concern, not addressed here.

## Acceptance criteria

1. `computeCitationStrength` on a snapshot with zero claims →
   `{ eligibleClaimCount: 0, citedClaimCount: 0, strength: 1 }`.
2. A normal claim that is the consequent of some freeform premise's
   `implies`/`iff` → excluded from `eligibleClaimCount` regardless of citation
   state.
3. A normal claim proven via an axiom-bound derivation premise (no citation)
   → excluded from `eligibleClaimCount`.
4. A normal claim with a citation edge, not a consequent → counted in both
   `eligibleClaimCount` and `citedClaimCount`.
5. A normal claim with no citation, not a consequent, not axiom-backed →
   counted in `eligibleClaimCount` only → lowers `strength`.
6. Axiomatic and citation-typed claims never appear in `eligibleClaimCount`.
7. A claim that is **both** a freeform-premise consequent **and** carries its
   own citation edge → still excluded from `eligibleClaimCount` entirely
   (consequent-exclusion takes precedence; it is not counted in the numerator
   either). Confirms the two exclusions in step 2 are independent, unordered
   filters, not a fallback chain.
8. A snapshot whose only claims are axiomatic/citation-typed (no normal
   claims at all) → `eligibleClaimCount: 0` via the type filter (not merely
   via an empty-snapshot short-circuit) → `strength: 1`.
9. `detectEnthymemeWarnings`: `(P and R) implies Q` → stored as
   `implies(formula(and(P,R)), Q)` per AN-1 → no warning for that premise
   (the formula-unwrap step must fire for this to pass).
10. `detectEnthymemeWarnings`: `P implies Q` (bare antecedent) → warning with
    `antecedentConjunctCount: 1`.
11. `detectEnthymemeWarnings`: `not(P) implies Q` (negated single antecedent,
    stored bare — `not` is AN-1-exempt) → warning with
    `antecedentConjunctCount: 1`.
12. `detectEnthymemeWarnings`: `(P or R) implies Q` (stored as
    `implies(formula(or(P,R)), Q)`) → warning (per decided Open question 2 —
    unwrapping must still occur, but `or` does not exempt).
13. `detectEnthymemeWarnings`: derivation premises never appear in the
    output, regardless of shape.
14. `detectEnthymemeWarnings`: non-`implies` roots (bare assertion, `and`/`or`
    root, empty premise) never appear in the output.
15. `computeArgumentMetrics` returns both sub-results consistently with the
    standalone functions on the same snapshot.
16. `pnpm run check` green (typecheck, lint, tests, build).

## Risks / dependencies

- **Duplication with `proposit-server`.** `proposit-server`'s
  `text-derivations.ts` already has private `getClaimProofState` /
  `consequentClaimIds`. This item intentionally re-implements the same
  algorithm in shared (server can't be imported from shared — wrong
  dependency direction), using the same names so a later, separate
  server-side work item can delete the local copies and import from
  `@proposit/shared/engine/argument-metrics` instead, collapsing the
  duplication. That migration is **not** part of this item; flagging it as a
  suggested follow-up (`tcw work` item in `proposit-server`) is a closeout
  decision for whoever completes this item, not decided now.
- **No `proposit-core` changes required.** Everything is derivable from
  existing `TProjectReactiveSnapshot` / `TClaim` / `TPropositionalExpressionCombined`
  shapes already re-exported through shared. No peer-dependency range bump.
- **Purely additive to the public surface.** New module, new exported types
  and functions; nothing existing changes shape. No breaking change; safe for
  a minor version bump (new feature, per this repo's semver policy) rather
  than a major.
- **Consumer impact:** none required. `proposit-server` and `proposit-mobile`
  keep building unmodified against any shared version that includes this
  change. They gain new importable symbols only if/when they choose to wire
  up a UI — a separate, later work item in the consuming repo.
