import { describe, test, expect } from "vitest"
import { ArgumentEngine } from "@proposit/proposit-core"
import { createTestEngine, mkTestClaim } from "./helpers.js"
import {
    mutateCreatePremise,
    mutateCreateDerivationPremise,
    clearDerivationAntecedent,
    populateDerivationFromCitations,
    populateDerivationFromAxiom,
} from "../premises.js"
import { mutateCreateVariable } from "../variables.js"
import { PropositArgumentEngine } from "../../engine.js"
import { createClaimLookup } from "../../library-adapters.js"
import type {
    TAxiomaticClaim,
    TAxiomKind,
} from "../../../schemas/model/claims.js"

const ARG_ID = "test-arg-id"
const ARG_VERSION = 1
const USER_ID = "test-user-id"

function setupEngineWithClaims(claimIds: string[]): PropositArgumentEngine {
    return createTestEngine(
        undefined,
        claimIds.map((id) => mkTestClaim({ id }))
    )
}

function createNakedDerivationPremise(
    engine: PropositArgumentEngine,
    derivedClaimId: string,
    ids?: { premiseId?: string; varId?: string; exprId?: string }
) {
    return mutateCreateDerivationPremise(
        engine,
        ids?.premiseId ?? crypto.randomUUID(),
        {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            derivedClaimId,
            consequentVariableId: ids?.varId ?? crypto.randomUUID(),
            consequentExpressionId: ids?.exprId ?? crypto.randomUUID(),
        }
    )
}

describe("mutateCreateDerivationPremise", () => {
    test("creates a naked-Q derivation premise atomically with caller-minted IDs", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        const premiseId = "p-d-1"
        const consequentVariableId = "v-1"
        const consequentExpressionId = "e-1"

        const result = mutateCreateDerivationPremise(engine, premiseId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            derivedClaimId: "claim-q",
            consequentVariableId,
            consequentExpressionId,
        })

        expect(result.premise.type).toBe("derivation")
        expect(
            (result.premise as { derivedClaimId?: string }).derivedClaimId
        ).toBe("claim-q")

        expect(result.consequentExpression.type).toBe("variable")
        expect(result.consequentExpression.parentId).toBeNull()
        expect(result.consequentExpression.position).toBe(0)
        expect(result.consequentExpression.id).toBe(consequentExpressionId)
        if (result.consequentExpression.type === "variable") {
            expect(result.consequentExpression.variableId).toBe(
                consequentVariableId
            )
        }

        expect(result.consequentVariable.id).toBe(consequentVariableId)
        if ("claimId" in result.consequentVariable) {
            expect(result.consequentVariable.claimId).toBe("claim-q")
        }

        expect(result.changes.premises?.added).toContainEqual(
            expect.objectContaining({ id: premiseId, type: "derivation" })
        )
        expect(result.changes.variables?.added).toContainEqual(
            expect.objectContaining({ id: consequentVariableId })
        )
        expect(result.changes.expressions?.added).toContainEqual(
            expect.objectContaining({ id: consequentExpressionId })
        )

        // No leaked auto entities: the auto consequent var (engine-generated id)
        // and auto naked-Q expression (engine-generated id) should not appear.
        const variableAdds = result.changes.variables?.added ?? []
        const claimBoundAdds = variableAdds.filter(
            (v) => "claimId" in v && v.claimId === "claim-q"
        )
        expect(claimBoundAdds).toHaveLength(1)
        expect(claimBoundAdds[0].id).toBe(consequentVariableId)
    })

    test("subsequent snapshot/fromSnapshot round-trip loads without invariant violations", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-d-1",
            varId: "v-1",
            exprId: "e-1",
        })

        // Snapshot the engine after the mutation.
        const snapshot = engine.snapshot()

        // Restoring from the resulting snapshot should not throw — the engine
        // validates derivation structure invariants on rollback.
        const restored = setupEngineWithClaims(["claim-q"])
        expect(() => restored.rollback(snapshot)).not.toThrow()
        expect(restored.getPremise("p-d-1")?.toPremiseData().type).toBe(
            "derivation"
        )
    })
})

