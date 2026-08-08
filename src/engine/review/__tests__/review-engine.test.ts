// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import type { TReviewStore } from "../../review/review-store.js"
import { ReviewEngine } from "../../review/review-engine.js"
import {
    LocalStorageReviewStore,
    ReviewStorageQuotaError,
    ReviewStorageUnavailableError,
} from "../../review/review-store.js"
import {
    buildEngineWithTwoPremises,
    completeClaimPhase,
    completeFullPhases,
} from "./fixtures.js"

// In-memory localStorage stub — jsdom + Node 25 combo hands back an empty object otherwise.
class MemoryStorage {
    private store = new Map<string, string>()
    get length(): number {
        return this.store.size
    }
    key(i: number): string | null {
        return Array.from(this.store.keys())[i] ?? null
    }
    getItem(k: string): string | null {
        return this.store.get(k) ?? null
    }
    setItem(k: string, v: string): void {
        this.store.set(k, String(v))
    }
    removeItem(k: string): void {
        this.store.delete(k)
    }
    clear(): void {
        this.store.clear()
    }
}
Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
})

/** Store whose debounced `save` always rejects; everything else is unused. */
function rejectingStore(err: Error): TReviewStore {
    const unused = (): never => {
        throw new Error("unexpected store call")
    }
    return {
        load: () => Promise.resolve(undefined),
        save: () => Promise.reject(err),
        upsertClaimAssignment: unused,
        upsertOperatorAssignment: unused,
        saveResult: unused,
        clear: unused,
        keyFor: () => "test-key",
    }
}

/**
 * Arms the debounced persist against a rejecting store, fires the timer, then
 * lets the event loop turn over so Node has decided what is unhandled.
 */
async function persistAgainstRejectingStore(err: Error): Promise<string[]> {
    const unhandled: string[] = []
    const onUnhandled = (reason: unknown): void => {
        unhandled.push(String(reason))
    }
    process.on("unhandledRejection", onUnhandled)
    vi.useFakeTimers()
    try {
        const argEngine = buildEngineWithTwoPremises()
        const re = new ReviewEngine({ argEngine, store: rejectingStore(err) })
        re.start()
        const step = re.getSnapshot().currentStep
        if (step?.kind !== "claim") throw new Error("expected a claim step")
        re.setClaimValue(step.claimId, true)
        vi.advanceTimersByTime(200)
        vi.useRealTimers()
        await new Promise((resolve) => setImmediate(resolve))
        return unhandled
    } finally {
        vi.useRealTimers()
        process.off("unhandledRejection", onUnhandled)
    }
}

describe("ReviewEngine — debounced persist failures", () => {
    it("swallows an unavailable-storage rejection from the debounced save", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(vi.fn())
        try {
            const unhandled = await persistAgainstRejectingStore(
                new ReviewStorageUnavailableError("SSR")
            )
            expect(unhandled).toEqual([])
            expect(warn).not.toHaveBeenCalled()
        } finally {
            warn.mockRestore()
        }
    })

    it("warns but does not leak a real persist failure from the debounced save", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(vi.fn())
        try {
            const unhandled = await persistAgainstRejectingStore(
                new ReviewStorageQuotaError()
            )
            expect(unhandled).toEqual([])
            expect(warn).toHaveBeenCalledTimes(1)
        } finally {
            warn.mockRestore()
        }
    })
})

