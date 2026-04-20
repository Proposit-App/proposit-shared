import { describe, it, expect } from "vitest"
import {
    buildClaimQueue,
    buildOperatorQueue,
    advanceQueue,
    type TStepQueue,
} from "../../review/step-queue.js"
import { buildEngineWithTwoPremises } from "./fixtures.js"

describe("step-queue", () => {
    it("buildClaimQueue yields supporting-first, conclusion-last claim IDs", () => {
        const engine = buildEngineWithTwoPremises()
        expect(buildClaimQueue(engine)).toEqual(["sA", "cA", "cB"])
    })

    it("buildOperatorQueue returns premises that have at least one decidable operator", () => {
        const engine = buildEngineWithTwoPremises()
        const queue = buildOperatorQueue(engine)
        expect(queue.map((e) => e.premiseId).sort()).toEqual([
            "pConclusion",
            "pSupport",
        ])
        expect(queue.every((e) => e.scope === "premise")).toBe(true)
    })

    it("advanceQueue moves forward when not at end", () => {
        const q: TStepQueue = { kind: "claim", items: ["a", "b", "c"] }
        expect(
            advanceQueue({
                queue: q,
                currentIndex: 0,
                skippedKeys: new Set(),
                decidedKeys: new Set(["a"]),
            })
        ).toEqual({ nextIndex: 1, insertRequeueNotice: false })
    })

    it("advanceQueue re-queues at end-of-phase when skipped items remain", () => {
        const q: TStepQueue = { kind: "claim", items: ["a", "b", "c"] }
        expect(
            advanceQueue({
                queue: q,
                currentIndex: 2,
                skippedKeys: new Set(["b"]),
                decidedKeys: new Set(["a", "c"]),
            })
        ).toEqual({ nextIndex: 1, insertRequeueNotice: true })
    })

    it("advanceQueue reports done when everything decided at end", () => {
        const q: TStepQueue = { kind: "claim", items: ["a", "b"] }
        expect(
            advanceQueue({
                queue: q,
                currentIndex: 1,
                skippedKeys: new Set(),
                decidedKeys: new Set(["a", "b"]),
            })
        ).toEqual({ done: true })
    })
})