describe("mutateCreateDerivationPremise — adopt existing consequent variable", () => {
    test("adopts an existing claim-bound variable as the consequent and does not mint a new one", () => {
        // Mimics a legacy / fork-from-older-arg claim: a claim-bound free
        // variable for the claim already exists, but no derivation premise has
        // been minted yet. The new adopt path lets the heal-on-write flow reuse
        // the existing variable rather than allocating a duplicate.
        const engine = setupEngineWithClaims(["claim-q"])
        const existingVarId = "existing-q-var"
        mutateCreateVariable(engine, existingVarId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            claimId: "claim-q",
            claimVersion: 1,
            symbol: "Q",
            creatorId: USER_ID,
            createdOn: new Date(),
        })

        const premiseId = "p-d-1"
        const consequentExpressionId = "e-1"

        const result = mutateCreateDerivationPremise(engine, premiseId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            derivedClaimId: "claim-q",
            existingConsequentVariableId: existingVarId,
            consequentExpressionId,
        })

        expect(result.premise.type).toBe("derivation")
        expect(result.consequentVariable.id).toBe(existingVarId)

        expect(result.consequentExpression.type).toBe("variable")
        expect(result.consequentExpression.id).toBe(consequentExpressionId)
        if (result.consequentExpression.type === "variable") {
            expect(result.consequentExpression.variableId).toBe(existingVarId)
        }

        // Changeset must not contain a freshly added claim-bound variable for
        // claim-q — the existing one is reused.
        const variableAdds = result.changes.variables?.added ?? []
        const claimBoundAddsForQ = variableAdds.filter(
            (v) => "claimId" in v && v.claimId === "claim-q"
        )
        expect(claimBoundAddsForQ).toHaveLength(0)

        // Engine snapshot: exactly one claim-bound variable bound to claim-q.
        const claimBoundForQ = engine
            .getVariables()
            .filter((v) => "claimId" in v && v.claimId === "claim-q")
        expect(claimBoundForQ).toHaveLength(1)
        expect(claimBoundForQ[0].id).toBe(existingVarId)
    })

    test("throws when neither consequentVariableId nor existingConsequentVariableId is supplied", () => {
        const engine = setupEngineWithClaims(["claim-q"])

        expect(() =>
            mutateCreateDerivationPremise(engine, "p-1", {
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: USER_ID,
                createdOn: new Date(),
                derivedClaimId: "claim-q",
                consequentExpressionId: "e-1",
            } as Parameters<typeof mutateCreateDerivationPremise>[2])
        ).toThrowError(
            /consequentVariableId.*existingConsequentVariableId|existingConsequentVariableId.*consequentVariableId/
        )
    })

    test("throws when both consequentVariableId and existingConsequentVariableId are supplied", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        const existingVarId = "existing-q-var"
        mutateCreateVariable(engine, existingVarId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            claimId: "claim-q",
            claimVersion: 1,
            symbol: "Q",
            creatorId: USER_ID,
            createdOn: new Date(),
        })

        expect(() =>
            mutateCreateDerivationPremise(engine, "p-1", {
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: USER_ID,
                createdOn: new Date(),
                derivedClaimId: "claim-q",
                consequentVariableId: "new-var",
                existingConsequentVariableId: existingVarId,
                consequentExpressionId: "e-1",
            })
        ).toThrowError(/mutually exclusive|cannot.*both/i)
    })

    test("throws when existingConsequentVariableId references a variable not in the engine", () => {
        const engine = setupEngineWithClaims(["claim-q"])

        expect(() =>
            mutateCreateDerivationPremise(engine, "p-1", {
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: USER_ID,
                createdOn: new Date(),
                derivedClaimId: "claim-q",
                existingConsequentVariableId: "nonexistent-var-id",
                consequentExpressionId: "e-1",
            })
        ).toThrowError(/not found|does not exist/i)
    })

    test("throws when existingConsequentVariableId references a premise-bound (non-claim-bound) variable", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        // Mint a derivation premise normally so we have a premise-bound variable
        // to point at. createPremiseWithId auto-allocates a premise-bound var.
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-existing",
            varId: "v-q",
            exprId: "e-q",
        })
        const premiseBoundVars = engine
            .getVariables()
            .filter((v) => !("claimId" in v))
        expect(premiseBoundVars.length).toBeGreaterThan(0)
        const premiseBoundVar = premiseBoundVars[0]

        // sanity: ensure the premise we just created is what we expect
        expect(premise.type).toBe("derivation")

        expect(() =>
            mutateCreateDerivationPremise(engine, "p-2", {
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: USER_ID,
                createdOn: new Date(),
                derivedClaimId: "claim-q",
                existingConsequentVariableId: premiseBoundVar.id,
                consequentExpressionId: "e-1",
            })
        ).toThrowError(/claim-bound|not.*claim-bound/i)
    })

    test("throws when existingConsequentVariableId references a claim-bound variable for a different claim", () => {
        const engine = setupEngineWithClaims(["claim-q", "claim-r"])
        const wrongClaimVarId = "var-for-r"
        mutateCreateVariable(engine, wrongClaimVarId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            claimId: "claim-r",
            claimVersion: 1,
            symbol: "R",
            creatorId: USER_ID,
            createdOn: new Date(),
        })

        expect(() =>
            mutateCreateDerivationPremise(engine, "p-1", {
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: USER_ID,
                createdOn: new Date(),
                derivedClaimId: "claim-q",
                existingConsequentVariableId: wrongClaimVarId,
                consequentExpressionId: "e-1",
            })
        ).toThrowError(/claim-q|claimId|derivedClaimId/i)
    })

    test("mint-path behavior is unchanged when consequentVariableId is supplied", () => {
        // Existing happy-path test (above) already covers this; replicate the
        // most important assertion as a regression lock against the adopt-path
        // refactor.
        const engine = setupEngineWithClaims(["claim-q"])

        const result = mutateCreateDerivationPremise(engine, "p-d-1", {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            derivedClaimId: "claim-q",
            consequentVariableId: "v-mint-1",
            consequentExpressionId: "e-mint-1",
        })

        const variableAdds = result.changes.variables?.added ?? []
        const claimBoundAdds = variableAdds.filter(
            (v) => "claimId" in v && v.claimId === "claim-q"
        )
        expect(claimBoundAdds).toHaveLength(1)
        expect(claimBoundAdds[0].id).toBe("v-mint-1")
    })

    test("adopt-path snapshot/rollback round-trip loads without invariant violations", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        const existingVarId = "existing-q-var"
        mutateCreateVariable(engine, existingVarId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            claimId: "claim-q",
            claimVersion: 1,
            symbol: "Q",
            creatorId: USER_ID,
            createdOn: new Date(),
        })
        mutateCreateDerivationPremise(engine, "p-d-1", {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            derivedClaimId: "claim-q",
            existingConsequentVariableId: existingVarId,
            consequentExpressionId: "e-1",
        })

        const snapshot = engine.snapshot()
        const restored = setupEngineWithClaims(["claim-q"])
        expect(() => restored.rollback(snapshot)).not.toThrow()
        expect(restored.getPremise("p-d-1")?.toPremiseData().type).toBe(
            "derivation"
        )
    })

    test("adopt-path supports the full clear/populate round-trip after reload (mirrors server addCitation flow)", () => {
        const engine = setupEngineWithClaims(["claim-q", "src-a"])
        const existingVarId = "existing-q-var"
        mutateCreateVariable(engine, existingVarId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            claimId: "claim-q",
            claimVersion: 1,
            symbol: "Q",
            creatorId: USER_ID,
            createdOn: new Date(),
        })
        mutateCreateDerivationPremise(engine, "p-1", {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            derivedClaimId: "claim-q",
            existingConsequentVariableId: existingVarId,
            consequentExpressionId: "e-q",
        })

        // Snapshot + reload, then run a clear → populate cycle.
        const snapshot = engine.snapshot()
        const reloaded = setupEngineWithClaims(["claim-q", "src-a"])
        reloaded.rollback(snapshot)
        expect(() => {
            clearDerivationAntecedent(reloaded, "p-1")
            populateDerivationFromCitations(reloaded, "p-1", ["src-a"])
        }).not.toThrow()
    })
})

