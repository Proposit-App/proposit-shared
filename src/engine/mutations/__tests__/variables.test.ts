import { describe, test, expect } from "vitest"
import { createTestEngine, mkTestClaim } from "./helpers.js"
import {
    mutateCreateVariable,
    mutateUpdateVariable,
    mutateDeleteVariable,
} from "../variables.js"
import type { TClaimBoundVariable } from "../../../schemas/logic.js"

const CREATOR_ID = "test-user-id"
const CREATED_ON = new Date("2026-01-01")
const ARG_ID = "test-arg-id"
const ARG_VERSION = 1

describe("mutateCreateVariable", () => {
    test("creates a variable linked to a claim", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])
        const variableId = crypto.randomUUID()

        const result = mutateCreateVariable(engine, variableId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            claimId: "claim-1",
            claimVersion: 1,
            symbol: "P",
        })

        const variable = result.variable as TClaimBoundVariable
        expect(variable.id).toBe(variableId)
        expect(variable.symbol).toBe("P")
        expect(variable.claimId).toBe("claim-1")
        expect(variable.claimVersion).toBe(1)
        expect(result.changes.variables?.added).toHaveLength(1)
        expect(engine.getVariable(variableId)).toBeDefined()
    })

    test("throws when the claim is not in the engine's claim library", () => {
        const engine = createTestEngine()
        expect(() =>
            mutateCreateVariable(engine, crypto.randomUUID(), {
                argumentId: ARG_ID,
                argumentVersion: ARG_VERSION,
                creatorId: CREATOR_ID,
                createdOn: CREATED_ON,
                claimId: "missing-claim",
                claimVersion: 1,
                symbol: "Q",
            })
        ).toThrow()
    })
})

describe("mutateUpdateVariable", () => {
    test("updates the symbol of an existing variable", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])
        const variableId = crypto.randomUUID()

        mutateCreateVariable(engine, variableId, {
            argumentId: ARG_ID,
            argumentVersion: ARG_VERSION,
            creatorId: CREATOR_ID,
            createdOn: CREATED_ON,
            claimId: "claim-1",
            claimVersion: 1,
            symbol: "A",
        })

        const result = mutateUpdateVariable(engine, variableId, { symbol: "B" })

        expect(result.variable?.symbol).toBe("B")
        expect(result.changes.variables?.modified).toHaveLength(1)
    })

    test("returns undefined variable for nonexistent variable id", () => {
        const engine = createTestEngine()
        const result = mutateUpdateVariable(engine, "nonexistent", {
            symbol: "Z",
        })
        expect(result.variable).toBeUndefined()
        expect(result.changes.variables).toBeUndefined()
    })
})

describe("mutateDeleteVariable", () => {
    test("removes an existing variable", () => {
        const claim = mkTestClaim({ id: "claim-1", version: 1 })
        const engine = createTestEngine(undefined, [claim])
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

        const result = mutateDeleteVariable(engine, variableId)

        expect(result.removed).toBe(true)
        expect(engine.getVariable(variableId)).toBeUndefined()
        expect(result.changes.variables?.removed).toHaveLength(1)
    })

    test("returns false for nonexistent variable id", () => {
        const engine = createTestEngine()
        const result = mutateDeleteVariable(engine, "nonexistent")
        expect(result.removed).toBe(false)
    })
})