describe("ReviewEngine — bootstrap", () => {
    it("constructs with a fresh draft when no initialDraft supplied", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("claims")
        expect(snap.currentStep?.kind).toBe("claim")
    })

    it("drops stale claim assignments whose claimId no longer exists", () => {
        const argEngine = buildEngineWithTwoPremises()
        const now = new Date()
        const re = new ReviewEngine({
            argEngine,
            store: new LocalStorageReviewStore(),
            initialDraft: {
                schemaVersion: 1,
                reviewId: "00000000-0000-0000-0000-00000000000r",
                argumentId: argEngine.getArgument().id,
                argumentVersion: 1,
                userId: undefined,
                createdAt: now,
                updatedAt: now,
                phase: "claims",
                currentStepIndex: 0,
                claimAssignments: {
                    "deleted-claim": {
                        assignmentId: "x",
                        claimId: "deleted-claim",
                        value: true,
                        skipped: false,
                        decidedAt: now,
                    },
                },
                operatorAssignments: [],
            },
        })
        expect(
            re.getSnapshot().draft.claimAssignments["deleted-claim"]
        ).toBeUndefined()
        expect(re.getSnapshot().droppedStaleCount).toBe(1)
    })

    it("notifies subscribers on mutation", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        const listener = vi.fn()
        re.subscribe(listener)
        re.setClaimValue("sA", true)
        expect(listener).toHaveBeenCalled()
    })
})

describe("ReviewEngine — claim phase + navigation", () => {
    it("setClaimReason stores the reason without clobbering value/skipped", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        re.setClaimValue("sA", true)
        re.setClaimReason("sA", "common-knowledge")
        const a = re.getSnapshot().draft.claimAssignments.sA
        expect(a.reasonCode).toBe("common-knowledge")
        expect(a.value).toBe(true)
        expect(a.skipped).toBe(false)
    })

    it("skipClaim sets skipped: true and value: null", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        re.skipClaim("sA")
        const a = re.getSnapshot().draft.claimAssignments.sA
        expect(a.skipped).toBe(true)
        expect(a.value).toBeNull()
    })

    it("advanceStep emits skip-requeue-notice at end-of-phase when skipped items remain", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        re.setClaimValue("sA", true)
        re.advanceStep()
        re.skipClaim("cA")
        re.advanceStep()
        re.setClaimValue("cB", true)
        re.advanceStep()
        expect(re.getSnapshot().currentStep?.kind).toBe("skip-requeue-notice")
    })

    it("proceedWithSkippedAsUnknown advances phase and freezes skipped claims", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        re.skipClaim("sA")
        re.advanceStep()
        re.skipClaim("cA")
        re.advanceStep()
        re.skipClaim("cB")
        re.advanceStep()
        re.proceedWithSkippedAsUnknown()
        expect(re.getSnapshot().draft.phase).toBe("operators")
        expect(re.getSnapshot().draft.claimAssignments.sA.value).toBeNull()
    })

    it("goBack restores the previous index; canGoBack is false at the start", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        expect(re.getSnapshot().progress.canGoBack).toBe(false)
        re.setClaimValue("sA", true)
        re.advanceStep()
        expect(re.getSnapshot().draft.currentStepIndex).toBe(1)
        re.goBack()
        expect(re.getSnapshot().draft.currentStepIndex).toBe(0)
    })
})

describe("ReviewEngine — operator phase", () => {
    it("setOperatorAssignment with scope=premise replaces any prior premise-scope entry", async () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        await completeClaimPhase(re)
        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            decision: "accepted",
        })
        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            decision: "rejected",
        })
        const ops = re
            .getSnapshot()
            .draft.operatorAssignments.filter(
                (o) => o.scope === "premise" && o.premiseId === "pConclusion"
            )
        expect(ops.length).toBe(1)
        expect(ops[0].decision).toBe("rejected")
    })

    it("setOperatorReason records the reason on a premise decision that carries its operator id", async () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        await completeClaimPhase(re)
        // A premise decision is keyed by its premiseId alone; the operator id
        // rides along as provenance for the objection, so the reason must
        // still land when the caller keys by the premise.
        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            expressionId: "eImpliesRoot",
            decision: "rejected",
        })
        re.setOperatorReason("pConclusion", "counterexamples-exist")
        const op = re
            .getSnapshot()
            .draft.operatorAssignments.find(
                (o) => o.premiseId === "pConclusion"
            )
        expect(op?.reasonCode).toBe("counterexamples-exist")
    })
})