describe("clearDerivationAntecedent", () => {
    test("on a naked premise is a no-op", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        const { premise } = createNakedDerivationPremise(engine, "claim-q")
        const { changes } = clearDerivationAntecedent(engine, premise.id)
        expect(changes.expressions).toBeUndefined()
        expect(changes.variables).toBeUndefined()
        expect(changes.premises).toBeUndefined()
    })

    test("on a populated premise removes IMPLIES/OR/citation_vars and re-roots Q", () => {
        const engine = setupEngineWithClaims(["claim-q", "src-a", "src-b"])
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromCitations(engine, premise.id, ["src-a", "src-b"])

        // Sanity-check: pre-clear, the premise should be in IMPLIES form.
        const beforeRoot = engine.getPremise(premise.id)?.getRootExpressionId()
        const beforeRootExpr = engine
            .getPremise(premise.id)
            ?.getExpression(beforeRoot!)
        expect(beforeRootExpr?.type).toBe("operator")

        const { changes } = clearDerivationAntecedent(engine, premise.id)

        // Expression removals: the antecedent OR + its 2 citation_vars are
        // unconditional removes. IMPLIES's disposition varies between
        // pre-1.0 (explicit `removeExpression(rootId, false)` in step 2 of
        // the helper, captured in `removed`) and 1.0 (AN-3 collapses the
        // 1-child IMPLIES into its consequent during step 1's cascade,
        // captured as a `modified` reparent of Q rather than an explicit
        // IMPLIES `removed` entry — the AN post-hook fires inside the
        // first `removeExpression` and merges into its changeset). The
        // stable property is "at least the OR + 2 vars are removed, and
        // the consequent ends up at the root."
        expect(
            changes.expressions?.removed?.length ?? 0
        ).toBeGreaterThanOrEqual(3)
        expect(
            changes.expressions?.modified?.length ?? 0
        ).toBeGreaterThanOrEqual(1)

        // Variable removals: the two citation-bound variables (one per source).
        expect(changes.variables?.removed?.length).toBe(2)

        // Premise itself untouched.
        expect(changes.premises?.removed ?? []).toHaveLength(0)

        // Engine state: root is the consequent variable expression at the top.
        const afterRootId = engine.getPremise(premise.id)?.getRootExpressionId()
        expect(afterRootId).toBe("e-q")
        const afterRoot = engine.getPremise(premise.id)?.getExpression("e-q")
        expect(afterRoot?.type).toBe("variable")
        expect(afterRoot?.parentId).toBeNull()
    })

    test("after snapshot/rollback round-trip, clear on n=1 IMPLIES does not throw", () => {
        // Regression: clear-derivation modified/removed conflict on a reloaded engine.
        // On a reloaded engine the descendant-checksum tracker is in a fresh
        // state, so removing the antecedent emits IMPLIES as `modified` in the
        // first sub-changeset; the next sub-changeset removes IMPLIES. The
        // merge step previously left IMPLIES in BOTH `modified` and `removed`,
        // tripping mergeChangesets's single-bucket invariant.
        const engine = setupEngineWithClaims(["claim-q", "src-a"])
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromCitations(engine, "p-1", ["src-a"])

        const snapshot = engine.snapshot()
        const reloaded = setupEngineWithClaims(["claim-q", "src-a"])
        reloaded.rollback(snapshot)

        expect(() => clearDerivationAntecedent(reloaded, "p-1")).not.toThrow()
    })

    test("after reload, clear → populate cycle works (mirrors server addCitation flow)", () => {
        // Server's addCitation reloads the engine each request and calls
        // clear → populate to rebuild IMPLIES with the next citation set. The
        // n=1 → n=2 reshape was the originally-reported failure.
        const engine = setupEngineWithClaims(["claim-q", "src-a", "src-b"])
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromCitations(engine, "p-1", ["src-a"])

        // First reload + reshape: clear → populate with two sources.
        const snap1 = engine.snapshot()
        const reload1 = setupEngineWithClaims(["claim-q", "src-a", "src-b"])
        reload1.rollback(snap1)
        expect(() => {
            clearDerivationAntecedent(reload1, "p-1")
            populateDerivationFromCitations(reload1, "p-1", ["src-a", "src-b"])
        }).not.toThrow()

        // Second reload + reshape: clear → populate again with the same set.
        const snap2 = reload1.snapshot()
        const reload2 = setupEngineWithClaims(["claim-q", "src-a", "src-b"])
        reload2.rollback(snap2)
        expect(() => {
            clearDerivationAntecedent(reload2, "p-1")
            populateDerivationFromCitations(reload2, "p-1", ["src-a", "src-b"])
        }).not.toThrow()
    })
})

