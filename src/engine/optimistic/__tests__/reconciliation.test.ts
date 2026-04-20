import { describe, test, expect } from "vitest"
import {
    createTestEngine,
    mkTestClaim,
} from "../../mutations/__tests__/helpers.js"
import { mutateCreatePremise } from "../../mutations/premises.js"
import { mutateCreateVariable } from "../../mutations/variables.js"
import { mutateCreateExpression } from "../../mutations/expressions.js"
import {
    reconcileCreatedPremise,
    reconcileCreatedVariable,
    reconcileCreatedExpression,
} from "../reconciliation.js"
import type { TProjectSnapshot } from "../../engine.js"
import type {
    TPropositionalPremise,
    TPropositionalVariable,
} from "../../../schemas/logic.js"

const CREATOR_ID = "test-user-id"
const CREATED_ON = new Date("2026-01-01")
const ARG_ID = "test-arg-id"
const ARG_VERSION = 1

describe("reconcileCreatedPremise", () => {
    test("swaps temp ID with real ID", () => {
        const engine = createTestEngine()
        const tempId = "temp-premise-id"

        mutateCreatePremise(engine, tempId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            title: "Supporting premise",
            role: "supporting",
        })

        expect(engine.hasPremise(tempId)).toBe(true)

        // Get actual premise data and create a server premise with a real ID
        const pm = engine.getPremise(tempId)!
        const realId = crypto.randomUUID()
        const serverPremise: TPropositionalPremise = {
            ...pm.toPremiseData(),
            id: realId,
        }

        reconcileCreatedPremise(engine, tempId, serverPremise)

        expect(engine.hasPremise(tempId)).toBe(false)
        expect(engine.hasPremise(realId)).toBe(true)
    })

    test("updates conclusionPremiseId when swapping a conclusion premise", () => {
        const engine = createTestEngine()
        const tempId = "temp-conclusion-id"

        mutateCreatePremise(engine, tempId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            title: "Conclusion",
            role: "conclusion",
        })

        expect(engine.getConclusionPremise()?.getId()).toBe(tempId)

        const pm = engine.getPremise(tempId)!
        const realId = crypto.randomUUID()
        const serverPremise: TPropositionalPremise = {
            ...pm.toPremiseData(),
            id: realId,
        }

        reconcileCreatedPremise(engine, tempId, serverPremise)

        expect(engine.hasPremise(tempId)).toBe(false)
        expect(engine.hasPremise(realId)).toBe(true)
        expect(engine.getConclusionPremise()?.getId()).toBe(realId)
    })

    test("swaps auto-created variable ID when serverVariable is provided", () => {
        const engine = createTestEngine()
        const tempPremiseId = "temp-premise-id"

        const { changes } = mutateCreatePremise(engine, tempPremiseId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            title: "Supporting premise",
            role: "supporting",
        })

        // The auto-created variable has a temp UUID from proposit-core
        const tempVarId = changes.variables?.added?.[0]?.id
        expect(tempVarId).toBeDefined()
        expect(engine.hasVariable(tempVarId!)).toBe(true)

        const pm = engine.getPremise(tempPremiseId)!
        const realPremiseId = crypto.randomUUID()
        const serverPremise: TPropositionalPremise = {
            ...pm.toPremiseData(),
            id: realPremiseId,
        }

        const tempVar = engine.getVariable(tempVarId!)!
        const realVarId = crypto.randomUUID()
        const serverVariable: TPropositionalVariable = {
            ...tempVar,
            id: realVarId,
            boundPremiseId: realPremiseId,
        } as TPropositionalVariable

        reconcileCreatedPremise(
            engine,
            tempPremiseId,
            serverPremise,
            serverVariable
        )

        // Premise ID swapped
        expect(engine.hasPremise(tempPremiseId)).toBe(false)
        expect(engine.hasPremise(realPremiseId)).toBe(true)

        // Variable ID swapped
        expect(engine.hasVariable(tempVarId!)).toBe(false)
        expect(engine.hasVariable(realVarId)).toBe(true)

        // Variable's boundPremiseId updated
        const reconciledVar = engine.getVariable(realVarId)!
        const reconciledVarAny = reconciledVar as { boundPremiseId?: string }
        expect(reconciledVarAny.boundPremiseId).toBe(realPremiseId)
    })

    test("only fixes boundPremiseId when serverVariable is not provided", () => {
        const engine = createTestEngine()
        const tempPremiseId = "temp-premise-id"

        const { changes } = mutateCreatePremise(engine, tempPremiseId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            title: "Supporting premise",
            role: "supporting",
        })

        const tempVarId = changes.variables?.added?.[0]?.id
        expect(tempVarId).toBeDefined()

        const pm = engine.getPremise(tempPremiseId)!
        const realPremiseId = crypto.randomUUID()
        const serverPremise: TPropositionalPremise = {
            ...pm.toPremiseData(),
            id: realPremiseId,
        }

        // No serverVariable passed
        reconcileCreatedPremise(engine, tempPremiseId, serverPremise)

        // Premise ID swapped
        expect(engine.hasPremise(realPremiseId)).toBe(true)

        // Variable still has its original temp ID
        expect(engine.hasVariable(tempVarId!)).toBe(true)

        // Variable's boundPremiseId updated to the real premise ID
        const v = engine.getVariable(tempVarId!) as { boundPremiseId?: string }
        expect(v.boundPremiseId).toBe(realPremiseId)
    })
})

describe("reconcileCreatedVariable", () => {
    test("swaps temp ID with real ID", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])

        const tempId = "temp-variable-id"
        mutateCreateVariable(engine, tempId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            claimId: "claim-1",
            claimVersion: 1,
            symbol: "P",
        })

        expect(engine.hasVariable(tempId)).toBe(true)

        const realId = crypto.randomUUID()
        const existingVar = engine.getVariable(tempId)!
        const serverVariable: TPropositionalVariable = {
            ...existingVar,
            id: realId,
        }

        reconcileCreatedVariable(engine, tempId, serverVariable)

        expect(engine.hasVariable(tempId)).toBe(false)
        expect(engine.hasVariable(realId)).toBe(true)
        expect(engine.getVariable(realId)?.symbol).toBe("P")
    })
})

describe("reconcileCreatedExpression", () => {
    test("swaps temp ID with real ID", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])

        const premiseId = crypto.randomUUID()
        mutateCreatePremise(engine, premiseId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            title: "P1",
            role: "supporting",
        })

        const varId = crypto.randomUUID()
        mutateCreateVariable(engine, varId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            claimId: "claim-1",
            claimVersion: 1,
            symbol: "A",
        })

        const tempExprId = "temp-expression-id"
        const { created } = mutateCreateExpression(engine, {
            premiseId,
            expressionId: tempExprId,
            parentId: null,
            type: "variable",
            variableId: varId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        expect(engine.hasExpression(tempExprId)).toBe(true)

        const realExprId = crypto.randomUUID()
        const serverExpression = {
            ...created,
            id: realExprId,
        }

        reconcileCreatedExpression(engine, tempExprId, serverExpression)

        // After reconciliation, the real ID should exist and temp ID should not
        const snap = engine.snapshot() as TProjectSnapshot
        const premiseEntry = snap.premises.find(
            (p) => p.premise.id === premiseId
        )
        expect(premiseEntry).toBeDefined()
        const exprIds = premiseEntry!.expressions.expressions.map((e) => e.id)
        expect(exprIds).not.toContain(tempExprId)
        expect(exprIds).toContain(realExprId)
    })
})
