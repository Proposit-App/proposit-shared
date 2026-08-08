import { describe, it, expect } from "vitest"
import {
    CONTRADICTORY_PREMISE_SET_NOTICE,
    detectContradictions,
    reviewCoherence,
} from "../contradiction.js"
import { evaluateArgumentForReview } from "../evaluation.js"
import type { PropositArgumentEngine } from "../../engine.js"
import type { TReviewDraft } from "../../../schemas/review.js"
import {
    buildEngineWithClaimSharedAcrossPremises,
    buildEngineWithDerivationChain,
    buildEngineWithRestrictionConflict,
    buildEngineWithUnsatisfiablePremises,
    buildEngineWithTwoPremises,
} from "./fixtures.js"

const NOW = new Date("2026-04-14T00:00:00Z")

function draft(
    claims: Record<string, boolean | null>,
    operators: Record<string, "accepted" | "rejected">
): TReviewDraft {
    return {
        schemaVersion: 1,
        reviewId: "r",
        argumentId: "a",
        argumentVersion: 1,
        createdAt: NOW,
        updatedAt: NOW,
        phase: "done",
        currentStepIndex: 0,
        claimAssignments: Object.fromEntries(
            Object.entries(claims).map(([claimId, value]) => [
                claimId,
                {
                    assignmentId: claimId,
                    claimId,
                    value,
                    skipped: false,
                    decidedAt: NOW,
                },
            ])
        ),
        operatorAssignments: Object.entries(operators).map(
            ([premiseId, decision]) => ({
                assignmentId: premiseId,
                premiseId,
                scope: "premise" as const,
                decision,
                decidedAt: NOW,
            })
        ),
    }
}

function coherenceOf(
    argEngine: PropositArgumentEngine,
    d: TReviewDraft
): ReturnType<typeof reviewCoherence> {
    return reviewCoherence({
        evaluation: evaluateArgumentForReview(d, argEngine),
        argEngine,
        draft: d,
    })
}

describe("detectContradictions — one-sidedness", () => {
    // pSupportShared is implies(cShared, cOther). cShared true and cOther false
    // makes it evaluate false under the reader's own values.
    const accepted = draft(
        { cShared: true, cOther: false, cConcl: null },
        { pSupportShared: "accepted" }
    )
    const rejected = draft(
        { cShared: true, cOther: false, cConcl: null },
        { pSupportShared: "rejected" }
    )

    it("reports an accepted premise that comes out false", () => {
        const argEngine = buildEngineWithClaimSharedAcrossPremises()
        const found = detectContradictions({
            evaluation: evaluateArgumentForReview(accepted, argEngine),
            argEngine,
            draft: accepted,
        })
        expect(found.map((c) => c.premiseId)).toEqual(["pSupportShared"])
    })

    it("reports nothing for the same premise once it is rejected", () => {
        // Rejecting strikes the premise. Its truth value is then not a
        // disagreement with anything — a two-sided check would flag every
        // rejection in the system.
        const argEngine = buildEngineWithClaimSharedAcrossPremises()
        const found = detectContradictions({
            evaluation: evaluateArgumentForReview(rejected, argEngine),
            argEngine,
            draft: rejected,
        })
        expect(found).toEqual([])
    })

    it("reports nothing when a value is left unknown", () => {
        // An explicit unknown is a decision but not an assertion, so it cannot
        // collide with anything.
        const argEngine = buildEngineWithClaimSharedAcrossPremises()
        const d = draft(
            { cShared: true, cOther: null },
            { pSupportShared: "accepted" }
        )
        expect(
            detectContradictions({
                evaluation: evaluateArgumentForReview(d, argEngine),
                argEngine,
                draft: d,
            })
        ).toEqual([])
    })
})

