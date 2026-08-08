import { describe, it, expect } from "vitest"
import { outermostDecidableOperator } from "../decision-target.js"
import { buildOperatorQueue } from "../step-queue.js"
import { buildExpressionAssignment } from "../evaluation.js"
import {
    buildEngineWithNegatedPremises,
    buildEngineWithConjunctiveAntecedent,
    buildEngineWithTwoPremises,
} from "./fixtures.js"
import type { TReviewDraft } from "../../../schemas/review.js"

const NOW = new Date("2026-04-14T00:00:00Z")

function draftAccepting(premiseId: string): TReviewDraft {
    return {
        schemaVersion: 1,
        reviewId: "r",
        argumentId: "a",
        argumentVersion: 1,
        createdAt: NOW,
        updatedAt: NOW,
        phase: "operators",
        currentStepIndex: 0,
        claimAssignments: {},
        operatorAssignments: [
            {
                assignmentId: "o1",
                premiseId,
                scope: "premise",
                decision: "accepted",
                decidedAt: NOW,
            },
        ],
    }
}

describe("outermostDecidableOperator", () => {
    it("recurses through a negation to the operator underneath", () => {
        const engine = buildEngineWithNegatedPremises()
        const premise = engine.getPremise("pNegatedConjunction")!
        expect(outermostDecidableOperator(premise)?.id).toBe("eInnerAnd")
    })

    it("offers nothing for a negated atom", () => {
        const engine = buildEngineWithNegatedPremises()
        const premise = engine.getPremise("pNegatedAtom")!
        expect(outermostDecidableOperator(premise)).toBeUndefined()
    })

    it("offers nothing for a premise that is a bare variable", () => {
        const engine = buildEngineWithNegatedPremises()
        expect(
            outermostDecidableOperator(engine.getConclusionPremise()!)
        ).toBeUndefined()
    })

    it("stops at the root operator rather than descending to a nested one", () => {
        const engine = buildEngineWithConjunctiveAntecedent()
        const premise = engine.getConclusionPremise()!
        // (A ∧ B) → Q — the decision is about the implication, never the
        // conjunction inside its antecedent.
        expect(outermostDecidableOperator(premise)?.id).toBe("eImplies")
        expect(premise.getDecidableOperatorExpressions().length).toBe(2)
    })
})

describe("buildOperatorQueue decision targets", () => {
    it("carries each premise's decision target", () => {
        const engine = buildEngineWithTwoPremises()
        const queue = buildOperatorQueue(engine)
        const byPremise = Object.fromEntries(
            queue.map((e) => [e.premiseId, e.expressionId])
        )
        expect(byPremise.pSupport).toBe("eSupportRoot")
        expect(byPremise.pConclusion).toBe("eImpliesRoot")
    })

    it("omits a premise whose only operator is a negation", () => {
        const engine = buildEngineWithNegatedPremises()
        expect(
            buildOperatorQueue(engine).map((e) => e.premiseId)
        ).not.toContain("pNegatedAtom")
    })
})

describe("buildExpressionAssignment decision targets", () => {
    it("assigns only the outermost operator when a conjunctive antecedent is accepted", () => {
        const engine = buildEngineWithConjunctiveAntecedent()
        const assignment = buildExpressionAssignment(
            draftAccepting("pConjunctiveConclusion"),
            engine
        )
        expect(Object.keys(assignment.operatorAssignments)).toEqual([
            "eImplies",
        ])
    })

    it("assigns nothing to the conjuncts of an accepted conjunctive antecedent", () => {
        const engine = buildEngineWithConjunctiveAntecedent()
        const draft = draftAccepting("pConjunctiveConclusion")
        const result = engine.evaluate(
            buildExpressionAssignment(draft, engine),
            {
                validateFirst: true,
                strictUnknownAssignmentKeys: false,
                includeDiagnostics: true,
            }
        )
        expect(result.ok).toBe(true)
        expect(result.propagatedVariableValues!.vA).toBe(null)
        expect(result.propagatedVariableValues!.vB).toBe(null)
    })
})