describe("ReviewEngine — evaluation + edit", () => {
    it("runEvaluation persists a TReviewResult with the current material fingerprint", async () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        await completeFullPhases(re)
        const result = await re.runEvaluation()
        expect(result.schemaVersion).toBe(1)
        expect(typeof result.evaluatedFingerprint).toBe("string")
        expect(re.getSnapshot().lastResult).toBe(result)
    })

    it("resetSkipFlags clears skipped on every assignment without touching values", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        re.setClaimValue("sA", true)
        re.skipClaim("cA")
        re.resetSkipFlags()
        expect(re.getSnapshot().draft.claimAssignments.cA.skipped).toBe(false)
        expect(re.getSnapshot().draft.claimAssignments.sA.value).toBe(true)
    })

    it("resetSkipFlags clears the navigation history", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        // Advance a few steps to build up history
        re.advanceStep()
        re.advanceStep()
        expect(re.getSnapshot().progress.canGoBack).toBe(true)

        re.resetSkipFlags()

        expect(re.getSnapshot().progress.canGoBack).toBe(false)
    })

    it("jumpToResults sets phase to done, emits results step, and preserves goBack", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        re.setClaimValue("sA", true)
        re.advanceStep()
        // Now on claim index 1.
        re.jumpToResults()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("done")
        expect(snap.currentStep?.kind).toBe("results")
        expect(snap.progress.canGoBack).toBe(true)
        re.goBack()
        expect(re.getSnapshot().draft.phase).toBe("claims")
        expect(re.getSnapshot().draft.currentStepIndex).toBe(1)
    })

    it("jumpToResults works even when nothing has been decided", () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        re.jumpToResults()
        expect(re.getSnapshot().draft.phase).toBe("done")
        expect(re.getSnapshot().currentStep?.kind).toBe("results")
    })

    it("goToClaimForEdit + advanceStep jumps straight back to results", async () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        await completeFullPhases(re)
        expect(re.getSnapshot().currentStep?.kind).toBe("results")

        // Edit the first claim.
        re.goToClaimForEdit("sA")
        expect(re.getSnapshot().draft.phase).toBe("claims")
        expect(re.getSnapshot().draft.currentStepIndex).toBe(0)

        // Change the value and advance — should skip straight to results,
        // not to claim index 1.
        re.setClaimValue("sA", false)
        re.advanceStep()
        expect(re.getSnapshot().draft.phase).toBe("done")
        expect(re.getSnapshot().currentStep?.kind).toBe("results")

        // goBack from results returns to the edited claim (one history pop).
        re.goBack()
        expect(re.getSnapshot().draft.phase).toBe("claims")
        expect(re.getSnapshot().draft.currentStepIndex).toBe(0)
    })

    it("goToPremiseForEdit + advanceStep jumps straight back to results", async () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        await completeFullPhases(re)
        expect(re.getSnapshot().currentStep?.kind).toBe("results")

        const firstPremise = re.getOperatorQueue()[0]
        re.goToPremiseForEdit(firstPremise)
        expect(re.getSnapshot().draft.phase).toBe("operators")

        re.setOperatorAssignment({
            premiseId: firstPremise,
            scope: "premise",
            decision: "rejected",
        })
        re.advanceStep()
        expect(re.getSnapshot().draft.phase).toBe("done")
        expect(re.getSnapshot().currentStep?.kind).toBe("results")
    })

    it("goToClaimForEdit flag only applies to the next advanceStep", async () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: new LocalStorageReviewStore(),
        })
        re.start()
        await completeFullPhases(re)

        re.goToClaimForEdit("sA")
        re.setClaimValue("sA", false)
        re.advanceStep()
        expect(re.getSnapshot().draft.phase).toBe("done")

        // Second navigation without the edit flag → normal advance behavior.
        re.goToClaim("cA")
        re.setClaimValue("cA", false)
        re.advanceStep()
        // Normal advance from claim index 1 → claim index 2.
        expect(re.getSnapshot().draft.phase).toBe("claims")
        expect(re.getSnapshot().draft.currentStepIndex).toBe(2)
    })
})