describe("populateDerivationFromCitations", () => {
    test("on a naked premise with one source builds IMPLIES(citation_var, Q)", () => {
        const engine = setupEngineWithClaims(["claim-q", "src-a"])
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })

        const { changes } = populateDerivationFromCitations(
            engine,
            premise.id,
            ["src-a"]
        )

        const operatorAdds = (changes.expressions?.added ?? []).filter(
            (e) => e.type === "operator"
        )
        expect(operatorAdds.map((e) => e.operator).sort()).toEqual(["implies"])

        // One added variable expression (the citation_var). The consequent
        // expression is reparented (modified), not added.
        const variableAdds = (changes.expressions?.added ?? []).filter(
            (e) => e.type === "variable"
        )
        expect(variableAdds).toHaveLength(1)

        // The consequent's row identity is preserved (e-q); it now sits at
        // position 1 (the consequent slot) of IMPLIES — i.e., higher than the
        // antecedent. Engine positions are midpoint-based (not literal 0/1),
        // so verify ordering rather than specific values.
        const consequentMods = (changes.expressions?.modified ?? []).filter(
            (e) => e.id === "e-q"
        )
        expect(consequentMods).toHaveLength(1)
        const pm = engine.getPremise(premise.id)!
        const rootId = pm.getRootExpressionId()!
        const rootChildren = pm
            .getChildExpressions(rootId)
            .sort((a, b) => a.position - b.position)
        expect(rootChildren).toHaveLength(2)
        // Antecedent first, consequent second.
        const consequentChild = rootChildren[1]
        expect(consequentChild.id).toBe("e-q")
    })

    test("with two sources produces IMPLIES(OR(s_a, s_b), Q) in source-id order", () => {
        // Behavior change for shared 0.9.0 (peer bump to core 1.0): the
        // helper now builds the tree in `permissive` engine behavior to
        // avoid AN-3 destroying the transient 0-child OR between the wrap
        // and the children-append. The resulting tree is unbuffered
        // (`IMPLIES(OR(s_a, s_b), Q)`) — Structural-valid in core 1.0 but
        // P-1-noncompliant (Presentable rule). Callers that need the
        // canonical formula-buffered shape run `engine.normalize()` after
        // the helper, captured in a separate test below.
        const engine = setupEngineWithClaims(["claim-q", "src-a", "src-b"])
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })

        const { changes } = populateDerivationFromCitations(
            engine,
            premise.id,
            ["src-a", "src-b"]
        )

        const operatorAdds = (changes.expressions?.added ?? []).filter(
            (e) => e.type === "operator"
        )
        expect(operatorAdds.map((e) => e.operator).sort()).toEqual([
            "implies",
            "or",
        ])

        // No formula buffer in the changeset — the helper builds in
        // permissive behavior so AN-1 doesn't fire.
        const formulaAdds = (changes.expressions?.added ?? []).filter(
            (e) => e.type === "formula"
        )
        expect(formulaAdds).toHaveLength(0)

        // Two citation_var children of OR.
        const variableAdds = (changes.expressions?.added ?? []).filter(
            (e) => e.type === "variable"
        )
        expect(variableAdds).toHaveLength(2)

        // Inspect the antecedent directly (no formula buffer to skip past).
        const pm = engine.getPremise(premise.id)!
        const rootId = pm.getRootExpressionId()!
        const rootChildren = pm
            .getChildExpressions(rootId)
            .sort((a, b) => a.position - b.position)
        const antecedent = rootChildren[0]
        expect(antecedent.type).toBe("operator")
        if (antecedent.type === "operator") {
            expect(antecedent.operator).toBe("or")
        }
        const orChildren = pm
            .getChildExpressions(antecedent.id)
            .sort((a, b) => a.position - b.position)
        expect(orChildren).toHaveLength(2)

        // First child should be bound to a variable for src-a, second for src-b.
        const firstVarId =
            orChildren[0].type === "variable" ? orChildren[0].variableId : null
        const secondVarId =
            orChildren[1].type === "variable" ? orChildren[1].variableId : null
        const firstVar = firstVarId ? engine.getVariable(firstVarId) : undefined
        const secondVar = secondVarId
            ? engine.getVariable(secondVarId)
            : undefined
        expect(firstVar && "claimId" in firstVar && firstVar.claimId).toBe(
            "src-a"
        )
        expect(secondVar && "claimId" in secondVar && secondVar.claimId).toBe(
            "src-b"
        )
    })

    test("after engine.normalize(), the n≥2 shape materializes the formula buffer (P-1 invariant)", () => {
        // Explicit n=2 lock for the post-normalize() canonical shape. The
        // helper produces `IMPLIES(OR(...), Q)` (P-1-noncompliant);
        // `engine.normalize()` runs the AN rule set and AN-1 inserts the
        // formula buffer between IMPLIES and OR, producing the canonical
        // `IMPLIES(formula(OR(...)), Q)` shape.
        const engine = setupEngineWithClaims(["claim-q", "src-a", "src-b"])
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })

        populateDerivationFromCitations(engine, premise.id, ["src-a", "src-b"])
        engine.normalize()

        const pm = engine.getPremise(premise.id)!
        const rootId = pm.getRootExpressionId()!
        const root = pm.getExpression(rootId)!
        expect(root.type).toBe("operator")
        if (root.type === "operator") expect(root.operator).toBe("implies")

        const rootChildren = pm
            .getChildExpressions(rootId)
            .sort((a, b) => a.position - b.position)
        const antecedent = rootChildren[0]
        expect(antecedent.type).toBe("formula")
        expect(antecedent.parentId).toBe(rootId)

        const formulaChildren = pm.getChildExpressions(antecedent.id)
        expect(formulaChildren).toHaveLength(1)
        const orNode = formulaChildren[0]
        expect(orNode.type).toBe("operator")
        if (orNode.type === "operator") expect(orNode.operator).toBe("or")
        expect(orNode.parentId).toBe(antecedent.id)
    })

    test("with empty supportingClaimIds is a no-op", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        const { premise } = createNakedDerivationPremise(engine, "claim-q")
        const { changes } = populateDerivationFromCitations(
            engine,
            premise.id,
            []
        )
        expect(changes.expressions).toBeUndefined()
        expect(changes.variables).toBeUndefined()
        expect(changes.premises).toBeUndefined()
    })

    test("on a populated premise throws DERIVATION_ANTECEDENT_NON_EMPTY", () => {
        const engine = setupEngineWithClaims(["claim-q", "src-a"])
        const { premise } = createNakedDerivationPremise(engine, "claim-q")
        populateDerivationFromCitations(engine, premise.id, ["src-a"])
        expect(() =>
            populateDerivationFromCitations(engine, premise.id, ["src-a"])
        ).toThrowError(/DERIVATION_ANTECEDENT_NON_EMPTY/)
    })

    test("on a non-derivation premise throws DERIVATION_TYPE_MISMATCH", () => {
        const engine = setupEngineWithClaims([])
        const premiseId = crypto.randomUUID()
        mutateCreatePremise(engine, premiseId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            title: null,
            role: "supporting",
        })
        expect(() =>
            populateDerivationFromCitations(engine, premiseId, ["src-a"])
        ).toThrowError(/DERIVATION_TYPE_MISMATCH/)
    })

    test("clearDerivationAntecedent on a non-derivation premise throws DERIVATION_TYPE_MISMATCH", () => {
        const engine = setupEngineWithClaims([])
        const premiseId = crypto.randomUUID()
        mutateCreatePremise(engine, premiseId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            title: null,
            role: "supporting",
        })
        expect(() => clearDerivationAntecedent(engine, premiseId)).toThrowError(
            /DERIVATION_TYPE_MISMATCH/
        )
    })
})

