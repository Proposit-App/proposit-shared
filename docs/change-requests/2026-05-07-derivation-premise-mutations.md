# `@proposit/shared` — derivation-premise mutation surface + buildTextTree filter

**Date:** 2026-05-07
**Status:** Required for `proposit-server` wave 2 (ATV pivot)
**Source:** `proposit-server/docs/superpowers/specs/2026-05-07-atv-pivot-wave-2-design.md` (and the matching plan at `…/plans/2026-05-07-atv-pivot-wave-2-plan.md`)
**Target version:** `@proposit/shared@0.6.0` (minor — adds new public mutations) **or** `@proposit/shared@0.5.2` (patch — if the new mutations are considered additive enough not to warrant a minor; shared maintainer's call)

## Summary

Wave 2 of the proposit-core 0.11.0 source-as-claim migration on the server side activates **derivation premises** — one row in `propositionalPremises` per `type='normal'` claim, with `type='derivation'` and an expression tree that is either the naked consequent variable (no citations) or `IMPLIES(OR(citation_var_1, …, citation_var_n), claim_var)`. The server's write-path hooks (`addClaim`, `addClaimCitation`, citation-removal endpoint) and migration backfill all need to produce these trees through the engine-driven persistence rule (`persistChangeset` is the single write surface for premise/expression rows). That requires three new mutations in `@proposit/shared/engine/mutations/premises.ts` plus a small additive change to `@proposit/shared/engine/text-tree.ts`.

The underlying engine support is already in `@proposit/proposit-core@0.11.x` via `ManagedDerivationPremiseEngine` and its `populateFromCitations(citationLib, argumentEngine)` method. This change request asks shared to expose changeset-shaped wrappers that the server can compose with the existing `mergeChangesets` and `persistChangeset` flow.

## What needs to ship

### 1. `mutateCreateDerivationPremise(engine, premiseId, data) → { premise, changes }`

Creates a derivation premise + claim-bound variable + consequent variable expression atomically. The naked-Q form is exactly one expression row at the root (the consequent variable); zero-expression derivation premises are invalid per `ManagedDerivationPremiseEngine.assertWellFormed()`.

**Suggested signature** (matching the existing `mutateCreatePremise` shape):

```ts
import type {
    TPropositionalPremise,
    TPropositionalVariable,
    TPropositionalExpressionCombined,
} from "../../schemas/logic.js"
import type { ProjectEngine, ProjectChangeset } from "./types.js"

export function mutateCreateDerivationPremise(
    engine: ProjectEngine,
    premiseId: string,
    data: {
        argumentId: string
        argumentVersion: number
        creatorId: string
        createdOn: Date
        derivedClaimId: string
        // The consequent variable id is caller-minted so the server can pre-
        // generate IDs in the same UUID scheme as the rest of the row.
        consequentVariableId: string
        consequentExpressionId: string
    }
): {
    premise: TPropositionalPremise
    consequentVariable: TPropositionalVariable
    consequentExpression: TPropositionalExpressionCombined
    changes: ProjectChangeset
}
```

**Behavior:**

- Creates the premise via `engine.createPremiseWithId(premiseId, { type: "derivation", derivedClaimId, extras: { argumentId, argumentVersion, creatorId, createdOn } })`. Falls back to whatever shape the underlying core API expects for `type='derivation'` premises in `0.11.x`.
- Mints a claim-bound `propositionalVariable` for `derivedClaimId` (the consequent). The server will pass `consequentVariableId` so the variable id is caller-controlled.
- Adds a `propositionalExpression` of `type='variable'` with `parentId=null`, `position=0`, bound to that variable — this is the naked-Q root.
- Returns the merged changeset. The server hands it to `persistChangeset(trx, argumentId, argumentVersion, changes)` inside the same transaction as the underlying `claims` row insert.

**Why caller-minted IDs:** `proposit-server`'s migration uses raw SQL backfill (no engine context); the live write path mints IDs via `uuidv4()` and threads them into `addClaim`/`addClaimCitation`. Letting the caller pass IDs keeps the migration and live-write paths producing structurally identical trees, which simplifies post-migration verification.

### 2. `clearDerivationAntecedent(engine, premiseId) → { changes }`

Removes the IMPLIES/OR antecedent subtree from a populated derivation premise, leaving the premise in the naked-Q form (just the consequent variable as root). Required because `ManagedDerivationPremiseEngine.populateFromCitations` throws `DERIVATION_ANTECEDENT_NON_EMPTY` when the antecedent is already populated — so the server must clear before re-populating on every citation create/delete.

**Suggested signature:**

```ts
export function clearDerivationAntecedent(
    engine: ProjectEngine,
    premiseId: string
): { changes: ProjectChangeset }
```

**Behavior:**

- If the premise's root expression is a `variable` (already naked), returns an empty changeset.
- If the root is `IMPLIES`, walks the tree and produces a changeset that:
    - Removes the IMPLIES root expression.
    - Removes the OR antecedent and its `citation_var_*` children.
    - Removes the `propositionalVariables` rows for the citation-bound variables (one per OR child) — they're no longer referenced by any expression. (If shared doesn't currently produce variable-removal entries via its mutation surface, this is the new bit; otherwise reuse whatever `engine.removeExpression(_, deleteSubtree=true)` already produces.)
    - Promotes the existing consequent variable expression (formerly position-1 child of IMPLIES) to be the new root with `parentId=null, position=0`. The variable id stays the same so `populateFromCitations` (called next) can re-build the IMPLIES around it without minting a new consequent variable.