describe("detectContradictions — localization and prose", () => {
    // P true, R false, both steps accepted. Every value along the chain comes
    // out both ways, and either accepted step is a way out of it.
    const chainDraft = draft(
        { cP: true, cR: false, cQ: null },
        { pFirstStep: "accepted", pSecondStep: "accepted" }
    )

    function chainContradictions() {
        const argEngine = buildEngineWithDerivationChain()
        return detectContradictions({
            evaluation: evaluateArgumentForReview(chainDraft, argEngine),
            argEngine,
            draft: chainDraft,
        })
    }

    function secondStep() {
        return chainContradictions().find((c) => c.premiseId === "pSecondStep")!
    }

    it("reports every accepted step the collision runs through", () => {
        const found = chainContradictions()
        expect(found.map((c) => c.premiseId).sort()).toEqual([
            "pFirstStep",
            "pSecondStep",
        ])
        expect(secondStep().premiseTitle).toBe("If Q then R")
    })

    it("names the commitment the premise's operator implies", () => {
        expect(secondStep().commitment).toBe(
            "By accepting this premise you are saying there is no circumstance where Q holds is true and R holds is false, however you have assigned values that contradict this."
        )
    })

    it("says what settled a value both ways, and names what to change", () => {
        const found = secondStep()
        const forQ = found.provenance.find((p) => p.includes("“Q holds”"))!
        expect(forQ).toContain("comes out both true and false")
        expect(forQ).toContain("“If P then Q”")
        expect(forQ).toContain("“If Q then R”")
        expect(forQ).toContain("Changing either side resolves it.")
        // R is the reader's own value, so it is named as one half rather than
        // reported as something they never touched.
        const forR = found.provenance.find((p) => p.includes("“R holds”"))!
        expect(forR).toContain("You assigned it one way")
    })

    it("renders claim titles rather than variable letters", () => {
        expect(
            secondStep()
                .values.map((v) => v.title)
                .sort()
        ).toEqual(["Q holds", "R holds"])
    })

    it("draws the premise's own operator over its operand values", () => {
        const found = secondStep()
        expect(found.notation).toBe("Contested → Contested")
        // Derivation is never a second arrow: the alert would then read as a
        // nested implication.
        expect(found.provenance.join(" ")).not.toContain("→")
    })
})

describe("detectContradictions — exits", () => {
    const chainDraft = draft(
        { cP: true, cR: false, cQ: null },
        { pFirstStep: "accepted", pSecondStep: "accepted" }
    )

    it("offers both ways out", () => {
        const argEngine = buildEngineWithDerivationChain()
        const [, found] = detectContradictions({
            evaluation: evaluateArgumentForReview(chainDraft, argEngine),
            argEngine,
            draft: chainDraft,
        })
        expect(found.exits.some((e) => e.kind === "reject-premise")).toBe(true)
        expect(found.exits.some((e) => e.kind === "change-assignment")).toBe(
            true
        )
    })

    it("names the inductive exit rather than telling the reader they erred", () => {
        const argEngine = buildEngineWithDerivationChain()
        const [found] = detectContradictions({
            evaluation: evaluateArgumentForReview(chainDraft, argEngine),
            argEngine,
            draft: chainDraft,
        })
        const reject = found.exits.find((e) => e.kind === "reject-premise")!
        expect(reject.reasonCode).toBe("counterexamples-exist")
        expect(reject.detail).toContain("generally holds but not in this case")
    })

    it("offers the assignments behind a derived value, not the derived value", () => {
        // The collision shows `Q holds` true, but the reader never assigned it.
        // Offering to change Q would send them after a value they did not set.
        const argEngine = buildEngineWithDerivationChain()
        const [, found] = detectContradictions({
            evaluation: evaluateArgumentForReview(chainDraft, argEngine),
            argEngine,
            draft: chainDraft,
        })
        const offered = found.exits
            .filter((e) => e.kind === "change-assignment")
            .map((e) => e.label)
        expect(offered).toContain("Change your answer for “P holds”")
        expect(offered).toContain("Change your answer for “R holds”")
        expect(offered).not.toContain("Change your answer for “Q holds”")
    })
})

describe("detectContradictions — restriction premises", () => {
    // P true with both inferences granted derives A and B, which the granted
    // restriction rules out.
    const d = draft(
        { cP: true, cA: null, cB: null },
        { pToA: "accepted", pToB: "accepted", pRestriction: "accepted" }
    )

    it("reports the restriction as the colliding premise", () => {
        const argEngine = buildEngineWithRestrictionConflict()
        const found = detectContradictions({
            evaluation: evaluateArgumentForReview(d, argEngine),
            argEngine,
            draft: d,
        })
        expect(found.map((c) => c.premiseId)).toEqual(["pRestriction"])
        expect(found[0].premiseKind).toBe("restriction")
    })

    it("reads as declining, never as denying or refuting", () => {
        const argEngine = buildEngineWithRestrictionConflict()
        const [found] = detectContradictions({
            evaluation: evaluateArgumentForReview(d, argEngine),
            argEngine,
            draft: d,
        })
        const reject = found.exits.find((e) => e.kind === "reject-premise")!
        expect(reject.label).toBe("Decline this constraint")
        expect(reject.detail).toContain("Nothing is claimed false")
        const strings = [
            found.commitment,
            found.notation,
            ...found.provenance,
            ...found.exits.flatMap((e) => [e.label, e.detail]),
        ]
        expect(
            strings.filter((s) => /den(y|ied|ies)|refut|refus/i.test(s))
        ).toEqual([])
    })

    it("blocks completion, because the reader has a resolution", () => {
        const argEngine = buildEngineWithRestrictionConflict()
        const coherence = coherenceOf(argEngine, d)
        expect(coherence.state).toBe("reader-resolvable")
        expect(coherence.blocksCompletion).toBe(true)
    })

    it("clears once the reader declines the constraint", () => {
        const argEngine = buildEngineWithRestrictionConflict()
        const resolved = draft(
            { cP: true, cA: null, cB: null },
            { pToA: "accepted", pToB: "accepted", pRestriction: "rejected" }
        )
        const coherence = coherenceOf(argEngine, resolved)
        expect(coherence.state).toBe("coherent")
        expect(coherence.blocksCompletion).toBe(false)
    })
})