describe("ReviewEngine.mode (readonly)", () => {
    // Build a completed ReviewEngine in "editable" mode, capture its draft,
    // then construct a new readonly engine seeded with that draft. This avoids
    // inventing new test infrastructure — we reuse completeFullPhases.
    async function buildCompletedReadonly(): Promise<{
        re: ReturnType<() => ReviewEngine>
        argEngine: ReturnType<typeof buildEngineWithTwoPremises>
    }> {
        const argEngine = buildEngineWithTwoPremises()
        const editable = new ReviewEngine({
            argEngine,
            store: new LocalStorageReviewStore(),
        })
        editable.start()
        await completeFullPhases(editable)
        // Force phase → done so navigation/runEvaluation can exercise results.
        editable.jumpToResults()
        const completedDraft = editable.getSnapshot().draft

        const argEngine2 = buildEngineWithTwoPremises()
        const re = new ReviewEngine({
            argEngine: argEngine2,
            store: new LocalStorageReviewStore(),
            initialDraft: completedDraft,
            mode: "readonly",
        })
        return { re, argEngine: argEngine2 }
    }

    it("setClaimValue is a no-op in readonly mode", async () => {
        const { re } = await buildCompletedReadonly()
        const before = re.getSnapshot()
        re.setClaimValue("sA", false)
        const after = re.getSnapshot()
        // Snapshot identity is preserved because notify() never ran.
        expect(after).toBe(before)
        expect(after.draft.claimAssignments.sA.value).toBe(
            before.draft.claimAssignments.sA.value
        )
    })

    it("setOperatorAssignment is a no-op in readonly mode", async () => {
        const { re } = await buildCompletedReadonly()
        const before = re.getSnapshot()
        const beforeOps = JSON.stringify(before.draft.operatorAssignments)
        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            decision: "rejected",
        })
        const after = re.getSnapshot()
        expect(after).toBe(before)
        expect(JSON.stringify(after.draft.operatorAssignments)).toBe(beforeOps)
    })

    it("subscribers are not notified when readonly mutation attempts happen", async () => {
        const { re } = await buildCompletedReadonly()
        const listener = vi.fn()
        re.subscribe(listener)
        re.setClaimValue("sA", false)
        re.setClaimReason("sA", "common-knowledge")
        re.skipClaim("sA")
        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            decision: "rejected",
        })
        re.skipOperator("pConclusion")
        re.resetSkipFlags()
        re.proceedWithSkippedAsUnknown()
        await re.runValidityCheck()
        await re.reloadFromStore()
        await re.clear()
        expect(listener).not.toHaveBeenCalled()
    })

    it("navigation methods (jumpToResults, advanceStep) do not throw in readonly mode", async () => {
        const { re } = await buildCompletedReadonly()
        expect(() => re.jumpToResults()).not.toThrow()
        expect(() => re.advanceStep()).not.toThrow()
        expect(() => re.goBack()).not.toThrow()
        expect(() => re.goToClaimForEdit("sA")).not.toThrow()
    })

    it("runEvaluation runs in readonly mode and sets lastResult", async () => {
        const { re } = await buildCompletedReadonly()
        const result = await re.runEvaluation()
        expect(result.schemaVersion).toBe(1)
        expect(re.getSnapshot().lastResult).toBe(result)
    })

    it("backOutToPremiseLevel is a no-op in readonly mode", () => {
        const argEngine = buildEngineWithTwoPremises()
        const now = new Date("2026-04-14T00:00:00Z")
        // Seed a draft with both a premise-scope and an expression-scope
        // assignment on pConclusion. A non-readonly backOutToPremiseLevel would
        // filter out the expression-scope entry.
        const initialDraft = {
            schemaVersion: 1 as const,
            reviewId: "00000000-0000-0000-0000-00000000000r",
            argumentId: argEngine.getArgument().id,
            argumentVersion: 1,
            userId: undefined,
            createdAt: now,
            updatedAt: now,
            phase: "operators" as const,
            currentStepIndex: 0,
            claimAssignments: {},
            operatorAssignments: [
                {
                    assignmentId: "op-premise",
                    premiseId: "pConclusion",
                    scope: "premise" as const,
                    decision: "accepted" as const,
                    decidedAt: now,
                },
                {
                    assignmentId: "op-expr",
                    premiseId: "pConclusion",
                    expressionId: "eImpliesRoot",
                    scope: "expression" as const,
                    decision: "accepted" as const,
                    decidedAt: now,
                },
            ],
        }
        const re = new ReviewEngine({
            argEngine,
            store: new LocalStorageReviewStore(),
            initialDraft,
            mode: "readonly",
        })
        const before = re.getSnapshot()
        const beforeCount = before.draft.operatorAssignments.length
        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            decision: "rejected",
        })
        const after = re.getSnapshot()
        // Snapshot identity is preserved because notify() never ran.
        expect(after).toBe(before)
        expect(after.draft.operatorAssignments.length).toBe(beforeCount)
        expect(
            after.draft.operatorAssignments.some(
                (o) => o.scope === "expression" && o.premiseId === "pConclusion"
            )
        ).toBe(true)
    })

    it("proceedWithSkippedAsUnknown is a no-op in readonly mode", () => {
        const argEngine = buildEngineWithTwoPremises()
        const now = new Date("2026-04-14T00:00:00Z")
        const skipDecidedAt = new Date("2026-04-14T00:00:00Z")
        // Seed a draft in the claims phase with a skipped claim assignment.
        // A non-readonly proceedWithSkippedAsUnknown would transition phase
        // to "operators" and stamp a fresh decidedAt on the skipped entry.
        const initialDraft = {
            schemaVersion: 1 as const,
            reviewId: "00000000-0000-0000-0000-00000000000r",
            argumentId: argEngine.getArgument().id,
            argumentVersion: 1,
            userId: undefined,
            createdAt: now,
            updatedAt: now,
            phase: "claims" as const,
            currentStepIndex: 0,
            claimAssignments: {
                sA: {
                    assignmentId: "a-sA",
                    claimId: "sA",
                    value: null,
                    skipped: true,
                    decidedAt: skipDecidedAt,
                },
            },
            operatorAssignments: [],
        }
        const re = new ReviewEngine({
            argEngine,
            store: new LocalStorageReviewStore(),
            initialDraft,
            mode: "readonly",
        })
        const before = re.getSnapshot()
        re.proceedWithSkippedAsUnknown()
        const after = re.getSnapshot()
        // Snapshot identity is preserved because notify() never ran.
        expect(after).toBe(before)
        expect(after.draft.phase).toBe("claims")
        expect(after.draft.claimAssignments.sA.decidedAt).toBe(skipDecidedAt)
        expect(after.draft.claimAssignments.sA.skipped).toBe(true)
    })

    it("runValidityCheck is a no-op in readonly mode", async () => {
        const { re } = await buildCompletedReadonly()
        const before = re.getSnapshot()
        const lastResultBefore = before.lastResult
        const listener = vi.fn()
        re.subscribe(listener)
        await re.runValidityCheck()
        const after = re.getSnapshot()
        // Snapshot identity is preserved because notify() never ran.
        expect(after).toBe(before)
        expect(after.lastResult).toBe(lastResultBefore)
        expect(listener).not.toHaveBeenCalled()
    })

    it("reloadFromStore is a no-op in readonly mode", async () => {
        const { re } = await buildCompletedReadonly()
        const before = re.getSnapshot()
        const listener = vi.fn()
        re.subscribe(listener)
        await re.reloadFromStore()
        const after = re.getSnapshot()
        // Snapshot identity is preserved because notify() never ran —
        // draft was not reassigned from the store.
        expect(after).toBe(before)
        expect(after.draft).toBe(before.draft)
        expect(listener).not.toHaveBeenCalled()
    })
})