**Idempotency:** calling on an already-naked premise is a no-op.

### 3. `populateDerivationFromCitations(engine, premiseId, sourceClaimIds) → { changes }`

Builds the `IMPLIES(OR(citation_var_1, …, citation_var_n), Q)` tree on a naked derivation premise using shared's existing changeset-returning primitives. Does **not** call core's `ManagedDerivationPremiseEngine.populateFromCitations(citationLib, argumentEngine)` directly — that method mutates in place and returns void, and would also require teaching `constructEngineFromData` to populate the engine's `claimCitationLibrary` (which currently uses `EMPTY_CLAIM_SOURCE_LOOKUP`). Building the tree from primitives is mechanical, matches the migration's raw-SQL backfill shape exactly, and composes cleanly with `mergeChangesets`.

**Suggested signature:**

```ts
export function populateDerivationFromCitations(
    engine: ProjectEngine,
    premiseId: string,
    /**
     * Ordered list of source claim IDs (the cited claims). Order determines
     * the OR's child positions. Caller queries these from `claimCitations`
     * for the citing claim, sorted by `createdOn` ascending.
     */
    sourceClaimIds: string[]
): { changes: ProjectChangeset }
```

**Behavior:**

- Throw `DERIVATION_TYPE_MISMATCH` if `premiseId` doesn't resolve to a `type='derivation'` premise.
- Throw `DERIVATION_ANTECEDENT_NON_EMPTY` if the premise's root expression isn't a bare consequent variable. (Caller is expected to call `clearDerivationAntecedent` first when the premise is already populated.)
- If `sourceClaimIds` is empty, return an empty changeset (premise stays naked).
- Otherwise, build the tree using existing engine primitives — each returns a changeset:
    1. For each `sourceClaimId`, mint a claim-bound variable via the existing variable mutation surface (`engine.ensureClaimBoundVariable(sourceClaimId)` or equivalent — re-use whatever shape `mutateCreateClaimBoundVariable` already exposes; if no public mutation exists, expose a thin wrapper).
    2. Find the existing consequent variable expression (the current root of the premise; bare variable, parentId=null, position=0). Modify it to set `parentId = <implies-id>, position = 1`.
    3. Add an `IMPLIES` operator expression as the new root (`parentId=null, position=0`).
    4. Add an `OR` operator expression as position-0 child of IMPLIES.
    5. Add `citation_var` expressions of `type='variable'` as children of OR, position k for k=0..n-1, each bound to the corresponding `sourceClaimId`'s claim-bound variable.
- Merge all sub-changesets via `mergeChangesets` and return.

**Why caller-supplied source IDs:** keeps the engine's `claimCitationLibrary` out of the picture (it's empty in the server's `constructEngineFromData` setup); makes the migration and live-write paths use the same trace; lets the server choose ordering (it sorts edges by `createdOn` before passing).

### 4. `buildTextTree` filters out derivation premises

**File:** `src/engine/text-tree.ts`

Wave 2's ATV view shows only freeform premises in the flat list. Derivation premises surface as citation badges + naked-Q indicator on claim cards, computed from snapshot-derived helpers — the text walk shouldn't emit `premise-header → operator → claim` items for them.

**Suggested change:** in the per-premise loop inside `buildTextTree(snapshot)`, skip premises where `premise.type === "derivation"`. Existing arguments without derivation premises render identically — purely additive.

```ts
// Inside the premise iteration loop, immediately after fetching the premise:
if (premise.type === "derivation") continue
```

**Bump:** patch (additive filter, no API change).

