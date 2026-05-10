# `@proposit/shared` — drop `PERMISSIVE_GRAMMAR_CONFIG` bypass in derivation mutations

**Date:** 2026-05-09
**Status:** Required for `proposit-server` to retire its `LOAD_GRAMMAR` / `DERIVATION_GRAMMAR` carve-outs and the seed's pre-publish `repairArgument(GRAMMAR_DENORMALIZED)` workaround.
**Source:** Diagnostic on `proposit-server` `feat/atv-overhaul`; see thread `msg-922934 → msg-8604d4 → msg-56e2a0 → msg-0efc27 → msg-7964a7 → msg-2e3901 → msg-de32ee` in the broker history.
**Target version:** `@proposit/shared@0.7.0` (minor — payload-shape change for any consumer reading derivation antecedent shape directly; per-the maintainer's pre-1.0 versioning policy).

## Summary

`shared.populateDerivationFromCitations` and `shared.clearDerivationAntecedent` (in `src/engine/mutations/premises.ts`) currently wrap their construction logic in `withGrammarConfig(pm, PERMISSIVE_GRAMMAR_CONFIG, …)` — a save/restore that temporarily swaps the per-premise grammar to `{ enforceFormulaBetweenOperators: false, autoNormalize: false }` so the engine accepts `IMPLIES → OR` without a formula buffer between them. That choice was made in the 2026-05-07 wave-2 CR (`2026-05-07-derivation-premise-mutations.md`) to mirror the shape produced by `proposit-core`'s `ManagedDerivationPremiseEngine.populateFromCitations`.

That bypass is the root cause of a strict-vs-auto-normalize checksum divergence on cited arguments in `proposit-server`: when an argument is loaded for `publish()`, `checkNormalizationNeeded` constructs both a strict engine and an auto-normalize engine; auto-normalize inserts the formula buffer per its `wrapInsertFormula` rule, strict keeps the unwrapped shape, and the resulting checksum mismatch falsely reports drift and refuses publish.

**The fix is mechanical:** drop the `PERMISSIVE_GRAMMAR_CONFIG` wrappers in `populateDerivationFromCitations` and `clearDerivationAntecedent` and let standard grammar — the same grammar the rest of shared's mutations already use — drive construction. With `enforceFormulaBetweenOperators: true` and `autoNormalize.wrapInsertFormula: true` (the defaults under standard grammar), the engine itself inserts the formula buffer between IMPLIES and OR, producing `IMPLIES(formula(OR(c1, …, cn)), Q)` for n≥2. The server then loads identical shapes through both strict and auto-normalize paths, no checksum drift, no repair required.

## What needs to ship

### 1. `populateDerivationFromCitations` — drop `withGrammarConfig` wrapper

**File:** `src/engine/mutations/premises.ts`

Today (paraphrased):

```ts
withGrammarConfig(pm, PERMISSIVE_GRAMMAR_CONFIG, () => {
    // construct IMPLIES → OR → citation_var_k under PermissiveGrammar so
    // the engine accepts the no-formula-between-operators shape
    addImpliesAtRoot(...)
    addOrUnderImplies(...)
    for (const sourceClaimId of sourceClaimIds) {
        addCitationVarUnderOr(sourceClaimId, ...)
    }
})
```

After:

```ts
// No grammar override. Standard grammar's wrapInsertFormula rule inserts
// the formula buffer between IMPLIES and OR automatically. Resulting
// shape: IMPLIES(formula(OR(c1, …, cn)), Q) for n>=2.
addImpliesAtRoot(...)
addOrUnderImplies(...)  // engine inserts formula(...) between IMPLIES and OR
for (const sourceClaimId of sourceClaimIds) {
    addCitationVarUnderOr(sourceClaimId, ...)
}
```

n=0 and n=1 cases stay unchanged (no operator-under-operator nesting → no formula needed).

### 2. `clearDerivationAntecedent` — drop `withGrammarConfig` wrapper

**File:** `src/engine/mutations/premises.ts`

Same pattern as above. The `clearDerivationAntecedent` mutation must also handle the `formula` node when walking the antecedent for removal:

- The current dispatch on `antecedent.type ∈ {variable, operator/or}` (per the broker discussion) needs a `formula` case.
- Cascade-remove handles `formula → OR → citation_var` children in one shot via the existing engine `removeExpression(_, deleteSubtree=true)` path.
- Citation-variable id collection walks `formula → OR → children` to gather the variable ids that need removal from `propositionalVariables`.

### 3. `mutateCreateDerivationPremise` — unchanged

The naked-Q form (`Q` alone) has no operator-under-operator nesting, so no formula buffer is needed and no behavior change is required. n=0 stays as it was.

### 4. Tests in `src/engine/mutations/__tests__/derivation-premises.test.ts`

The shared agent already enumerated the test updates in their reply (`msg-8604d4`):

1. **`populateDerivationFromCitations > with two sources produces IMPLIES(...)`** — antecedent assertions: `rootChildren[0].type` is now `'formula'` (not `'operator'`/`'or'`); add a step that descends into the formula's child to find the OR before walking `orChildren`. `operatorAdds` filtered for `e.type === 'operator'` still yields `['implies', 'or']` (formula has its own type); add a separate assertion that `formulaAdds = added.filter(e => e.type === 'formula')` has length 1.
2. **`clearDerivationAntecedent > on a populated premise removes IMPLIES/OR/citation_vars and re-roots Q`** — the comment `IMPLIES + OR + 2 citation_vars = 4` becomes `IMPLIES + formula + OR + 2 citation_vars = 5`. Tighten the assertion to exact count.
3. **`fromServerData with wave-2 derivation premises > round-trips the IMPLIES(OR(c1, c2), Q) shape`** — same antecedent walk: descend through formula. Title becomes `round-trips the IMPLIES(formula(OR(c1, c2)), Q) shape`.
4. **`fromServerData with wave-2 derivation premises > loads a snapshot containing IMPLIES(OR(c1, c2), Q) without throwing`** — degenerates to a smoke test (the new shape is strict-grammar-compliant). Keep, rename, and add a NEW negative-control test that loads a hand-built unwrapped snapshot to lock in the back-compat path through `fromServerData`'s `LOADING_GRAMMAR`.
5. **`after reload, clear → populate cycle works`** — should pass unchanged once `clearDerivationAntecedent` handles the formula-wrapped antecedent.
6. **NEW** — snapshot-then-fromSnapshot round-trip on the new shape under STRICT grammar (no LOADING_GRAMMAR relaxation). Regression test that locks the fixed-point claim explicitly: strict-load and auto-normalize-load of an `IMPLIES(formula(OR(...)), Q)` snapshot produce identical `combinedChecksum()`.

### 5. `LOADING_GRAMMAR` shim — keep

Per the broker exchange: `shared`'s `LOADING_GRAMMAR` (the `enforceFormulaBetweenOperators: false` relaxation in `fromServerData`'s rollback path, `engine.ts:35-38`) **stays** in 0.7.0 as a back-compat shim for any unmigrated A-shape rows in production DBs. Drop in a future release once the migration has converged. This is different from `proposit-server`'s own `LOAD_GRAMMAR` and `DERIVATION_GRAMMAR` overrides — those go away entirely once `proposit-server` bumps to `^0.7.0` and runs its one-shot migration.

