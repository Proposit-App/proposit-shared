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

    // Followups-sweep-2026-05 C3: extras.role must stay in sync with role-state.
    //
    // `engine.setConclusionPremise(id)` and `engine.clearConclusionPremise()`
    // only update the engine's `conclusionPremiseId` slot — they never touch
    // the affected premise's `extras.role` field. Pre-fix, the server worked
    // around this in cycle-5 by chasing every `mutateUpdatePremiseRole` with a
    // `mutateUpdatePremiseExtras({ role })` call. Mobile clients (and any
    // future consumer) hitting `mutateUpdatePremiseRole` directly would see
    // `premise.role` stale on subsequent persistence operations.
    //
    // Lift the sync into the shared mutation so the helper is internally
    // consistent.
    test("syncs extras.role to 'conclusion' when promoting to conclusion", () => {
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

        mutateUpdatePremiseRole(engine, pId, "conclusion")

        const pe = engine.getPremise(pId)
        expect(pe?.toPremiseData().role).toBe("conclusion")
    })

    test("syncs extras.role to 'supporting' when demoting from conclusion", () => {
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

        const pe = engine.getPremise(pId)
        expect(pe?.toPremiseData().role).toBe("supporting")
    })

    // When promoting a new premise to conclusion, the prior conclusion is
    // implicitly demoted at the role-state slot (core's setConclusionPremise
    // overwrites `conclusionPremiseId`). The prior conclusion's
    // `extras.role` must be synced to "supporting" so persistence writes
    // don't pick up a stale "conclusion" value from the extras bag.
    test("syncs prior conclusion's extras.role to 'supporting' when promoting a different premise", () => {
        const engine = createTestEngine()
        const oldConclusionId = crypto.randomUUID()
        const newConclusionId = crypto.randomUUID()
        mutateCreatePremise(engine, oldConclusionId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "Old C",
            role: "conclusion",
        })
        mutateCreatePremise(engine, newConclusionId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "New C",
            role: "supporting",
        })

        mutateUpdatePremiseRole(engine, newConclusionId, "conclusion")

        expect(engine.getConclusionPremise()?.getId()).toBe(newConclusionId)
        const oldPe = engine.getPremise(oldConclusionId)
        expect(oldPe?.toPremiseData().role).toBe("supporting")
        const newPe = engine.getPremise(newConclusionId)
        expect(newPe?.toPremiseData().role).toBe("conclusion")
    })

    // Reviewer-fold (followups-sweep-2026-05 C bundle, P2): the
    // already-in-state branch must remain a true no-op at the changeset
    // level. Pre-extras-sync this was naturally the case (the helper
    // returned `{ changes: {} }`); after the extras-sync was added the
    // branch unconditionally called `pe.updateExtras({ role })`, which
    // routes through core's `setExtras` → always `markDirty()` + always
    // emit `modifiedPremise`. That broke the no-op contract — downstream
    // consumers (`persistChangeset` writing the row, engine cache
    // invalidation, UI subscribers) would fire on every redundant call.
    // Short-circuit when the new role equals the current role.
    test("is a no-op (empty changeset) when premise is already in the requested role", () => {
        const engine = createTestEngine()
        const supportingId = crypto.randomUUID()
        const conclusionId = crypto.randomUUID()
        mutateCreatePremise(engine, conclusionId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "C",
            role: "conclusion",
        })
        mutateCreatePremise(engine, supportingId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "P",
            role: "supporting",
        })

        // No-op on the supporting premise.
        const supportingResult = mutateUpdatePremiseRole(
            engine,
            supportingId,
            "supporting"
        )
        expect(supportingResult.changes.premises?.modified ?? []).toEqual([])
        expect(supportingResult.changes.premises?.added ?? []).toEqual([])
        expect(supportingResult.changes.premises?.removed ?? []).toEqual([])
        expect(supportingResult.changes.roles).toBeUndefined()

        // No-op on the conclusion premise too — same branch (current
        // role-state already matches the requested role).
        const conclusionResult = mutateUpdatePremiseRole(
            engine,
            conclusionId,
            "conclusion"
        )
        expect(conclusionResult.changes.premises?.modified ?? []).toEqual([])
        expect(conclusionResult.changes.premises?.added ?? []).toEqual([])
        expect(conclusionResult.changes.premises?.removed ?? []).toEqual([])
        expect(conclusionResult.changes.roles).toBeUndefined()
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