## Test cases

The shared agent should land tests for each of the four items. Suggestions:

### `mutateCreateDerivationPremise`

```ts
test("mutateCreateDerivationPremise creates a naked-Q derivation premise atomically", () => {
    const engine = makeArgumentEngine()
    const claimId = "claim-1"
    const premiseId = "p-d-1"
    const consequentVariableId = "v-1"
    const consequentExpressionId = "e-1"
    const result = mutateCreateDerivationPremise(engine, premiseId, {
        argumentId: "arg-1",
        argumentVersion: 1,
        creatorId: "u-1",
        createdOn: new Date(),
        derivedClaimId: claimId,
        consequentVariableId,
        consequentExpressionId,
    })
    expect(result.premise.type).toBe("derivation")
    expect(result.premise.derivedClaimId).toBe(claimId)
    expect(result.consequentExpression.type).toBe("variable")
    expect(result.consequentExpression.parentId).toBeNull()
    expect(result.consequentExpression.position).toBe(0)
    expect(result.consequentExpression.variableId).toBe(consequentVariableId)
    expect(result.consequentVariable.claimId).toBe(claimId)
    // The changeset includes the premise add, variable add, expression add.
    expect(result.changes.premises?.added).toContainEqual(
        expect.objectContaining({ id: premiseId, type: "derivation" })
    )
    expect(result.changes.variables?.added).toContainEqual(
        expect.objectContaining({ id: consequentVariableId })
    )
    expect(result.changes.expressions?.added).toContainEqual(
        expect.objectContaining({ id: consequentExpressionId })
    )
})

test("subsequent fromSnapshot loads the resulting state without invariant violations", () => {
    // Apply the changeset, snapshot the engine, fromSnapshot the result, expect no throw.
})
```

### `clearDerivationAntecedent`

```ts
test("clearDerivationAntecedent on a naked premise is a no-op", () => {
    const engine = makeArgumentEngineWithDerivationPremise("p-1") // helper that creates naked-Q
    const { changes } = clearDerivationAntecedent(engine, "p-1")
    expect(Object.keys(changes)).toHaveLength(0)
})

test("clearDerivationAntecedent on a populated premise removes IMPLIES/OR/citation_vars and re-roots Q", () => {
    const engine = makeArgumentEngineWithPopulatedDerivationPremise("p-1", [
        "citation-claim-a",
        "citation-claim-b",
    ])
    const { changes } = clearDerivationAntecedent(engine, "p-1")

    // Expression removals: the IMPLIES root, the OR, the two citation_var
    // expressions. The consequent variable expression survives but its
    // parentId/position changes (becomes root).
    expect(changes.expressions?.removed?.length).toBeGreaterThanOrEqual(4)
    expect(changes.expressions?.modified?.length).toBeGreaterThanOrEqual(1) // consequent re-rooted

    // Variable removals: the two citation-bound variables.
    expect(changes.variables?.removed?.length).toBe(2)

    // Premise itself is not touched (still type='derivation').
    expect(changes.premises?.removed ?? []).toHaveLength(0)
})
```

### `populateDerivationFromCitations`