// ──── populateDerivationFromAxiom ──────────────────────────────────────────

/**
 * Mint a minimal axiomatic claim. Mirrors `mkTestClaim` shape but with the
 * required `type: 'axiomatic'`, `axiom: TAxiomKind`, and the
 * `title`/`body`/etc. fields nulled out per `AxiomaticClaimSchema`.
 */
function mkAxiomaticClaim(
    id: string,
    axiom: TAxiomKind = "logical-principle",
    overrides?: Partial<TAxiomaticClaim>
): TAxiomaticClaim {
    return {
        id,
        argumentId: ARG_ID,
        version: ARG_VERSION,
        creatorId: USER_ID,
        createdOn: new Date("2026-01-01"),
        digest: `axiom-digest-${id}`,
        type: "axiomatic",
        kind: null,
        title: null,
        body: null,
        titleContentHash: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom,
        parentId: null,
        claimForkId: null,
        ...overrides,
    } as TAxiomaticClaim
}

describe("populateDerivationFromAxiom", () => {
    test("on a naked premise builds IMPLIES(axiom_var, Q) with the axiom as antecedent", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        const axiomaticClaim = mkAxiomaticClaim("ax-1")
        engine.setClaim(axiomaticClaim)
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })

        const { changes } = populateDerivationFromAxiom(
            engine,
            premise.id,
            axiomaticClaim
        )

        // Root expression is IMPLIES with the axiom-bound variable as
        // antecedent (position 0) and the consequent variable Q at
        // position 1.
        const pm = engine.getPremise(premise.id)!
        const rootId = pm.getRootExpressionId()!
        const root = pm.getExpression(rootId)!
        expect(root.type).toBe("operator")
        if (root.type === "operator") {
            expect(root.operator).toBe("implies")
        }

        const rootChildren = pm
            .getChildExpressions(rootId)
            .sort((a, b) => a.position - b.position)
        expect(rootChildren).toHaveLength(2)

        const antecedent = rootChildren[0]
        expect(antecedent.type).toBe("variable")
        const consequent = rootChildren[1]
        expect(consequent.id).toBe("e-q")
        expect(consequent.type).toBe("variable")

        // The antecedent variable resolves to the axiomatic claim.
        const antecedentVarId =
            antecedent.type === "variable" ? antecedent.variableId : null
        expect(antecedentVarId).not.toBeNull()
        const antecedentVar = engine.getVariable(antecedentVarId!)
        expect(antecedentVar && "claimId" in antecedentVar).toBe(true)
        if (antecedentVar && "claimId" in antecedentVar) {
            expect(antecedentVar.claimId).toBe("ax-1")
        }

        // Changeset reflects the new axiom-bound variable being added and the
        // wrap-introduced IMPLIES operator plus the axiom variable expression.
        const variableAdds = changes.variables?.added ?? []
        const axiomBoundAdds = variableAdds.filter(
            (v) => "claimId" in v && v.claimId === "ax-1"
        )
        expect(axiomBoundAdds).toHaveLength(1)

        const operatorAdds = (changes.expressions?.added ?? []).filter(
            (e) => e.type === "operator"
        )
        expect(operatorAdds.map((e) => e.operator).sort()).toEqual(["implies"])
    })

    test("snapshot/rollback round-trip after axiom population loads without invariant violations", () => {
        const engine = setupEngineWithClaims(["claim-q"])
        const axiomaticClaim = mkAxiomaticClaim(
            "ax-1",
            "mathematical-principle"
        )
        engine.setClaim(axiomaticClaim)
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromAxiom(engine, "p-1", axiomaticClaim)

        const snapshot = engine.snapshot()
        const restored = setupEngineWithClaims(["claim-q"])
        restored.setClaim(axiomaticClaim)
        expect(() => restored.rollback(snapshot)).not.toThrow()
        const restoredPm = restored.getPremise("p-1")!
        const restoredRoot = restoredPm.getExpression(
            restoredPm.getRootExpressionId()!
        )!
        expect(restoredRoot.type).toBe("operator")
        if (restoredRoot.type === "operator") {
            expect(restoredRoot.operator).toBe("implies")
        }
    })

    test("replaces a citation-backed antecedent (clear-then-populate composition)", () => {
        const engine = setupEngineWithClaims(["claim-q", "src-a"])
        const axiomaticClaim = mkAxiomaticClaim("ax-1")
        engine.setClaim(axiomaticClaim)
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        // Populate with a citation first so the antecedent is non-empty.
        populateDerivationFromCitations(engine, premise.id, ["src-a"])

        const { changes } = populateDerivationFromAxiom(
            engine,
            premise.id,
            axiomaticClaim
        )

        // Expected: the citation-bound variable for src-a is removed (cleared
        // by the helper's internal clearDerivationAntecedent call), and the
        // axiom-bound variable for ax-1 is added.
        const variableAdds = changes.variables?.added ?? []
        const variableRemoves = changes.variables?.removed ?? []
        const axiomBoundAdds = variableAdds.filter(
            (v) => "claimId" in v && v.claimId === "ax-1"
        )
        expect(axiomBoundAdds).toHaveLength(1)
        const citationBoundRemoves = variableRemoves.filter(
            (v) => "claimId" in v && v.claimId === "src-a"
        )
        expect(citationBoundRemoves).toHaveLength(1)

        // Final engine state: the antecedent resolves to ax-1, not src-a.
        const pm = engine.getPremise(premise.id)!
        const rootId = pm.getRootExpressionId()!
        const rootChildren = pm
            .getChildExpressions(rootId)
            .sort((a, b) => a.position - b.position)
        const antecedent = rootChildren[0]
        expect(antecedent.type).toBe("variable")
        if (antecedent.type === "variable" && antecedent.variableId) {
            const v = engine.getVariable(antecedent.variableId)
            expect(v && "claimId" in v && v.claimId).toBe("ax-1")
        }
    })

    test("idempotent — re-applying the same axiom to a premise already bound to it is a no-op", () => {
        // The spec calls this idempotent: calling on a derivation premise
        // already carrying the same axiomatic claim is a no-op (empty
        // changeset). The implementation short-circuits when the existing
        // antecedent is a single variable expression bound to a variable
        // whose claimId === axiomaticClaim.id.
        const engine = setupEngineWithClaims(["claim-q"])
        const axiomaticClaim = mkAxiomaticClaim("ax-1")
        engine.setClaim(axiomaticClaim)
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromAxiom(engine, premise.id, axiomaticClaim)

        const checksumBefore = engine.combinedChecksum()
        const { changes } = populateDerivationFromAxiom(
            engine,
            premise.id,
            axiomaticClaim
        )
        const checksumAfter = engine.combinedChecksum()

        // No-op contract: empty changeset and unchanged engine checksum.
        expect(changes.expressions).toBeUndefined()
        expect(changes.variables).toBeUndefined()
        expect(changes.premises).toBeUndefined()
        expect(checksumAfter).toBe(checksumBefore)
    })

    test("replacing one axiom with a different axiom triggers the full clear-and-re-add cycle", () => {
        // Distinct from the idempotency case above — when the existing
        // antecedent is bound to a *different* axiom, the helper must
        // clear-then-populate (non-empty changeset).
        const engine = setupEngineWithClaims(["claim-q"])
        const axiom1 = mkAxiomaticClaim("ax-1", "logical-principle")
        const axiom2 = mkAxiomaticClaim("ax-2", "mathematical-principle")
        engine.setClaim(axiom1)
        engine.setClaim(axiom2)
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromAxiom(engine, premise.id, axiom1)

        const { changes } = populateDerivationFromAxiom(
            engine,
            premise.id,
            axiom2
        )

        // ax-1's bound variable should be removed; ax-2's added.
        const variableAdds = changes.variables?.added ?? []
        const variableRemoves = changes.variables?.removed ?? []
        expect(
            variableAdds.some((v) => "claimId" in v && v.claimId === "ax-2")
        ).toBe(true)
        expect(
            variableRemoves.some((v) => "claimId" in v && v.claimId === "ax-1")
        ).toBe(true)
    })

    test("on a non-derivation premise throws DERIVATION_TYPE_MISMATCH", () => {
        const engine = setupEngineWithClaims([])
        const axiomaticClaim = mkAxiomaticClaim("ax-1")
        engine.setClaim(axiomaticClaim)
        const premiseId = crypto.randomUUID()
        mutateCreatePremise(engine, premiseId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: USER_ID,
            createdOn: new Date(),
            title: null,
            role: "supporting",
        })
        expect(() =>
            populateDerivationFromAxiom(engine, premiseId, axiomaticClaim)
        ).toThrowError(/DERIVATION_TYPE_MISMATCH/)
    })

    test("on a missing premise throws a clear error", () => {
        const engine = setupEngineWithClaims([])
        const axiomaticClaim = mkAxiomaticClaim("ax-1")
        engine.setClaim(axiomaticClaim)
        expect(() =>
            populateDerivationFromAxiom(
                engine,
                "nonexistent-premise-id",
                axiomaticClaim
            )
        ).toThrowError(/not found/i)
    })

    test("rejects a non-axiomatic claim — argument type contract", () => {
        // The signature locks `axiomaticClaim: TAxiomaticClaim`; at the
        // runtime boundary the helper rejects a claim whose `type` is not
        // `'axiomatic'` so a mis-typed `as TAxiomaticClaim` cast surfaces
        // a clear error rather than silently wiring the wrong claim in.
        const engine = setupEngineWithClaims(["claim-q"])
        const nonAxiom = mkTestClaim({ id: "not-an-axiom", type: "normal" })
        engine.setClaim(nonAxiom)
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        expect(() =>
            populateDerivationFromAxiom(
                engine,
                "p-1",
                nonAxiom as unknown as TAxiomaticClaim
            )
        ).toThrowError(/axiomatic/i)
    })
})

