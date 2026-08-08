import { describe, it, expect } from "vitest"
import { ReviewEngine } from "../review-engine.js"
import type { TReviewStore } from "../review-store.js"
import { isReviewComplete } from "../wire.js"
import {
    buildEngineWithRestrictionConflict,
    buildEngineWithUnsatisfiablePremises,
} from "./fixtures.js"

/** The phase machine is what is under test here, not persistence. */
const memoryStore = (): TReviewStore => {
    let saved: Parameters<TReviewStore["save"]>[1] | undefined
    return {
        load: () => Promise.resolve(saved),
        save: (_key, state) => {
            saved = state
            return Promise.resolve()
        },
        clear: () => {
            saved = undefined
            return Promise.resolve()
        },
        upsertClaimAssignment: () => Promise.resolve(),
        upsertOperatorAssignment: () => Promise.resolve(),
        saveResult: () => Promise.resolve(),
        keyFor: (key) =>
            `${key.argumentId}:${key.argumentVersion}:${key.userId ?? ""}`,
    }
}

function buildBlockedReview(): ReviewEngine {
    // P true with both inferences granted derives A and B, which the granted
    // restriction rules out. The premise set is satisfiable (take P false), so
    // the reader has a resolution and is held at the gate until they take it.
    const re = new ReviewEngine({
        argEngine: buildEngineWithRestrictionConflict(),
        store: memoryStore(),
    })
    re.start()
    re.setClaimValue("cP", true)
    for (const premiseId of ["pToA", "pToB", "pRestriction"]) {
        re.setOperatorAssignment({
            premiseId,
            scope: "premise",
            decision: "accepted",
        })
    }
    re.jumpToResults()
    return re
}

describe("the blocked review state", () => {
    it("holds a review with a resolvable contradiction at the gate", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("blocked")
        expect(isReviewComplete(snap.draft)).toBe(false)
        expect(snap.coherence?.state).toBe("reader-resolvable")
        expect(snap.coherence?.contradictions).toHaveLength(1)
    })

    it("still renders the results step while blocked", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.currentStep).toEqual({ kind: "results" })
        expect(snap.canRunEvaluation).toBe(true)
    })

    it("cannot be stepped past", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        re.advanceStep()
        expect(re.getSnapshot().draft.phase).toBe("blocked")
    })

    it("returns to done once the reader resolves the collision", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        re.setOperatorAssignment({
            premiseId: "pRestriction",
            scope: "premise",
            decision: "rejected",
        })
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("done")
        expect(isReviewComplete(snap.draft)).toBe(true)
        expect(snap.coherence?.state).toBe("coherent")
    })

    it("never blocks a reader over premises that cannot all hold", async () => {
        // No assignment of theirs could have changed the outcome, so they are
        // told at the start and left free to finish.
        const re = new ReviewEngine({
            argEngine: buildEngineWithUnsatisfiablePremises(),
            store: memoryStore(),
        })
        re.start()
        re.setOperatorAssignment({
            premiseId: "pRestriction",
            scope: "premise",
            decision: "accepted",
        })
        re.jumpToResults()
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.coherence?.state).toBe("premises-contradict")
        expect(snap.draft.phase).toBe("done")
        expect(isReviewComplete(snap.draft)).toBe(true)
        expect(snap.coherence?.notice).toBeDefined()
        expect(snap.assessment?.argument.outcome).toBe("premises-contradict")
    })
})
