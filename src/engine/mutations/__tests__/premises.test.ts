import { describe, test, expect } from "vitest"
import { InvariantViolationError } from "@proposit/proposit-core"
import { createTestEngine } from "./helpers.js"
import {
    mutateCreatePremise,
    mutateUpdatePremiseRole,
    mutateDeletePremise,
} from "../premises.js"

describe("mutateCreatePremise", () => {
    // First-premise + caller-requested `role: "supporting"`: the engine
    // auto-assigns the first premise of a new argument as conclusion (core's
    // `createPremiseWithId` "auto-conclusion assignment" rule), and core@1.0.2's
    // E-7 invariant makes `engine.clearConclusionPremise()` a no-op when
    // premises exist — so the helper can't undo the auto-assignment. To
    // prevent the engine's role-state slot from disagreeing with `extras.role`,
    // the helper now syncs `extras.role` to "conclusion" (matching the engine)
    // rather than honoring the caller's "supporting" request on the first
    // premise. Symmetric in spirit with `mutateUpdatePremiseRole`'s
    // demote refusal: when the engine's invariants are incompatible with the
    // caller's exact intent, surface the actual outcome rather than half-apply.
    test("first premise auto-assigns as conclusion regardless of requested 'supporting' role (E-7)", () => {
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
        // Engine state and extras.role both reflect the engine's
        // auto-assigned conclusion — no role-state-vs-extras drift.
        expect(engine.getConclusionPremise()?.getId()).toBe(premiseId)
        expect(result.premise.role).toBe("conclusion")
        expect(engine.getPremise(premiseId)?.toPremiseData().role).toBe(
            "conclusion"
        )
        expect(engine.listPremiseIds()).toContain(premiseId)
        expect(result.changes.premises?.added).toHaveLength(1)
    })

    test("second premise with 'supporting' role stays supporting (no auto-conclusion override)", () => {
        // Once a conclusion exists, core's auto-conclusion rule does not
        // fire, and the helper preserves the caller's requested
        // "supporting" role unchanged. Pre-existing conclusion stays put.
        const engine = createTestEngine()
        const conclusionId = crypto.randomUUID()
        mutateCreatePremise(engine, conclusionId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "C",
            role: "conclusion",
        })

        const supportingId = crypto.randomUUID()
        const result = mutateCreatePremise(engine, supportingId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date(),
            title: "P",
            role: "supporting",
        })

        expect(result.premise.role).toBe("supporting")
        expect(engine.getPremise(supportingId)?.toPremiseData().role).toBe(
            "supporting"
        )
        // Conclusion designation unchanged — still points at the
        // pre-existing conclusion premise.
        expect(engine.getConclusionPremise()?.getId()).toBe(conclusionId)
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

    // Sync-to-core@1.0.2 E-7 invariant. Pre-1.0.2 the engine permitted a
    // non-empty argument to have `conclusionPremiseId === undefined`; this
    // helper's demote branch called `engine.clearConclusionPremise()` which
    // unset the slot, and the test below asserted the unset.
    //
    // Core 1.0.2 added the E-7 invariant: "a non-empty argument always has
    // a conclusion designated". `clearConclusionPremise()` became a no-op
    // when premises exist. Under that invariant there is NO valid
    // "demote the current conclusion in place" operation — the only way to
    // re-shape the conclusion-role designation on a non-empty argument is
    // to promote a different premise (which atomically replaces the
    // current conclusion at the role-state slot; covered separately above).
    //
    // The helper now refuses the operation explicitly via
    // `InvariantViolationError(ARGUMENT_NO_CONCLUSION)` rather than
    // silently swallowing the request (which would leave the engine's
    // role-state slot still pointing at the premise while `extras.role`
    // drifted to "supporting" — exactly the role-state-vs-extras gap this
    // helper was created to prevent). Refusal also matches the Proposit
    // "no changes to argument without consent" principle: when the user's
    // request is structurally incompatible with the invariant, tell them
    // honestly rather than half-apply the change.
    test("throws InvariantViolationError when demoting the sole conclusion (E-7)", () => {
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

        let caught: unknown
        try {
            mutateUpdatePremiseRole(engine, pId, "supporting")
        } catch (err) {
            caught = err
        }
        expect(caught).toBeInstanceOf(InvariantViolationError)
        // Pin the violation code — server route handlers
        // pattern-match on this code to map to 409 Conflict.
        expect((caught as InvariantViolationError).violations[0].code).toBe(
            "ARGUMENT_NO_CONCLUSION"
        )

        // Engine state is unchanged — E-7 still holds, extras-role still
        // matches the engine's role-state slot.
        expect(engine.getConclusionPremise()?.getId()).toBe(pId)
        expect(engine.getPremise(pId)?.toPremiseData().role).toBe("conclusion")
    })

    test("throws InvariantViolationError when demoting the conclusion alongside other premises (E-7)", () => {
        // Multi-premise variant: same invariant applies. The legitimate
        // way to swap the conclusion designation is to promote a different
        // premise (atomic replace), not to demote the current one in
        // place and leave the argument conclusion-less mid-mutation.
        const engine = createTestEngine()
        const conclusionId = crypto.randomUUID()
        const supportingId = crypto.randomUUID()
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

        let caught: unknown
        try {
            mutateUpdatePremiseRole(engine, conclusionId, "supporting")
        } catch (err) {
            caught = err
        }
        expect(caught).toBeInstanceOf(InvariantViolationError)
        expect((caught as InvariantViolationError).violations[0].code).toBe(
            "ARGUMENT_NO_CONCLUSION"
        )

        expect(engine.getConclusionPremise()?.getId()).toBe(conclusionId)
        expect(engine.getPremise(conclusionId)?.toPremiseData().role).toBe(
            "conclusion"
        )
        expect(engine.getPremise(supportingId)?.toPremiseData().role).toBe(
            "supporting"
        )
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

    // The pre-E-7 "syncs extras.role to 'supporting' when demoting from
    // conclusion" test that previously sat here demoted the sole conclusion
    // in place. Core@1.0.2's E-7 invariant ("a non-empty argument always
    // has a conclusion") makes that operation illegitimate — see the
    // throw-tests above. The "supporting via implicit demote" path now goes
    // through the promote-a-different-premise route, covered by the test
    // immediately below.

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
