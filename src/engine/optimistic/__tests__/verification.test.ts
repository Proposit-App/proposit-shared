import { describe, test, expect } from "vitest"
import { createTestEngine } from "../../mutations/__tests__/helpers.js"
import { mutateCreatePremise } from "../../mutations/premises.js"
import { detectDivergence } from "../verification.js"
import type { TProjectSnapshot } from "../../engine.js"

describe("detectDivergence", () => {
    test("returns 'none' when comparing engine against its own snapshot", () => {
        const engine = createTestEngine()
        mutateCreatePremise(engine, crypto.randomUUID(), {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date("2026-01-01"),
            title: "Supporting premise",
            role: "supporting",
        })

        const snap = engine.snapshot() as TProjectSnapshot
        const result = detectDivergence(engine, snap)

        expect(result.level).toBe("none")
    })

    test("detects divergence when a premise title is changed in the server snapshot", () => {
        const engine = createTestEngine()
        const premiseId = crypto.randomUUID()
        mutateCreatePremise(engine, premiseId, {
            argumentId: "test-arg-id",
            argumentVersion: 1,
            creatorId: "test-user-id",
            createdOn: new Date("2026-01-01"),
            title: "Original title",
            role: "supporting",
        })

        // Take a snapshot, then modify the premise title in the snapshot
        // to simulate a server-side change that diverges from local state
        const serverSnap = engine.snapshot() as TProjectSnapshot
        const premiseEntry = serverSnap.premises.find(
            (p) => p.premise.id === premiseId
        )
        if (!premiseEntry) throw new Error("Premise not found in snapshot")

        // Mutate the server snapshot premise title
        premiseEntry.premise = {
            ...premiseEntry.premise,
            title: "Server-modified title",
            // Clear checksums so the server engine recomputes them
            checksum: undefined,
            descendantChecksum: undefined,
            combinedChecksum: undefined,
        }
        // Clear argument checksums too so server engine rebuilds from scratch
        serverSnap.argument = {
            ...serverSnap.argument,
            checksum: undefined,
            descendantChecksum: undefined,
            combinedChecksum: undefined,
        }

        const result = detectDivergence(engine, serverSnap)

        expect(result.level).not.toBe("none")
    })
})
