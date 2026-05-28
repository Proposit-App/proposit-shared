# `PropositArgumentEngine.fromServerData` must use relaxed grammar at load

**Date:** 2026-05-08
**Filed by:** server agent (proposit-server)
**Target version:** `@proposit/shared@0.6.3`

## Problem

`PropositArgumentEngine.fromServerData(snapshot, claims, claimCitations)` constructs the engine with a hardcoded `grammarConfig: { autoNormalize: false, enforceFormulaBetweenOperators: true }` and then calls `engine.rollback(snapshot)` to restore state. The rollback's `validate()` pass throws `EXPR_FORMULA_BETWEEN_OPERATORS_VIOLATED` on **wave-2 derivation premises** — which by design contain `IMPLIES → OR` direct nesting (the shape produced by `populateDerivationFromCitations` for `n ≥ 2` citations).

The result is that any argument that has ≥ 1 non-conclusion claim with ≥ 2 citations cannot be loaded by the server-rendered argument view: `buildCombinedProviderData` calls `fromServerData(...)` and gets a thrown `Failed to load argument <id>: invariant violation during rollback: Non-not operator "or" expression "<id>" is a direct child of operator "<id>"`.

This is the same dual-grammar discipline mistake the server already corrected in `src/model/propositional-persistence.ts` (`constructEngineFromData`): the load phase **must** be permissive about `enforceFormulaBetweenOperators`, while the runtime phase enforces it for new mutations. The DB is allowed to contain trees that pre-date the rule or that are written intentionally outside it (wave-2 derivations).

## Reproducer

Any argument with a derivation premise of shape `IMPLIES(OR(c1, c2, …), Q)` — i.e., any non-conclusion claim with `n ≥ 2` citations on it — fails to load through `fromServerData`. Server log:

```
Failed to load argument 78afb06e-570c-47a4-9f26-3afc9bde63fb: invariant violation during rollback: Non-not operator "or" expression "5664b242-…" is a direct child of operator "89f7662b-…".
    at PropositArgumentEngine.fromServerData (engine.js:278)
    at buildCombinedProviderData (server: build-combined-provider-data.ts:46)
```

DB row evidence (server-side, unchanged from the wave-2 migration backfill):

| premise type | role       | parent_op | this_op |
| ------------ | ---------- | --------- | ------- |
| derivation   | supporting | implies   | or      |

This is exactly the canonical `IMPLIES(OR(…), Q)` derivation-tree shape promised by `populateDerivationFromCitations`'s contract.

## Proposed fix

In `src/engine/engine.ts` (`PropositArgumentEngine.fromServerData`), construct the engine with **relaxed** `enforceFormulaBetweenOperators: false` for the rollback phase, then re-apply the strict runtime grammar to the engine and to each constructed `PremiseEngine` after the snapshot has been restored. Pattern (server already runs this same logic for `constructEngineFromData` against `ArgumentEngine.fromData`):

```ts
const RUNTIME_GRAMMAR: TGrammarConfig = {
    autoNormalize: false,
    enforceFormulaBetweenOperators: true,
}
const LOADING_GRAMMAR: TGrammarConfig = {
    ...RUNTIME_GRAMMAR,
    enforceFormulaBetweenOperators: false,
}

static fromServerData(snapshot, claims, claimCitations) {
    const claimLookup = createClaimLookup(claims)
    const engine = new PropositArgumentEngine(
        snapshot.argument,
        claimLookup,
        EMPTY_CLAIM_CITATION_LOOKUP,
        {
            checksumConfig: CHECKSUM_CONFIG,
            positionConfig: snapshot.config?.positionConfig,
            grammarConfig: LOADING_GRAMMAR,        // relaxed during rollback
            generateId: () => crypto.randomUUID(),
        }
    )

    // (existing snapshotWithVariableConfig + rollback try/catch)
    engine.rollback(snapshotWithVariableConfig)

    // Re-tighten so subsequent mutations (addExpression, wrapExpression, …)
    // respect the explicit-formula-between-operators discipline.
    for (const pe of engine.listPremises()) {
        pe.setGrammarConfig(RUNTIME_GRAMMAR)
    }
    // (existing claimsMap / claimCitationsMap population)
    return engine
}
```

If `ArgumentEngine` exposes a public `setGrammarConfig` for the engine itself, call that too. Otherwise the per-premise loop matches what the server already does post-load.

## Impact on consumers

- **proposit-server** — `src/app/(nofooter)/view/[argumentId]/[version]/build-combined-provider-data.ts` is the failing call site today. Bumping to `^0.6.3` unblocks all wave-2 argument views with multi-citation claims.
- **proposit-mobile** — uses `fromServerData` similarly; same fix path.

## Test cases

1. **Regression:** build a snapshot whose engine state contains a premise with `type='derivation'` and an expression tree `IMPLIES(OR(c1, c2), Q)`. `PropositArgumentEngine.fromServerData(snapshot, claims, [])` returns an engine without throwing; `engine.getProjectSnapshot()` round-trips the same shape.
2. **Runtime grammar still enforced:** after `fromServerData` returns, attempting a runtime mutation that would create a non-formula-between-operators tree on a freeform premise (e.g. `engine.addExpression(...)` producing `AND` direct child of `IMPLIES`) is auto-corrected (`wrapInsertFormula`) or rejected, matching pre-fix runtime behavior.
3. **Pre-wave-2 valid trees:** a snapshot with `IMPLIES(formula(AND(p, q)), r)` still loads identically — the relaxed loading grammar doesn't change anything for already-grammar-compliant data.

## Related

- `proposit-shared/docs/change-requests/2026-05-07-derivation-premise-mutations.md` — original CR that introduced `populateDerivationFromCitations` (shared 0.6.0); this is its load-side counterpart.
- `proposit-server/src/model/propositional-persistence.ts:443-454` — server-side dual-grammar split for the same discipline. (Server fix landed in `proposit-server` PR #22 commit `0de3b7da`.)
