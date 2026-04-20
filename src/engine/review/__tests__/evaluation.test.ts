import { describe, it, expect } from "vitest"
import {
    buildExpressionAssignment,
    toEvaluationContext,
    evaluateArgumentForReview,
} from "../../review/evaluation.js"
import { buildEngineWithTwoPremises } from "./fixtures.js"
import type { TReviewDraft } from "../../../schemas/review.js"

function draftSkeleton(): TReviewDraft {
    const now = new Date()
    return {
        schemaVersion: 1,
        reviewId: "00000000-0000-0000-0000-000000000001",
        argumentId: "00000000-0000-0000-0000-000000000002",
        argumentVersion: 1,
        userId: undefined,
        createdAt: now,
        updatedAt: now,
        phase: "operators",
        currentStepIndex: 0,
        claimAssignments: {
            sA: {
                assignmentId: "1",
                claimId: "sA",
                value: true,
                skipped: false,
                decidedAt: now,
            },
            cA: {
                assignmentId: "2",
                claimId: "cA",
                value: true,
                skipped: false,
                decidedAt: now,
            },
            cB: {
                assignmentId: "3",
                claimId: "cB",
                value: false,
                skipped: false,
                decidedAt: now,
            },
        },
        operatorAssignments: [],
    }
}

describe("evaluation", () => {
    it("toEvaluationContext exposes fields TArgumentEvaluationContext requires", () => {
        const engine = buildEngineWithTwoPremises()
        const ctx = toEvaluationContext(engine)
        expect(ctx.argumentId).toBe(engine.getArgument().id)
        expect(ctx.conclusionPremiseId).toBe("pConclusion")
        expect(typeof ctx.getConclusionPremise).toBe("function")
        expect(typeof ctx.getPremise).toBe("function")
    })

    it("buildExpressionAssignment fans premise-scope decisions to every non-NOT operator expression", () => {
        const engine = buildEngineWithTwoPremises()
        const draft = draftSkeleton()
        draft.operatorAssignments.push({
            assignmentId: "o1",
            premiseId: "pConclusion",
            scope: "premise",
            decision: "accepted",
            decidedAt: new Date(),
        })
        const a = buildExpressionAssignment(draft, engine)
        // pConclusion's IMPLIES root operator should be accepted.
        expect(a.operatorAssignments.eImpliesRoot).toBe("accepted")
    })

    it("expression-scope overrides win over premise-scope", () => {
        const engine = buildEngineWithTwoPremises()
        const draft = draftSkeleton()
        draft.operatorAssignments.push(
            {
                assignmentId: "o1",
                premiseId: "pConclusion",
                scope: "premise",
                decision: "accepted",
                decidedAt: new Date(),
            },
            {
                assignmentId: "o2",
                premiseId: "pConclusion",
                scope: "expression",
                expressionId: "eImpliesRoot",
                decision: "rejected",
                decidedAt: new Date(),
            }
        )
        const a = buildExpressionAssignment(draft, engine)
        expect(a.operatorAssignments.eImpliesRoot).toBe("rejected")
    })

    it("evaluateArgumentForReview runs end-to-end and returns a populated result", () => {
        const engine = buildEngineWithTwoPremises()
        const draft = draftSkeleton()
        draft.operatorAssignments.push(
            {
                assignmentId: "o1",
                premiseId: "pSupport",
                scope: "premise",
                decision: "accepted",
                decidedAt: new Date(),
            },
            {
                assignmentId: "o2",
                premiseId: "pConclusion",
                scope: "premise",
                decision: "accepted",
                decidedAt: new Date(),
            }
        )
        const result = evaluateArgumentForReview(draft, engine)
        expect(result.ok).toBe(true)
        expect(typeof result.conclusionTrue === "boolean").toBe(true)
        // 0.9.0+: argument-wide propagated map is populated with includeDiagnostics: true
        expect(result.propagatedVariableValues).toBeDefined()
    })
})
