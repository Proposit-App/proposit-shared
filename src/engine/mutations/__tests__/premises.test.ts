import { describe, test, expect } from "vitest"
import { createTestEngine } from "./helpers.js"
import {
    mutateCreatePremise,
    mutateUpdatePremiseRole,
    mutateDeletePremise,
} from "../premises.js"

describe("mutateCreatePremise", () => {
    test("creates a supporting premise", () => {
        const engine = createTestEngine()
        const premiseId = crypto.randomUUID()

        const result = mutateCreatePremise(engine, premiseId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "P1",
            role: "supporting",
        })

        expect(result.premise.id).toBe(premiseId)
        expect(result.premise.title).toBe("P1")
        expect(result.premise.role).toBe("supporting")
        expect(engine.listPremiseIds()).toContain(premiseId)
        expect(result.changes.premises?.added).toHaveLength(1)
    })

    test("creates a conclusion premise and sets conclusion role", () => {
        const engine = createTestEngine()
        const premiseId = crypto.randomUUID()

        const result = mutateCreatePremise(engine, premiseId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "Conclusion",
            role: "conclusion",
        })

        expect(result.premise.role).toBe("conclusion")
        expect(engine.getConclusionPremise()?.getId()).toBe(premiseId)
        expect(result.changes.roles).toBeDefined()
    })

    test("throws when conclusion already exists", () => {
        const engine = createTestEngine()
        const firstId = crypto.randomUUID()
        mutateCreatePremise(engine, firstId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "C1",
            role: "conclusion",
        })

        expect(() =>
            mutateCreatePremise(engine, crypto.randomUUID(), {
                argumentId: "test-arg-id",
                argumentVersion: 1,
                creatorId: "test-user-id",
                createdOn: new Date(),
                title: "C2",
                role: "conclusion",
            })
        ).toThrow()
    })
})

describe("mutateUpdatePremiseRole", () => {
    test("sets a premise as conclusion", () => {
        const engine = createTestEngine()
        const pId = crypto.randomUUID()
        mutateCreatePremise(engine, pId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "P",
            role: "supporting",
        })

        const result = mutateUpdatePremiseRole(engine, pId, "conclusion")

        expect(engine.getConclusionPremise()?.getId()).toBe(pId)
        expect(result.changes).toBeDefined()
    })

    test("clears conclusion role", () => {
        const engine = createTestEngine()
        const pId = crypto.randomUUID()
        mutateCreatePremise(engine, pId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "C",
            role: "conclusion",
        })

        mutateUpdatePremiseRole(engine, pId, "supporting")

        expect(engine.getConclusionPremise()).toBeUndefined()
    })
})

describe("mutateDeletePremise", () => {
    test("removes a premise", () => {
        const engine = createTestEngine()
        const pId = crypto.randomUUID()
        mutateCreatePremise(engine, pId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "P",
            role: "supporting",
        })

        const result = mutateDeletePremise(engine, pId)

        expect(result.removed).toBe(true)
        expect(engine.listPremiseIds()).not.toContain(pId)
        expect(result.changes.premises?.removed).toHaveLength(1)
    })

    test("returns false for nonexistent premise", () => {
        const engine = createTestEngine()
        const result = mutateDeletePremise(engine, "nonexistent")
        expect(result.removed).toBe(false)
    })
})
