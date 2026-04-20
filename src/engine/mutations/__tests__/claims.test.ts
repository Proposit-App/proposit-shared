import { describe, test, expect } from "vitest"
import { createTestEngine, mkTestClaim } from "./helpers.js"
import {
    mutateSetClaim,
    mutateUpdateClaim,
    mutateRemoveClaimWithCascade,
} from "../claims.js"
import { mutateCreateVariable } from "../variables.js"

const CREATOR_ID = "test-user-id"
const CREATED_ON = new Date("2026-01-01")
const ARG_ID = "test-arg-id"
const ARG_VERSION = 1

describe("mutateSetClaim", () => {
    test("adds a claim to the engine", () => {
        const engine = createTestEngine()
        const claim = mkTestClaim({ id: "claim-1", version: 1 })

        mutateSetClaim(engine, claim)

        const snapshot = engine.getProjectSnapshot()
        expect(snapshot.claims["claim-1"]).toBeDefined()
        expect(snapshot.claims["claim-1"].id).toBe("claim-1")
    })

    test("overwrites an existing claim with the same id", () => {
        const engine = createTestEngine()
        const claim = mkTestClaim({
            id: "claim-1",
            version: 1,
            title: "Original",
        })
        mutateSetClaim(engine, claim)

        const updated = mkTestClaim({
            id: "claim-1",
            version: 2,
            title: "Updated",
        })
        mutateSetClaim(engine, updated)

        expect(engine.getProjectSnapshot().claims["claim-1"].version).toBe(2)
    })
})

describe("mutateUpdateClaim", () => {
    test("updates an existing claim (upsert)", () => {
        const engine = createTestEngine()
        const original = mkTestClaim({
            id: "claim-1",
            version: 1,
            title: "First",
        })
        mutateSetClaim(engine, original)

        const updated = mkTestClaim({
            id: "claim-1",
            version: 1,
            title: "Updated title",
        })
        mutateUpdateClaim(engine, updated)

        expect(engine.getProjectSnapshot().claims["claim-1"].title).toBe(
            "Updated title"
        )
    })
})

describe("mutateRemoveClaimWithCascade", () => {
    test("removes claim and cascades to linked variables", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])
        mutateSetClaim(engine, claim)

        const variableId = crypto.randomUUID()
        mutateCreateVariable(engine, variableId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            claimId: "claim-1",
            claimVersion: 1,
            symbol: "P",
        })

        const result = mutateRemoveClaimWithCascade(engine, "claim-1")

        expect(result.removedVariableIds).toContain(variableId)
        expect(engine.getVariable(variableId)).toBeUndefined()
        expect(engine.getProjectSnapshot().claims["claim-1"]).toBeUndefined()
        expect(result.changes.variables?.removed).toHaveLength(1)
    })

    test("removes claim with no linked variables", () => {
        const claim = mkTestClaim({ id: "claim-2", version: 1 })
        const engine = createTestEngine(undefined, [claim])
        mutateSetClaim(engine, claim)

        const result = mutateRemoveClaimWithCascade(engine, "claim-2")

        expect(result.removedVariableIds).toHaveLength(0)
        expect(engine.getProjectSnapshot().claims["claim-2"]).toBeUndefined()
        expect(result.changes.variables).toBeUndefined()
    })

    test("only cascades to variables linked to the removed claim", () => {
        const claimA = mkTestClaim({ id: "claim-a", version: 1 })
        const claimB = mkTestClaim({ id: "claim-b", version: 1 })
        const engine = createTestEngine(undefined, [claimA, claimB])
        mutateSetClaim(engine, claimA)
        mutateSetClaim(engine, claimB)

        const varA = crypto.randomUUID()
        const varB = crypto.randomUUID()
        mutateCreateVariable(engine, varA, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            claimId: "claim-a",
            claimVersion: 1,
            symbol: "A",
        })
        mutateCreateVariable(engine, varB, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            claimId: "claim-b",
            claimVersion: 1,
            symbol: "B",
        })

        const result = mutateRemoveClaimWithCascade(engine, "claim-a")

        expect(result.removedVariableIds).toContain(varA)
        expect(result.removedVariableIds).not.toContain(varB)
        expect(engine.getVariable(varA)).toBeUndefined()
        expect(engine.getVariable(varB)).toBeDefined()
    })
})
