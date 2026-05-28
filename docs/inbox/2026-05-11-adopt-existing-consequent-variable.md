# `mutateCreateDerivationPremise` cannot adopt an existing claim-bound variable

**Affected version:** `@proposit/shared@0.6.x` (and forward — the constraint is structural).

**Reported by:** Server agent (Task 1 of the 2026-05-11 ATV bug-fix batch, branch `feat/atv-overhaul`).

## Symptom

`mutateCreateDerivationPremise(engine, ...)` always emits a brand-new claim-bound consequent variable for the derived claim. Its symbol is taken from the engine's auto-allocator (the `symbol` of the auto-created variable inside `engine.createPremiseWithId({ type: "derivation", derivedClaimId })` — see `mutations/premises.ts:179-189`).

The engine's auto-allocator does not check whether a claim-bound variable for the same claim already exists. Persisting the resulting changeset therefore violates the DB-level unique constraint `(symbol, argumentId, argumentVersion)` whenever a free claim-bound variable for that claim already lives in the argument:

```
insert into "propositionalVariables" ... duplicate key value violates unique constraint
  "propositional_variables_symbol_argument_id_argument_version_uni"
detail: 'Key (symbol, "argumentId", "argumentVersion")=(Honor_Agreements, <argId>, 0) already exists.'
```