## Why this is shared's issue, not core's

`proposit-server`'s call path is `server.addClaimCitation` → `shared.populateDerivationFromCitations` → primitives in `proposit-core`. The construction happens inside `shared`; `proposit-core`'s `ManagedDerivationPremiseEngine.populateFromCitations` is a _parallel_ implementation that shared currently mirrors for shape consistency, but server doesn't go through it. Fixing `shared` is sufficient to fix every server-side consumer (`proposit-server`, `proposit-mobile`).

Core has the same `PERMISSIVE_GRAMMAR_CONFIG` bypass in their parallel implementation (`ManagedDerivationPremiseEngine.populateFromCitations`). Whether core also fixes theirs is independent — it's a question about consistency between core and shared at the library level, not about correctness for any current consumer of either. There is a separate change request for core (`proposit-server/docs/change-requests/proposit-core/2026-05-09-derivation-formula-buffer.md`) tracking that fix; it can ship on core's own timeline without blocking this CR.

## Server-side adoption (for context)

Once `@proposit/shared@0.7.0` ships, `proposit-server` will land in a single PR:

1. Bump `@proposit/shared` to `^0.7.0`.
2. Drop the `enforceFormulaBetweenOperators: false` relaxation in `LOAD_GRAMMAR` (`src/model/propositional-persistence.ts:413-425`).
3. Drop the `DERIVATION_GRAMMAR` per-premise override loop (`propositional-persistence.ts:483-498`).
4. Run a one-shot migration script that iterates every `(argumentId, argumentVersion)` joined to `claimCitations` and calls `repairArgument(GRAMMAR_DENORMALIZED)` as the argument's creator. The repair canonicalizes existing A-shape rows into B-shape via the `persistNormalizedState` path. This script is NOT throwaway — it is the canonicalizer.
5. Drop the seed's pre-publish `repairArgument` call (no longer needed once shared produces B from the start).
6. Keep the `persistNormalizedState` `creatorId`/`createdOn` fix (orthogonal — fixes a NULL constraint crash in the user-facing Argument Health → Normalize flow).

## Out of scope

- **Core's parallel fix.** Tracked separately at `proposit-server/docs/change-requests/proposit-core/2026-05-09-derivation-formula-buffer.md`. Independent of this CR.
- **`LOADING_GRAMMAR` removal in shared.** Stays as the back-compat shim in 0.7.0; revisit dropping after migration converges.
- **`mutateCreateDerivationPremise` changes.** Naked-Q has no nested operators — no behavior change needed.

## Release checklist (for the shared maintainer)

1. Drop `withGrammarConfig(pm, PERMISSIVE_GRAMMAR_CONFIG, …)` wrappers in `populateDerivationFromCitations` and `clearDerivationAntecedent`.
2. Add the `formula` case to `clearDerivationAntecedent`'s antecedent walk.
3. Update the four existing tests in `derivation-premises.test.ts` per the list above; add the new round-trip-fixed-point test.
4. Bump `package.json` to `0.7.0`.
5. Rename `docs/release-notes/upcoming.md` → `v0.7.0.md` and `docs/changelogs/upcoming.md` → `v0.7.0.md`; start fresh `upcoming.md` files.
6. `pnpm publish --access public` and tag `v0.7.0`.
7. Notify `proposit-server` via broker (`READY: shared 0.7.0 published`) so it can bump and run the migration in a single PR.
