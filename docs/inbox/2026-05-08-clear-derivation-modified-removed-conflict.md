# `clearDerivationAntecedent` produces conflicting modified+removed entries on reloaded engines

**Affected version:** `@proposit/shared@0.6.0`

**Reported by:** Server agent (Task 4 of wave-2 ATV pivot, `feat/atv-pivot-wave-2`).

## Symptom

`clearDerivationAntecedent(engine, premiseId)` throws

```
mergeChangesets: entity "<expr-id>" appears in both modified and removed in expressions
```

when invoked on a derivation premise whose engine was reconstructed via
`ArgumentEngine.fromData(...)` (or `fromSnapshot(...)`) and then mutated. The
in-process flow (create premise -> populate -> clear, all on the same engine
instance) works correctly; the bug only manifests after a load/reload boundary.

This breaks the canonical "load → mutate → persist" flow that the server uses
for every HTTP request: each request reloads the engine via `loadArgumentData

- constructEngineFromData`, then runs `clearDerivationAntecedent`+`populateDerivationFromCitations`to rebuild the IMPLIES tree on the citing
claim's derivation premise. The second invocation of`addClaimCitation`on the
same claim (which produces an`n=1 → n=2` reshape) reliably hits this bug.

## Reproducer

A condensed in-process reproducer that exercises the load boundary:

```ts
import { ArgumentEngine } from "@proposit/proposit-core"
import {
    mutateCreateDerivationPremise,
    populateDerivationFromCitations,
    clearDerivationAntecedent,
} from "@proposit/shared/engine/mutations"

// build minimal engine with claim-q + src-1 in the library, then:
mutateCreateDerivationPremise(engine, "p1", {
    /* ... */
})
populateDerivationFromCitations(engine, "p1", ["src-1"]) // n=1: IMPLIES(c, Q)

// Round-trip across the load boundary
const snapshot = engine.toSnapshot()
const reloaded = ArgumentEngine.fromSnapshot(snapshot, claimLib, citLib)

// Throws "modified and removed in expressions"
clearDerivationAntecedent(reloaded, "p1")
```

The same call on the original `engine` (no reload) returns successfully.

## Root cause

Inside `clearDerivationAntecedent`, three sub-changesets are produced and
merged via the internal `mergeChangesetSequence(collected)`:

1. `pm.removeExpression(antecedent.id, true)` — cascade-removes the antecedent.
   On a reloaded engine, the parent IMPLIES node's _descendant checksum_ is
   recomputed and the engine emits IMPLIES as a `modified` entry in the
   changeset. (On a fresh in-process engine, the descendant-checksum tracker
   is in a different state and IMPLIES is not emitted as `modified`.)
2. `pm.removeExpression(rootExprId, false)` (under `PERMISSIVE_GRAMMAR_CONFIG`)
   — removes IMPLIES, promoting the consequent variable to root. IMPLIES
   appears in this changeset's `removed` bucket.
3. `engine.removeVariable(varId)` for each citation-bound variable.

`mergeChangesetSequence` (in `engine/mutations/premises.ts`) only sanitizes
`added`/`modified` collisions across changesets, not `modified`/`removed`. So
when step 1's `modified` IMPLIES meets step 2's `removed` IMPLIES, the merge
emits IMPLIES into both buckets and `mergeChangesets` throws on the
single-bucket invariant.

## Proposed fix

In `engine/mutations/premises.ts`, extend `mergeChangesetSequence` (or add a
sibling helper used by `clearDerivationAntecedent`) to drop `modified` entries
whose ids appear in any changeset's `removed` bucket. The shape is symmetric
to the existing `added`-versus-`modified` reconciliation. Rough sketch:

```ts
function mergeChangesetSequence(changesets: ProjectChangeset[]) {
    const removedIds = {
        premises: new Set<string>(),
        variables: new Set<string>(),
        expressions: new Set<string>(),
    }
    for (const c of changesets) {
        for (const p of c.premises?.removed ?? []) removedIds.premises.add(p.id)
        for (const v of c.variables?.removed ?? [])
            removedIds.variables.add(v.id)
        for (const e of c.expressions?.removed ?? [])
            removedIds.expressions.add(e.id)
    }
    // existing addedIds collection ...
    let result: ProjectChangeset = {}
    for (const c of changesets) {
        const sanitized = {
            ...c,
            premises: c.premises && {
                ...c.premises,
                modified: c.premises.modified.filter(
                    (p) =>
                        !addedIds.premises.has(p.id) &&
                        !removedIds.premises.has(p.id)
                ),
            },
            // same for variables, expressions
        }
        result = mergeChangesets(result, sanitized)
    }
    return result
}
```

## Test cases

Add to `src/engine/mutations/__tests__/derivation-premises.test.ts`:

1. **Reloaded engine, n=1 clear** — fork and reload via `toSnapshot` /
   `fromSnapshot`, then call `clearDerivationAntecedent`. Should not throw.
2. **Reloaded engine, n=2 clear** — same shape, should not throw (probably
   already covered by the existing `n=2 → clear` test if it's run on a
   reloaded engine).
3. **Reloaded engine, repopulate cycle** — clear then populate again, twice
   in a row. Mirrors the server's `addClaimCitation` flow when the same
   citing claim picks up additional citations across HTTP requests.

## Server-side workaround (until upstream fix lands)

`proposit-server/src/model/claim.ts` ships a helper named
`clearDerivationAntecedentSafe` that mirrors the shared library's
`clearDerivationAntecedent` logic but post-processes each step's changeset to
strip `modified` entries that conflict with `removed` ids before merging. The
helper is annotated as a workaround pointing at this CR. Once the upstream
fix ships and `@proposit/shared` is bumped in the server, the helper should
be deleted in favor of the shared mutation.

## Impact

- **Server (`addClaimCitation`):** would always fail on the second citation
  added to the same claim without the workaround.
- **Mobile / clients consuming `@proposit/shared/engine/mutations` directly:**
  same failure mode whenever they reload an engine and then clear a
  populated derivation premise.
