import { describe, it, expect } from "vitest"
import {
    buildClaimQueue,
    buildOperatorQueue,
    advanceQueue,
    type TStepQueue,
} from "../../review/step-queue.js"
import {
    buildEngineWithTwoPremises,
    buildEngineWithClaimSharedAcrossPremises,
    buildEngineWithCitationBackedDerivationPremise,
} from "./fixtures.js"

describe("step-queue", () => {
    it("buildClaimQueue yields supporting-first, conclusion-last claim IDs", () => {
        const engine = buildEngineWithTwoPremises()
        expect(buildClaimQueue(engine)).toEqual(["sA", "cA", "cB"])
    })

    it("buildClaimQueue emits a claim referenced across multiple premises exactly once, in proof order", () => {
        // cShared is bound by a variable in the supporting premise AND a
        // variable in the conclusion premise. Core's dedupe must fold both
        // references into a single first-appearance entry.
        const engine = buildEngineWithClaimSharedAcrossPremises()
        const queue = buildClaimQueue(engine)
        expect(queue).toEqual(["cShared", "cOther", "cConcl"])
        expect(queue.filter((id) => id === "cShared")).toHaveLength(1)
    })

    it("buildClaimQueue excludes null-claimId (premise-bound derivation) rows", () => {
        // The engine synthesizes premise-bound derivation-consequent variables
        // (no claimId) for every non-conclusion normal claim. The queue must
        // carry only genuine claim-bound references, never those wrapper rows.
        const engine = buildEngineWithTwoPremises()
        const nullClaimVarCount = engine
            .getVariables()
            .filter((v) => !("claimId" in v)).length
        expect(nullClaimVarCount).toBeGreaterThan(0)
        const queue = buildClaimQueue(engine)
        // Every queued id is a real claim on the engine — no synthesized rows.
        for (const id of queue) {
            expect(engine.getProjectClaim(id)).toBeDefined()
        }
        expect(queue).toEqual(["sA", "cA", "cB"])
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

    it("buildOperatorQueue excludes a citation-backed derivation premise", () => {
        // A claim with ≥1 citation gets a derivation premise shaped
        // implies(citation_var, Q). It is an inference with a decidable
        // operator, so both gates pass — but it is engine-managed wiring, not
        // a user-authored inference step, and must never be offered for review.
        const engine = buildEngineWithCitationBackedDerivationPremise()
        expect(
            engine.getPremise("pDerivation")?.getDecidableOperatorExpressions()
                .length
        ).toBeGreaterThan(0)
        expect(buildOperatorQueue(engine).map((e) => e.premiseId)).toEqual([
            "pSupport",
        ])
    })

    it("buildOperatorQueue omits a conclusion premise that is a bare variable", () => {
        // The queue counts premises that need an operator verdict, not
        // premises. A conclusion premise asserting a single claim has no
        // operator to decide, so it is absent by design — the operator-queue
        // length is not a premise count and consumers must not label it as one.
        const engine = buildEngineWithCitationBackedDerivationPremise()
        expect(
            engine.getConclusionPremise()?.getDecidableOperatorExpressions()
        ).toEqual([])
        expect(
            buildOperatorQueue(engine).map((e) => e.premiseId)
        ).not.toContain("pConclusion")
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