describe("fromServerData with wave-2 derivation premises", () => {
    // The canonical wave-2 antecedent shape is `IMPLIES(formula(OR(c1, c2)), Q)`
    // — the formula buffer between IMPLIES and OR is what the P-1 Presentable
    // rule requires (`enforceFormulaBetweenOperators` in pre-1.0 terms).
    // Pre-v0.7.0 of this package, `populateDerivationFromCitations` produced
    // an unbuffered `IMPLIES(OR(c1, c2), Q)` shape via a permissive-grammar
    // bypass; that shape still appears in older stored snapshots.
    //
    // Core 1.0 makes the back-compat shim unnecessary at the engine level:
    // P-1 is a Presentable rule, not Structural, so `fromSnapshot` accepts
    // either shape without configuration. The unbuffered shape surfaces as
    // a `validate('presentable')` violation that consumers can choose to
    // render or auto-normalize. This describe block still exercises both
    // shapes through `fromServerData` to lock in the load-time tolerance.

    const claimIds = ["claim-q", "src-a", "src-b"]

    function buildWave2Snapshot() {
        const engine = setupEngineWithClaims(claimIds)
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromCitations(engine, "p-1", ["src-a", "src-b"])
        // The shared helper builds in `permissive` to avoid AN-3 destroying
        // the transient 0-child OR. Materialize the canonical
        // `IMPLIES(formula(OR(c1, c2)), Q)` Presentable shape by running the
        // global AN pass before snapshotting.
        engine.normalize()
        return engine.snapshot()
    }

    /**
     * Builds a pre-v0.7.0 shape-A snapshot — `IMPLIES(OR(c1, c2), Q)` with no
     * formula buffer between IMPLIES and OR. Used to verify that core 1.0's
     * unconditional snapshot loader (no LOADING_GRAMMAR shim — that split was
     * removed) accepts unmigrated rows.
     */
    function buildLegacyUnbufferedSnapshot() {
        const engine = setupEngineWithClaims(claimIds)
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        const pm = engine.getPremise("p-1")!
        const consequentExpr = pm.getExpression(pm.getRootExpressionId()!)!
        if (consequentExpr.type !== "variable") {
            throw new Error("expected naked-Q consequent to be a variable")
        }

        const varA = engine.ensureClaimBoundVariable("src-a")
        const varB = engine.ensureClaimBoundVariable("src-b")

        const sharedMeta = {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            premiseId: "p-1",
            creatorId: USER_ID,
            createdOn: new Date(),
        }

        // Build in permissive behavior so the AN-1 post-hook doesn't insert
        // a formula buffer between IMPLIES and OR (the pre-1.0 way of
        // expressing this in the legacy `grammarConfig` model was
        // `enforceFormulaBetweenOperators: false`). Flip back to assistive
        // for snapshot — the snapshot itself doesn't carry behavior; the
        // resulting structure is what we want to preserve.
        engine.setBehavior("permissive")
        const impliesId = crypto.randomUUID()
        const orId = crypto.randomUUID()
        pm.wrapExpression(
            {
                id: impliesId,
                ...sharedMeta,
                parentId: null,
                type: "operator" as const,
                operator: "implies" as const,
                variableId: null,
            },
            {
                id: orId,
                ...sharedMeta,
                parentId: null,
                type: "operator" as const,
                operator: "or" as const,
                variableId: null,
            },
            undefined,
            consequentExpr.id
        )
        pm.appendExpression(orId, {
            id: crypto.randomUUID(),
            ...sharedMeta,
            parentId: orId,
            type: "variable" as const,
            variableId: varA.id,
            operator: null,
        })
        pm.appendExpression(orId, {
            id: crypto.randomUUID(),
            ...sharedMeta,
            parentId: orId,
            type: "variable" as const,
            variableId: varB.id,
            operator: null,
        })
        engine.setBehavior("assistive")

        return engine.snapshot()
    }

    test("loads a wave-2 snapshot in canonical formula-buffered shape without throwing", () => {
        const snapshot = buildWave2Snapshot()
        const claims = claimIds.map((id) => mkTestClaim({ id }))

        expect(() =>
            PropositArgumentEngine.fromServerData(snapshot, claims, [])
        ).not.toThrow()
    })

    test("loads a legacy pre-v0.7.0 snapshot containing IMPLIES(OR(c1, c2), Q) (P-1-noncompliant)", () => {
        // Negative control for the canonicalization story: even after shared
        // produces only the formula-buffered shape, `fromServerData` must
        // keep accepting the unbuffered shape so unmigrated rows still load.
        // In core 1.0 this is automatic — P-1 is a Presentable rule, not a
        // Structural one, so the load itself succeeds; consumers can query
        // `engine.validate('presentable')` to see the P-1 violation if they
        // want to surface or auto-normalize.
        const snapshot = buildLegacyUnbufferedSnapshot()
        const claims = claimIds.map((id) => mkTestClaim({ id }))

        expect(() =>
            PropositArgumentEngine.fromServerData(snapshot, claims, [])
        ).not.toThrow()
    })

    test("round-trips the IMPLIES(formula(OR(c1, c2)), Q) shape", () => {
        const snapshot = buildWave2Snapshot()
        const claims = claimIds.map((id) => mkTestClaim({ id }))

        const restored = PropositArgumentEngine.fromServerData(
            snapshot,
            claims,
            []
        )

        const pm = restored.getPremise("p-1")!
        const rootId = pm.getRootExpressionId()!
        const root = pm.getExpression(rootId)!
        expect(root.type).toBe("operator")
        if (root.type === "operator") expect(root.operator).toBe("implies")

        const rootChildren = pm
            .getChildExpressions(rootId)
            .sort((a, b) => a.position - b.position)
        const antecedent = rootChildren[0]
        expect(antecedent.type).toBe("formula")

        const formulaChildren = pm.getChildExpressions(antecedent.id)
        expect(formulaChildren).toHaveLength(1)
        const orNode = formulaChildren[0]
        expect(orNode.type).toBe("operator")
        if (orNode.type === "operator") expect(orNode.operator).toBe("or")

        const orChildren = pm.getChildExpressions(orNode.id)
        expect(orChildren).toHaveLength(2)
        for (const child of orChildren) {
            expect(child.type).toBe("variable")
        }
    })

    test("the canonical IMPLIES(formula(OR), Q) shape is a normalize() fixed point", () => {
        // Locks in the fixed-point claim: the formula-buffered shape is the
        // canonical output of normalization, so calling `normalize()` on a
        // freshly-loaded snapshot must not change its checksum. This is the
        // shared-side mirror of proposit-core's v0.11.2 fixed-point
        // regression test (carried forward into 1.0's AN post-hook +
        // `normalize(tier?)` global pass) — both libraries' construction
        // paths must converge here.
        //
        // Pre-1.0 this test compared two loads with different load-time
        // grammarConfig flags (one with `autoNormalize: false`, one with
        // `autoNormalize: true`). Core 1.0 dropped both flags — snapshot
        // loading is unconditional, and the equivalent of "run auto-normalize"
        // is an explicit `engine.normalize()` call. The rewritten assertion
        // captures the same property: the canonical shape is its own AN-rule
        // fixed point.
        const snapshot = buildWave2Snapshot()
        const claimLookup = createClaimLookup(
            claimIds.map((id) => mkTestClaim({ id }))
        )

        const loaded = ArgumentEngine.fromSnapshot(snapshot, claimLookup)
        const beforeChecksum = loaded.combinedChecksum()
        loaded.normalize()
        const afterChecksum = loaded.combinedChecksum()

        expect(afterChecksum).toBe(beforeChecksum)
    })

    test("after load, the engine inherits the default assistive behavior so subsequent mutations preserve P-1", () => {
        // Pre-1.0 this test verified that `fromServerData` re-tightened each
        // premise's `expressions.config.grammarConfig` to STRICT after the
        // permissive-grammar load window. Core 1.0 dropped the per-premise
        // `grammarConfig` knob entirely — engine behavior is a single
        // top-level `'assistive' | 'permissive'` setting on the engine,
        // defaulted to `'assistive'` for fresh engines and for engines
        // restored via `fromSnapshot` / `fromServerData` without an explicit
        // override (per spec §11, fork-threading + fromSnapshot
        // default-behavior regression test).
        //
        // The new assertion captures the equivalent post-load property:
        // after `fromServerData`, the engine's behavior is `'assistive'`,
        // so the AN post-hook will fire on subsequent mutations and keep
        // the argument at the P-1 (formula-buffer) Presentable invariant.
        const snapshot = buildWave2Snapshot()
        const claims = claimIds.map((id) => mkTestClaim({ id }))

        const restored = PropositArgumentEngine.fromServerData(
            snapshot,
            claims,
            []
        )
        expect(restored.behavior).toBe("assistive")
    })

    test("pre-wave-2 grammar-compliant snapshot still loads identically", () => {
        // Regression guard: ensure relaxing grammar at load doesn't change the
        // outcome for snapshots that were already grammar-compliant.
        const engine = setupEngineWithClaims(["claim-q", "src-a"])
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromCitations(engine, "p-1", ["src-a"]) // n=1 → IMPLIES(citvar, Q)

        const snapshot = engine.snapshot()
        const claims = ["claim-q", "src-a"].map((id) => mkTestClaim({ id }))

        const restored = PropositArgumentEngine.fromServerData(
            snapshot,
            claims,
            []
        )
        const pm = restored.getPremise("p-1")!
        const rootId = pm.getRootExpressionId()!
        const root = pm.getExpression(rootId)!
        expect(root.type).toBe("operator")
        if (root.type === "operator") expect(root.operator).toBe("implies")
    })
})
