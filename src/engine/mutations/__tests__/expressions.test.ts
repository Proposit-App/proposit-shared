import { describe, test, expect } from "vitest"
import { createTestEngine, mkTestClaim } from "./helpers.js"
import { mutateCreatePremise } from "../premises.js"
import {
    mutateCreateExpression,
    mutateUpdateExpression,
    mutateDeleteExpression,
    mutateToggleNegation,
    mutateChangeOperator,
    mutateAddSiblingExpression,
    mutateWrapExpression,
    mutateCreateExpressionWithOperator,
} from "../expressions.js"

const CREATOR_ID = "test-user-id"
const CREATED_ON = new Date("2026-01-01")
const ARG_ID = "test-arg-id"
const ARG_VERSION = 1

function makePremise(engine: ReturnType<typeof createTestEngine>) {
    const premiseId = crypto.randomUUID()
    mutateCreatePremise(engine, premiseId, {
        argumentId: ARG_ID,
        argumentVersion: ARG_VERSION,
        creatorId: CREATOR_ID,
        createdOn: CREATED_ON,
        title: "P1",
        role: "supporting",
    })
    return premiseId
}

describe("mutateCreateExpression", () => {
    test("creates a root variable expression via append (no parent, no relativeTo)", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])
        const premiseId = makePremise(engine)

        const variableId = crypto.randomUUID()
        engine.addVariable({
            id: variableId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        const expressionId = crypto.randomUUID()
        const result = mutateCreateExpression(engine, {
            premiseId,
            expressionId,
            parentId: null,
            type: "variable",
            variableId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        expect(result.created.id).toBe(expressionId)
        expect(result.created.type).toBe("variable")
        expect(result.changes.expressions?.added).toHaveLength(1)
        expect(result.shifted).toHaveLength(0)
    })

    test("creates an expression relative to a sibling", () => {
        const claimA = mkTestClaim({ id: "claim-1", version: 1 })
        const claimB = mkTestClaim({ id: "claim-2", version: 1 })
        const engine = createTestEngine(undefined, [claimA, claimB])
        const premiseId = makePremise(engine)

        const varIdA = crypto.randomUUID()
        const varIdB = crypto.randomUUID()
        engine.addVariable({
            id: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)
        engine.addVariable({
            id: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "B",
            claimId: "claim-2",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        // Create AND operator as root
        const operatorId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: operatorId,
            parentId: null,
            type: "operator",
            operator: "and",
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        // Create first child variable
        const childId1 = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: childId1,
            parentId: operatorId,
            type: "variable",
            variableId: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        // Create second child relative to first child (after)
        const childId2 = crypto.randomUUID()
        const result = mutateCreateExpression(engine, {
            premiseId,
            expressionId: childId2,
            parentId: operatorId,
            type: "variable",
            variableId: varIdB,
            relativeTo: { expressionId: childId1, direction: "after" },
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        expect(result.created.id).toBe(childId2)
        expect(result.created.type).toBe("variable")
        expect(result.changes.expressions?.added).toHaveLength(1)

        const pm = engine.getPremise(premiseId)!
        const children = pm.getChildExpressions(operatorId)
        expect(children).toHaveLength(2)
        const childIds = children.map((c) => c.id)
        expect(childIds).toContain(childId1)
        expect(childIds).toContain(childId2)
    })
})

describe("mutateUpdateExpression", () => {
    test("updates an expression's operator", () => {
        const engine = createTestEngine()
        const premiseId = makePremise(engine)

        // Create an AND operator root
        const operatorId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: operatorId,
            parentId: null,
            type: "operator",
            operator: "and",
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const result = mutateUpdateExpression(engine, operatorId, {
            operator: "or",
        })

        expect(result.expression.id).toBe(operatorId)
        expect((result.expression as { operator: string }).operator).toBe("or")
        expect(result.changes.expressions?.modified).toHaveLength(1)
    })

    test("throws when expression not found", () => {
        const engine = createTestEngine()
        expect(() =>
            mutateUpdateExpression(engine, "nonexistent", { position: 5 })
        ).toThrow()
    })
})

describe("mutateDeleteExpression", () => {
    test("deletes an expression", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])
        const premiseId = makePremise(engine)

        const varId = crypto.randomUUID()
        engine.addVariable({
            id: varId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        const expressionId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId,
            parentId: null,
            type: "variable",
            variableId: varId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const result = mutateDeleteExpression(engine, expressionId)

        expect(result.removed?.id).toBe(expressionId)
        expect(result.changes.expressions?.removed).toHaveLength(1)

        // Verify it's gone from the engine
        const pm = engine.getPremise(premiseId)!
        expect(pm.getExpression(expressionId)).toBeUndefined()
    })

    test("throws when expression not found", () => {
        const engine = createTestEngine()
        expect(() => mutateDeleteExpression(engine, "nonexistent")).toThrow()
    })
})

describe("mutateToggleNegation", () => {
    test("toggles negation on an expression", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])
        const premiseId = makePremise(engine)

        const varId = crypto.randomUUID()
        engine.addVariable({
            id: varId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        const expressionId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId,
            parentId: null,
            type: "variable",
            variableId: varId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const result = mutateToggleNegation(engine, expressionId, {
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        // toggleNegation wraps the variable in a NOT operator — changes should include expressions
        expect(result.changes).toBeDefined()
        expect(result.changes.expressions).toBeDefined()
    })

    test("throws when expression not found", () => {
        const engine = createTestEngine()
        expect(() =>
            mutateToggleNegation(engine, "nonexistent", {
                creatorId: CREATOR_ID,
                createdOn: CREATED_ON,
            })
        ).toThrow()
    })
})

describe("mutateChangeOperator", () => {
    test("changes an AND operator with two children to OR", () => {
        const claimA = mkTestClaim({ id: "claim-1", version: 1 })
        const claimB = mkTestClaim({ id: "claim-2", version: 1 })
        const engine = createTestEngine(undefined, [claimA, claimB])
        const premiseId = makePremise(engine)

        const varIdA = crypto.randomUUID()
        const varIdB = crypto.randomUUID()
        engine.addVariable({
            id: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)
        engine.addVariable({
            id: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "B",
            claimId: "claim-2",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        // Create AND root
        const operatorId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: operatorId,
            parentId: null,
            type: "operator",
            operator: "and",
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        // Add two children
        const childId1 = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: childId1,
            parentId: operatorId,
            type: "variable",
            variableId: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const childId2 = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: childId2,
            parentId: operatorId,
            type: "variable",
            variableId: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const result = mutateChangeOperator(engine, {
            expressionId: operatorId,
            newOperator: "or",
            sourceChildId: childId1,
            targetChildId: childId2,
            extraFields: { creatorId: CREATOR_ID, createdOn: CREATED_ON },
        })

        expect(result.changes).toBeDefined()

        // The operator should now be "or"
        const pm = engine.getPremise(premiseId)!
        const rootExpr = pm.getRootExpression()!
        expect((rootExpr as { operator: string }).operator).toBe("or")
    })

    test("throws when expression not found", () => {
        const engine = createTestEngine()
        expect(() =>
            mutateChangeOperator(engine, {
                expressionId: "nonexistent",
                newOperator: "or",
            })
        ).toThrow()
    })
})

describe("mutateAddSiblingExpression", () => {
    test("adds a sibling variable after target in a multi-child AND", () => {
        const claimA = mkTestClaim({ id: "claim-1", version: 1 })
        const claimB = mkTestClaim({ id: "claim-2", version: 1 })
        const engine = createTestEngine(undefined, [claimA, claimB])
        const premiseId = makePremise(engine)

        const varIdA = crypto.randomUUID()
        const varIdB = crypto.randomUUID()
        engine.addVariable({
            id: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)
        engine.addVariable({
            id: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "B",
            claimId: "claim-2",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        // Create AND operator as root with one child
        const operatorId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: operatorId,
            parentId: null,
            type: "operator",
            operator: "and",
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })
        const childId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: childId,
            parentId: operatorId,
            type: "variable",
            variableId: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const siblingId = crypto.randomUUID()
        const result = mutateAddSiblingExpression(engine, {
            premiseId,
            targetExpressionId: childId,
            direction: "after",
            siblingId,
            type: "variable",
            variableId: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        expect(result.created).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: siblingId })])
        )
        expect(result.changes.expressions?.added).toBeDefined()

        const pm = engine.getPremise(premiseId)!
        const children = pm.getChildExpressions(operatorId)
        expect(children).toHaveLength(2)
        expect(children.map((c) => c.id)).toContain(siblingId)
    })

    test("adds a sibling formula before target", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])
        const premiseId = makePremise(engine)

        const varId = crypto.randomUUID()
        engine.addVariable({
            id: varId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        // Create OR operator with one child
        const operatorId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: operatorId,
            parentId: null,
            type: "operator",
            operator: "or",
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })
        const childId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: childId,
            parentId: operatorId,
            type: "variable",
            variableId: varId,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const siblingId = crypto.randomUUID()
        const result = mutateAddSiblingExpression(engine, {
            premiseId,
            targetExpressionId: childId,
            direction: "before",
            siblingId,
            type: "formula",
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        expect(result.created).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: siblingId, type: "formula" }),
            ])
        )

        const pm = engine.getPremise(premiseId)!
        const children = pm.getChildExpressions(operatorId)
        expect(children).toHaveLength(2)
        // "before" means the sibling should have a lower position than the target
        const siblingPos = children.find((c) => c.id === siblingId)!.position
        const targetPos = children.find((c) => c.id === childId)!.position
        expect(siblingPos).toBeLessThan(targetPos)
    })

    test("throws when premise not found", () => {
        const engine = createTestEngine()
        expect(() =>
            mutateAddSiblingExpression(engine, {
                premiseId: "nonexistent",
                targetExpressionId: "any",
                direction: "after",
                siblingId: "any",
                type: "formula",
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: CREATOR_ID,
                createdOn: CREATED_ON,
            })
        ).toThrow()
    })
})

describe("mutateWrapExpression", () => {
    test("wraps a root variable with AND + sibling variable", () => {
        const claimA = mkTestClaim({ id: "claim-1", version: 1 })
        const claimB = mkTestClaim({ id: "claim-2", version: 1 })
        const engine = createTestEngine(undefined, [claimA, claimB])
        const premiseId = makePremise(engine)

        const varIdA = crypto.randomUUID()
        const varIdB = crypto.randomUUID()
        engine.addVariable({
            id: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)
        engine.addVariable({
            id: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "B",
            claimId: "claim-2",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        // Create root variable
        const rootId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: rootId,
            parentId: null,
            type: "variable",
            variableId: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const operatorId = crypto.randomUUID()
        const siblingId = crypto.randomUUID()
        const result = mutateWrapExpression(engine, {
            premiseId,
            targetExpressionId: rootId,
            direction: "after",
            operatorId,
            operatorType: "and",
            siblingId,
            siblingType: "variable",
            variableId: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        // Should have created operator + sibling (+ possibly formula buffers)
        expect(result.created.length).toBeGreaterThanOrEqual(2)
        expect(result.created.map((e) => e.id)).toContain(operatorId)
        expect(result.created.map((e) => e.id)).toContain(siblingId)
        expect(result.changes.expressions?.added).toBeDefined()

        // The root expression should now be inside the operator
        const pm = engine.getPremise(premiseId)!
        const rootExpr = pm.getRootExpression()!
        expect(rootExpr.id).toBe(operatorId)
    })

    test("backfills creatorId/createdOn on auto-generated formula buffers", () => {
        const claimA = mkTestClaim({ id: "claim-1", version: 1 })
        const claimB = mkTestClaim({ id: "claim-2", version: 1 })
        const engine = createTestEngine(undefined, [claimA, claimB])
        const premiseId = makePremise(engine)

        const varIdA = crypto.randomUUID()
        const varIdB = crypto.randomUUID()
        engine.addVariable({
            id: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)
        engine.addVariable({
            id: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "B",
            claimId: "claim-2",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        // Create root variable
        const rootId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: rootId,
            parentId: null,
            type: "variable",
            variableId: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const operatorId = crypto.randomUUID()
        const siblingId = crypto.randomUUID()
        const result = mutateWrapExpression(engine, {
            premiseId,
            targetExpressionId: rootId,
            direction: "after",
            operatorId,
            operatorType: "implies",
            siblingId,
            siblingType: "variable",
            variableId: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        // All created expressions (including auto-generated formula buffers)
        // should have creatorId and createdOn backfilled
        for (const expr of result.created) {
            expect((expr as { creatorId?: string }).creatorId).toBe(CREATOR_ID)
            expect((expr as { createdOn?: Date }).createdOn).toEqual(CREATED_ON)
        }
    })

    test("throws when premise not found", () => {
        const engine = createTestEngine()
        expect(() =>
            mutateWrapExpression(engine, {
                premiseId: "nonexistent",
                targetExpressionId: "any",
                direction: "after",
                operatorId: "any",
                operatorType: "and",
                siblingId: "any",
                siblingType: "formula",
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: CREATOR_ID,
                createdOn: CREATED_ON,
            })
        ).toThrow()
    })
})

describe("mutateCreateExpressionWithOperator", () => {
    test("delegates to Path A (add sibling) when parent is multi-child AND", () => {
        const claimA = mkTestClaim({ id: "claim-1", version: 1 })
        const claimB = mkTestClaim({ id: "claim-2", version: 1 })
        const engine = createTestEngine(undefined, [claimA, claimB])
        const premiseId = makePremise(engine)

        const varIdA = crypto.randomUUID()
        const varIdB = crypto.randomUUID()
        engine.addVariable({
            id: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)
        engine.addVariable({
            id: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "B",
            claimId: "claim-2",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        // Create AND root with one child
        const andId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: andId,
            parentId: null,
            type: "operator",
            operator: "and",
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })
        const childId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: childId,
            parentId: andId,
            type: "variable",
            variableId: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const operatorId = crypto.randomUUID()
        const siblingId = crypto.randomUUID()
        const result = mutateCreateExpressionWithOperator(engine, {
            premiseId,
            targetExpressionId: childId,
            operatorType: "and",
            direction: "after",
            operatorId,
            siblingId,
            type: "variable",
            variableId: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        // Path A: sibling added to existing AND, no new operator created
        expect(result.created.map((e) => e.id)).toContain(siblingId)
        expect(result.created.map((e) => e.id)).not.toContain(operatorId)

        const pm = engine.getPremise(premiseId)!
        const children = pm.getChildExpressions(andId)
        expect(children).toHaveLength(2)
    })

    test("delegates to Path B (wrap) when parent is not multi-child", () => {
        const claimA = mkTestClaim({ id: "claim-1", version: 1 })
        const claimB = mkTestClaim({ id: "claim-2", version: 1 })
        const engine = createTestEngine(undefined, [claimA, claimB])
        const premiseId = makePremise(engine)

        const varIdA = crypto.randomUUID()
        const varIdB = crypto.randomUUID()
        engine.addVariable({
            id: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "A",
            claimId: "claim-1",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)
        engine.addVariable({
            id: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            symbol: "B",
            claimId: "claim-2",
            claimVersion: 1,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        } as never)

        // Create root variable (no parent operator)
        const rootId = crypto.randomUUID()
        mutateCreateExpression(engine, {
            premiseId,
            expressionId: rootId,
            parentId: null,
            type: "variable",
            variableId: varIdA,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        const operatorId = crypto.randomUUID()
        const siblingId = crypto.randomUUID()
        const result = mutateCreateExpressionWithOperator(engine, {
            premiseId,
            targetExpressionId: rootId,
            operatorType: "and",
            direction: "after",
            operatorId,
            siblingId,
            type: "variable",
            variableId: varIdB,
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
        })

        // Path B: wrap created a new operator node
        expect(result.created.map((e) => e.id)).toContain(operatorId)
        expect(result.created.map((e) => e.id)).toContain(siblingId)

        const pm = engine.getPremise(premiseId)!
        const rootExpr = pm.getRootExpression()!
        expect(rootExpr.id).toBe(operatorId)
    })

    test("rejects operator type as sibling", () => {
        const engine = createTestEngine()
        const premiseId = makePremise(engine)

        expect(() =>
            mutateCreateExpressionWithOperator(engine, {
                premiseId,
                targetExpressionId: "any",
                operatorType: "and",
                direction: "after",
                operatorId: "op",
                siblingId: "sib",
                type: "operator",
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: CREATOR_ID,
                createdOn: CREATED_ON,
            })
        ).toThrow("Cannot create operator type via this endpoint")
    })
})
