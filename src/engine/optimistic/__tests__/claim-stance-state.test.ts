import { describe, expect, it } from "vitest"

import {
    applyStance,
    bucketOf,
    clearOwn,
    type TClaimReactionState,
} from "../claim-stance-state.js"
import {
    stanceGoldenFloorStart,
    stanceGoldenScript,
    stanceGoldenStart,
} from "../../__tests__/derived-view-goldens.js"

// Locked assertion over the shared golden script. Server + mobile can replay
// the same fixtures against their local copy and diff the folded output to
// prove byte-identical behavior before deleting it.
describe("claim-stance-state golden", () => {
    it("maps trivalent value to a stance bucket", () => {
        expect(bucketOf(true)).toBe("affirm")
        expect(bucketOf(false)).toBe("disagree")
        expect(bucketOf(null)).toBe("neutral")
    })

    it("folds the golden script to the locked state sequence", () => {
        const states: TClaimReactionState[] = []
        let state = stanceGoldenStart as TClaimReactionState
        for (const step of stanceGoldenScript) {
            state =
                step.op === "apply"
                    ? applyStance(state, step.value, step.reasonCode)
                    : clearOwn(state)
            states.push(state)
        }

        expect(states).toEqual([
            // none → affirm: increments affirm, sets own.
            {
                counts: { affirm: 1, disagree: 0, neutral: 0 },
                own: { value: true, reasonCode: "common-knowledge" },
            },
            // same bucket, different reason: in-place upsert, counts unchanged.
            {
                counts: { affirm: 1, disagree: 0, neutral: 0 },
                own: { value: true, reasonCode: "expert-consensus" },
            },
            // affirm → disagree: count moves across buckets.
            {
                counts: { affirm: 0, disagree: 1, neutral: 0 },
                own: { value: false, reasonCode: "factually-incorrect" },
            },
            // disagree → neutral: count moves across buckets.
            {
                counts: { affirm: 0, disagree: 0, neutral: 1 },
                own: { value: null, reasonCode: "unknowable" },
            },
            // clear: decrements the held bucket, clears own.
            { counts: { affirm: 0, disagree: 0, neutral: 0 }, own: null },
            // redundant clear: no-op when own is already null.
            { counts: { affirm: 0, disagree: 0, neutral: 0 }, own: null },
        ])
    })

    it("does not mutate the input state", () => {
        const start = stanceGoldenStart as TClaimReactionState
        applyStance(start, true, "common-knowledge")
        expect(start).toEqual({
            counts: { affirm: 0, disagree: 0, neutral: 0 },
            own: null,
        })
    })

    it("returns the same reference when clearing an already-empty own", () => {
        const start = stanceGoldenStart as TClaimReactionState
        expect(clearOwn(start)).toBe(start)
    })

    it("floors the decremented count at 0", () => {
        const next = clearOwn(stanceGoldenFloorStart as TClaimReactionState)
        expect(next.counts.affirm).toBe(0)
        expect(next.own).toBeNull()
    })
})