The shared mutation has no path to adopt the existing claim-bound variable as the consequent. The only callers today (`addClaim`, and the server's heal-on-write in `addClaimCitation`) work around this by ensuring the claim is brand-new, but that workaround does not generalize.

## Why this matters now

The wave-2 ATV invariant says every `type='normal'` non-conclusion claim has exactly one derivation premise whose consequent is the canonical claim-bound variable. Two real-world flows produce a claim whose derivation premise is missing but whose canonical claim-bound variable still exists:

1. **Legacy / fork-from-older-arg.** Pre-wave-2 claims have a claim-bound free variable but no derivation premise. The wave-2 migration did not backfill every argument. When the server's `addClaimCitation` heal-on-write path mints a derivation premise for such a claim, the constraint fires.
2. **Future deletion paths.** Any future operation that deletes a derivation premise while preserving the claim-bound variable in user premises (e.g., a "demote derivation" workflow, or recovery from corrupt state) will leave the same gap. The shared mutation should support the symmetric "adopt the existing variable as consequent" build.

## Reproducer

```ts
import { ArgumentEngine } from "@proposit/proposit-core"
import {
    mutateCreateVariable,
    mutateCreateDerivationPremise,
} from "@proposit/shared/engine/mutations"

// 1. Build an engine with a claim-bound free variable for claim `q-claim`
//    that has no derivation premise.
const engine = makeMinimalEngine()
mutateCreateVariable(engine, "free-var-q", {
    argumentId: "arg-1",
    argumentVersion: 0,
    claimId: "q-claim",
    claimVersion: 0,
    symbol: "Q",
    creatorId: "user-1",
    createdOn: new Date(),
})
// (No derivation premise minted yet — mimics a legacy claim.)

// 2. Try to heal-on-write by minting the derivation premise:
mutateCreateDerivationPremise(engine, "p-deriv", {
    argumentId: "arg-1",
    argumentVersion: 0,
    creatorId: "user-1",
    createdOn: new Date(),
    derivedClaimId: "q-claim",
    consequentVariableId: "consequent-var-id",
    consequentExpressionId: "consequent-expr-id",
})
// In-memory the engine accepts it. The resulting changeset includes a SECOND
// claim-bound variable with the SAME symbol "Q" and a different id. Persisting
// hits the DB unique constraint.
```

## Proposed fix

Add an optional `existingConsequentVariableId` parameter to `mutateCreateDerivationPremise`. When set, the mutation must:

1. Verify the named variable is in the engine, is claim-bound, and is bound to `derivedClaimId`. Throw a clear error otherwise.
2. Skip the auto-variable creation entirely — do not call `engine.addVariable(...)` for a fresh consequent.
3. Build the naked-Q consequent expression that references `existingConsequentVariableId`.
4. Strip the engine-auto consequent variable from the merged changeset (the auto-create + remove-auto pair must still leave a clean changeset; if `createPremiseWithId` no longer auto-creates a claim-bound variable when an existing one is in scope, that's the cleanest path; otherwise the existing "remove auto-var" pattern continues to work).
5. The merged changeset's `variables.added` MUST NOT contain a new claim-bound variable for `derivedClaimId`. `variables.modified` MAY contain the existing one if the engine touches its checksum during expression-tree wiring.

Updated signature sketch:

```ts
export function mutateCreateDerivationPremise(
    engine: ProjectEngine,
    premiseId: string,
    data: {
        argumentId: string
        argumentVersion: number
        creatorId: string
        createdOn: Date
        derivedClaimId: string
        // EITHER (existing semantics — mint a fresh consequent variable):
        consequentVariableId?: string
        consequentExpressionId: string
        // OR (new — adopt an existing claim-bound variable as the consequent):
        existingConsequentVariableId?: string
    }
): {
    premise: TPropositionalPremise
    consequentVariable: TPropositionalVariable
    consequentExpression: TPropositionalExpressionCombined
    changes: ProjectChangeset
}
```

Validation:

- `consequentVariableId` and `existingConsequentVariableId` are mutually exclusive — exactly one must be supplied.
- If `existingConsequentVariableId` is given, validate it exists in the engine, is claim-bound, and `claimId === data.derivedClaimId`. Otherwise throw a typed/named error.

An alternative shape — a separate `mutateAdoptDerivationPremise` function — is also acceptable; the underlying engine work is the same. Whichever keeps the call sites cleanest.

## Impact on `@proposit/proposit-server`

Today the server's `addClaimCitation` heal-on-write path calls `mutateCreateDerivationPremise` unconditionally. To consume the new API, the server:

1. Inspects the engine snapshot for an existing claim-bound variable with `claimId === citingClaimId`.
2. If found, calls the new variant with `existingConsequentVariableId: existingVar.id` (omitting `consequentVariableId`).
3. Otherwise calls the existing variant (no change from current code).

Until this lands, the server detects the collision case before calling the mutation and surfaces a typed `ClaimNeedsDerivationRepairError` → HTTP 422 instead of letting the DB constraint violation bubble up as a 500. This keeps users from hitting unrecoverable crashes but blocks them from adding citations to affected claims until the upstream fix ships.

## Test cases

1. **Adopt path — happy:** Engine with a claim-bound free variable for claim X (no derivation premise). Call mutation with `existingConsequentVariableId` pointing at that variable. Expect: the changeset contains the new derivation premise + a consequent expression referencing the existing variable. `variables.added` for that claim id is empty. The engine snapshot post-mutation has exactly one claim-bound variable for claim X.
2. **Adopt path — validation:** Passing both `consequentVariableId` and `existingConsequentVariableId` throws a clear error. Passing neither throws. Passing an existing-id that doesn't reference a claim-bound variable for `derivedClaimId` throws.
3. **Mint path — existing behavior preserved:** Old call sites that pass `consequentVariableId` (and omit `existingConsequentVariableId`) continue to work identically — same changeset shape as today's tests assert.
4. **Round-trip across load boundary:** After mutating an adopted-consequent derivation, `engine.toSnapshot()` → `ArgumentEngine.fromSnapshot()` → `clearDerivationAntecedent` + `populateDerivationFromCitations` cycle works. (Mirrors the load-boundary concern in the 2026-05-08 change request — adopt path should not regress that fix.)

## Suggested rollout

- Land in `@proposit/shared@0.7.0` (minor — additive API).
- Server bumps to `^0.7.0`, replaces the 422 stopgap with the adopt-path branch, drops `ClaimNeedsDerivationRepairError`, and adds a model test that exercises the heal-on-write happy path for a legacy claim.
