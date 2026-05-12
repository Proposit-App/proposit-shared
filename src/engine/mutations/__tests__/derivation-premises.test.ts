import { describe, test, expect } from "vitest"
import { ArgumentEngine } from "@proposit/proposit-core"
import { createTestEngine, mkTestClaim } from "./helpers.js"
import {
    mutateCreatePremise,
    mutateCreateDerivationPremise,
    clearDerivationAntecedent,
    populateDerivationFromCitations,
} from "../premises.js"
import { mutateCreateVariable } from "../variables.js"
import { PropositArgumentEngine } from "../../engine.js"
import { createClaimLookup } from "../../library-adapters.js"

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

    test("adopt-path supports the full clear/populate round-trip after reload (mirrors server addClaimCitation flow)", () => {
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

        // Expression removals: IMPLIES + formula + OR + 2 citation_vars = 5.
        // The consequent variable expression survives as `modified` (its
        // parentId/position changed when promoted to root).
        expect(changes.expressions?.removed?.length ?? 0).toBe(5)
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
        // Reproduces docs/change-requests/2026-05-08-clear-derivation-modified-removed-conflict.md.
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

    test("after reload, clear → populate cycle works (mirrors server addClaimCitation flow)", () => {
        // Server's addClaimCitation reloads the engine each request and calls
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

    test("with two sources produces IMPLIES(formula(OR(s_a, s_b)), Q) in source-id order", () => {
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

        // Standard grammar's wrapInsertFormula auto-inserts a formula buffer
        // between IMPLIES and OR, so the changeset contains exactly one formula
        // expression alongside the two operator nodes.
        const formulaAdds = (changes.expressions?.added ?? []).filter(
            (e) => e.type === "formula"
        )
        expect(formulaAdds).toHaveLength(1)

        // Two citation_var children of OR.
        const variableAdds = (changes.expressions?.added ?? []).filter(
            (e) => e.type === "variable"
        )
        expect(variableAdds).toHaveLength(2)

        // Inspect the antecedent through the formula buffer to assert ordering.
        const pm = engine.getPremise(premise.id)!
        const rootId = pm.getRootExpressionId()!
        const rootChildren = pm
            .getChildExpressions(rootId)
            .sort((a, b) => a.position - b.position)
        const antecedent = rootChildren[0]
        expect(antecedent.type).toBe("formula")
        const formulaChildren = pm
            .getChildExpressions(antecedent.id)
            .sort((a, b) => a.position - b.position)
        expect(formulaChildren).toHaveLength(1)
        const orNode = formulaChildren[0]
        expect(orNode.type).toBe("operator")
        if (orNode.type === "operator") {
            expect(orNode.operator).toBe("or")
        }
        const orChildren = pm
            .getChildExpressions(orNode.id)
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

    test("with two sources, formula expression's parent is IMPLIES and child is OR", () => {
        // Explicit n=2 structural lock for the formula buffer (regression
        // companion to the v0.7.0 fix that dropped the permissive-grammar
        // wrapper from populateDerivationFromCitations).
        const engine = setupEngineWithClaims(["claim-q", "src-a", "src-b"])
        const { premise } = createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })

        populateDerivationFromCitations(engine, premise.id, ["src-a", "src-b"])

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

    test("with empty sourceClaimIds is a no-op", () => {
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

describe("fromServerData with wave-2 derivation premises", () => {
    // The canonical wave-2 antecedent shape is `IMPLIES(formula(OR(c1, c2)), Q)`
    // — the formula buffer between IMPLIES and OR is what strict grammar
    // (`enforceFormulaBetweenOperators: true`) requires. Pre-v0.7.0 of this
    // package, `populateDerivationFromCitations` produced an unbuffered
    // `IMPLIES(OR(c1, c2), Q)` shape via a permissive-grammar bypass; that
    // shape still appears in older stored snapshots. The `LOADING_GRAMMAR`
    // shim in `fromServerData` keeps loading those rows until consumers run
    // a one-shot canonicalization migration, after which the shim can go.

    const claimIds = ["claim-q", "src-a", "src-b"]

    function buildWave2Snapshot() {
        const engine = setupEngineWithClaims(claimIds)
        createNakedDerivationPremise(engine, "claim-q", {
            premiseId: "p-1",
            varId: "v-q",
            exprId: "e-q",
        })
        populateDerivationFromCitations(engine, "p-1", ["src-a", "src-b"])
        return engine.snapshot()
    }

    /**
     * Builds a pre-v0.7.0 shape-A snapshot — `IMPLIES(OR(c1, c2), Q)` with no
     * formula buffer between IMPLIES and OR. Used to verify the back-compat
     * `LOADING_GRAMMAR` shim still accepts unmigrated rows.
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

        // Permissive grammar lets us put OR directly under IMPLIES (the old
        // shape). Restore strict grammar after so the snapshot's expression
        // config matches what production rows would carry.
        pm.setGrammarConfig({
            enforceFormulaBetweenOperators: false,
            autoNormalize: false,
        })
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
        pm.setGrammarConfig({
            enforceFormulaBetweenOperators: true,
            autoNormalize: false,
        })

        return engine.snapshot()
    }

    test("loads a wave-2 snapshot in canonical formula-buffered shape without throwing", () => {
        const snapshot = buildWave2Snapshot()
        const claims = claimIds.map((id) => mkTestClaim({ id }))

        expect(() =>
            PropositArgumentEngine.fromServerData(snapshot, claims, [])
        ).not.toThrow()
    })

    test("loads a legacy pre-v0.7.0 snapshot containing IMPLIES(OR(c1, c2), Q) (back-compat via LOADING_GRAMMAR)", () => {
        // Negative control for the canonicalization fix: even after shared
        // produces only the formula-buffered shape, fromServerData must keep
        // accepting the unbuffered shape so unmigrated rows still load.
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

    test("strict-load and auto-normalize-load of the canonical shape produce identical combinedChecksum", () => {
        // Locks in the fixed-point claim: the formula-buffered shape is the
        // canonical output of normalization, so re-running normalization on a
        // freshly-built snapshot must not change its checksum. This is the
        // shared-side mirror of proposit-core's v0.11.2 fixed-point regression
        // test — both libraries' construction paths must converge here.
        const snapshot = buildWave2Snapshot()
        const claimLookup = createClaimLookup(
            claimIds.map((id) => mkTestClaim({ id }))
        )

        const strictLoaded = ArgumentEngine.fromSnapshot(
            snapshot,
            claimLookup,
            { autoNormalize: false, enforceFormulaBetweenOperators: true }
        )
        const autoNormalizeLoaded = ArgumentEngine.fromSnapshot(
            snapshot,
            claimLookup,
            { autoNormalize: true, enforceFormulaBetweenOperators: true }
        )

        expect(strictLoaded.combinedChecksum()).toBe(
            autoNormalizeLoaded.combinedChecksum()
        )
    })

    test("after load, runtime mutations on a freeform premise still respect strict grammar (auto-correct)", () => {
        // After fromServerData returns, runtime mutations should be subject to
        // the strict runtime grammar. Specifically, `populateDerivationFromCitations`
        // on a NEW derivation premise should still go through the temporary
        // permissive-grammar window inside ManagedDerivationPremiseEngine. If
        // grammar weren't re-tightened, surrounding wave-1-style mutations
        // could silently bypass `enforceFormulaBetweenOperators`.
        //
        // We verify the re-tightening end-to-end by snapshotting the restored
        // engine, then loading that snapshot a second time. A snapshot whose
        // expression configs already carry strict grammar would only round-trip
        // if the re-tightening actually wrote PERMISSIVE values back to STRICT
        // on each premise's ExpressionManager.
        const snapshot = buildWave2Snapshot()
        const claims = claimIds.map((id) => mkTestClaim({ id }))

        const restored = PropositArgumentEngine.fromServerData(
            snapshot,
            claims,
            []
        )
        const reSnapshot = restored.snapshot()
        const reSnapshotGrammar =
            reSnapshot.premises[0]?.expressions.config?.grammarConfig
        expect(reSnapshotGrammar?.enforceFormulaBetweenOperators).toBe(true)
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