describe("reviewCoherence — an unsatisfiable premise set", () => {
    const d = draft({ cA: null, cB: null }, { pRestriction: "accepted" })

    it("tells the reader without blocking them", () => {
        const argEngine = buildEngineWithUnsatisfiablePremises()
        const coherence = coherenceOf(argEngine, d)
        expect(coherence.state).toBe("premises-contradict")
        expect(coherence.blocksCompletion).toBe(false)
        expect(coherence.notice).toBe(CONTRADICTORY_PREMISE_SET_NOTICE)
    })

    it("describes the conflict without allocating fault", () => {
        // Satisfiability says a resolution does not exist. It says nothing
        // about who is responsible, and no copy may.
        expect(CONTRADICTORY_PREMISE_SET_NOTICE).not.toMatch(
            /author|your fault|you erred|mistake|wrong/i
        )
    })
})

describe("reviewCoherence — a review with nothing wrong", () => {
    it("is coherent and blocks nothing", () => {
        const argEngine = buildEngineWithDerivationChain()
        const d = draft(
            { cP: true, cR: null, cQ: null },
            { pFirstStep: "accepted", pSecondStep: "accepted" }
        )
        const coherence = coherenceOf(argEngine, d)
        expect(coherence.state).toBe("coherent")
        expect(coherence.contradictions).toEqual([])
    })
})

describe("reviewCoherence — a collision inside the conclusion premise", () => {
    // The operator queue offers the conclusion premise whenever it carries a
    // decidable operator, so the reader can be invited to accept the very step
    // that collides with their own values. The byte-identical collision inside
    // a supporting premise blocks the review.
    const d = draft({ cA: true, cB: false }, { pConclusion: "accepted" })

    it("blocks the review and names the conclusion premise", () => {
        const argEngine = buildEngineWithTwoPremises()
        const coherence = coherenceOf(argEngine, d)
        expect(coherence.contradictions.map((c) => c.premiseId)).toContain(
            "pConclusion"
        )
        expect(coherence.state).toBe("reader-resolvable")
        expect(coherence.blocksCompletion).toBe(true)
    })

    it("carries the alert's material, not just the block", () => {
        const argEngine = buildEngineWithTwoPremises()
        const found = coherenceOf(argEngine, d).contradictions.find(
            (c) => c.premiseId === "pConclusion"
        )!
        expect(found.provenance.length).toBeGreaterThan(0)
        expect(found.exits.some((e) => e.kind === "change-assignment")).toBe(
            true
        )
        expect(found.exits.some((e) => e.kind === "reject-premise")).toBe(true)
    })
})

describe("reviewCoherence — a collision every aggregate reads clean on", () => {
    it("shows a contested variable the premise-level tests cannot see", () => {
        const argEngine = buildEngineWithTwoPremises()
        const d = draft({ cA: true, cB: false }, { pConclusion: "accepted" })
        const evaluation = evaluateArgumentForReview(d, argEngine)
        expect(evaluation.contestedVariableIds?.length).toBeGreaterThan(0)
        const coherence = reviewCoherence({ evaluation, argEngine, draft: d })
        // The forward rule transfers only the told-true component, so a
        // contested variable can leave every aggregate reading clean. The
        // result carries the ids regardless, and the gate reads them.
        expect(coherence.contestedVariableIds).toEqual(
            evaluation.contestedVariableIds
        )
        expect(coherence.blocksCompletion).toBe(true)
    })

    it("reports no contested variables for a review with nothing wrong", () => {
        const argEngine = buildEngineWithDerivationChain()
        const d = draft(
            { cP: true, cR: null, cQ: null },
            { pFirstStep: "accepted", pSecondStep: "accepted" }
        )
        expect(coherenceOf(argEngine, d).contestedVariableIds).toEqual([])
    })
})