```ts
test("populateDerivationFromCitations on a naked premise with sourceClaimIds builds IMPLIES(OR(citations), Q)", () => {
    const engine = makeArgumentEngineWithDerivationPremise("p-1", "claim-Q")
    const { changes } = populateDerivationFromCitations(engine, "p-1", [
        "citation-claim-a",
    ])
    // The IMPLIES, OR, and one citation_var should be added; the consequent
    // expression's parent should be modified.
    const operatorAdds = (changes.expressions?.added ?? []).filter(
        (e) => e.type === "operator"
    )
    expect(operatorAdds.map((e) => e.operator).sort()).toEqual(["implies", "or"])
    // The OR has one variable child (the citation), and the consequent
    // variable expression is now the position-1 child of IMPLIES.
    const variableAdds = (changes.expressions?.added ?? []).filter(
        (e) => e.type === "variable"
    )
    expect(variableAdds).toHaveLength(1) // only the citation_var; consequent is reparented, not added
    const consequentMods = (changes.expressions?.modified ?? []).filter(
        (e) => e.type === "variable"
    )
    expect(consequentMods).toHaveLength(1)
    expect(consequentMods[0].position).toBe(1)
})

test("populateDerivationFromCitations with empty sourceClaimIds is a no-op", () => {
    const engine = makeArgumentEngineWithDerivationPremise("p-1", "claim-Q")
    const { changes } = populateDerivationFromCitations(engine, "p-1", [])
    expect(Object.keys(changes)).toHaveLength(0)
})

test("populateDerivationFromCitations with two sources produces a 2-child OR in source-id order", () => {
    const engine = makeArgumentEngineWithDerivationPremise("p-1", "claim-Q")
    const { changes } = populateDerivationFromCitations(engine, "p-1", [
        "src-a",
        "src-b",
    ])
    const variableAdds = (changes.expressions?.added ?? []).filter(
        (e) => e.type === "variable"
    )
    expect(variableAdds).toHaveLength(2)
    // Ordered: position 0 → src-a, position 1 → src-b.
    expect(variableAdds[0].position).toBe(0)
    expect(variableAdds[1].position).toBe(1)
})

test("populateDerivationFromCitations on a populated premise throws DERIVATION_ANTECEDENT_NON_EMPTY", () => {
    const engine = makeArgumentEngineWithPopulatedDerivationPremise("p-1", ["a"])
    expect(() =>
        populateDerivationFromCitations(engine, "p-1", ["b"])
    ).toThrowError(/DERIVATION_ANTECEDENT_NON_EMPTY/)
})

test("populateDerivationFromCitations on a non-derivation premise throws DERIVATION_TYPE_MISMATCH", () => {
    const engine = makeArgumentEngineWithFreeformPremise("p-free")
    expect(() =>
        populateDerivationFromCitations(engine, "p-free", ["a"])
    ).toThrowError(/DERIVATION_TYPE_MISMATCH/)
})
```

### `buildTextTree` derivation-premise filter

```ts
test("buildTextTree skips derivation premises", () => {
    const snapshot = makeSnapshot({
        premises: {
            "p-free": { /* freeform with one claim variable */ },
            "p-deriv": { /* derivation with a Q variable */ },
        },
    })
    const items = buildTextTree(snapshot)
    const premiseHeaders = items.filter((i) => i.type === "premise-header")
    expect(premiseHeaders.map((i) => i.premiseId)).toEqual(["p-free"])
})
```

## Composition example (server-side, for context)

The server's wave-2 `addClaimCitation` will compose these like:

```ts
const engine = await getOrLoadEngine(trx, argumentId, version)
// Query the citing claim's current citation set in createdOn order.
const sourceClaimIds = (
    await trx("claimCitations")
        .where({ citingClaimId, citingClaimVersion: version, argumentId })
        .orderBy("createdOn")
        .select("sourceClaimId")
).map((r) => r.sourceClaimId)
const clearChangeset = clearDerivationAntecedent(engine, derivationPremiseId)
const populateChangeset = populateDerivationFromCitations(
    engine,
    derivationPremiseId,
    sourceClaimIds
)
const merged = mergeChangesets(clearChangeset, populateChangeset)
await persistChangeset(trx, argumentId, version, merged)
```

The server's `addClaim` will call:

```ts
const engine = await getOrLoadEngine(trx, argumentId, version)
const { changes } = mutateCreateDerivationPremise(engine, uuidv4(), {
    argumentId,
    argumentVersion: version,
    creatorId: userId,
    createdOn: new Date(),
    derivedClaimId: newClaim.id,
    consequentVariableId: uuidv4(),
    consequentExpressionId: uuidv4(),
})
await persistChangeset(trx, argumentId, version, changes)
```

## Out of scope

- **Engine-side mutation methods.** Whatever core 0.11.x already exposes (`populateFromCitations`, `removeExpression(_, deleteSubtree)`, `createPremiseWithId`) is enough to implement these wrappers. If a needed primitive is missing in core, that's a separate change request to `proposit-core`.
- **Optimistic citation engine updates.** The TODO in `proposit-server`'s `arg-data-context.tsx` (citation create/delete optimistic state) is wave-3 work; not unblocked by this change request.
- **API-client wrappers.** Server uses these mutations directly via the engine path; no `@proposit/shared/api-client` work needed.

## Release checklist (for the shared maintainer)

1. Implement the four items above in `src/engine/mutations/premises.ts` and `src/engine/text-tree.ts`.
2. Add tests per the suggestions in this CR.
3. Bump `package.json` version (recommend `0.6.0` for the new mutations, but `0.5.2` is acceptable if treated as additive).
4. Update `docs/release-notes/upcoming.md` and `docs/changelogs/upcoming.md`.
5. Rename `upcoming.md` → `v{version}.md` and tag `v{version}` per the workspace convention.
6. `pnpm publish --access public`.
7. Notify the `proposit-server` agent that the version is on npm so wave-2 prerequisite #2 is met.
