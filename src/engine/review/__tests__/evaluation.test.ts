import { describe, it, expect } from "vitest"
import {
    buildExpressionAssignment,
    toEvaluationContext,
    evaluateArgumentForReview,
} from "../../review/evaluation.js"
import {
    buildEngineWithTwoPremises,
    buildEngineWithAxiomaticConclusion,
    buildEngineWithNakedQSupportingPremise,
} from "./fixtures.js"
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

    // Bug fix regression test (followups-sweep-2026-05, C1).
    //
    // Pre-fix, `evaluateArgumentForReview` constructed an evaluation context
    // manually (`toEvaluationContext`) and called the standalone
    // `evaluateArgument` directly. That bypassed two safety nets that
    // `ArgumentEngine.evaluate()` applies in core 1.0:
    //   1. Axiomatic-bound variables are forced to `true` before evaluation.
    //   2. Naked-Q derivation premises are filtered out of the eval context.
    //
    // The user-visible symptom was a "Indeterminate" verdict on arguments that
    // should evaluate cleanly post-Grammar-Tiers 1.0. See investigation report:
    // proposit-server/docs/research/2026-05-16-review-indeterminate-bug.md.
    it("forces axiomatic-bound variables to true (does NOT return Indeterminate)", () => {
        const engine = buildEngineWithAxiomaticConclusion()
        const now = new Date()
        // Draft assigns NOTHING — the axiom variable is intentionally left
        // unassigned (the wizard never offers an axiom for user assignment).
        // The conclusion premise is `ax_var` (a single-variable expression
        // bound to the axiomatic claim).
        const draft: TReviewDraft = {
            schemaVersion: 1,
            reviewId: "00000000-0000-0000-0000-000000000001",
            argumentId: engine.getArgument().id,
            argumentVersion: 1,
            userId: undefined,
            createdAt: now,
            updatedAt: now,
            phase: "operators",
            currentStepIndex: 0,
            claimAssignments: {},
            operatorAssignments: [],
        }
        const result = evaluateArgumentForReview(draft, engine)
        // Pre-fix: result.conclusionTrue === null → UI shows "Indeterminate".
        // Post-fix: axiom var forced true → conclusion var true → conclusionTrue === true.
        expect(result.ok).toBe(true)
        expect(result.conclusionTrue).toBe(true)
    })

    it("filters naked-Q derivation premises out of supporting-premise evaluation", () => {
        const engine = buildEngineWithNakedQSupportingPremise()
        const now = new Date()
        // Assign the conclusion claim (`cConclusion`) true. The naked-Q
        // derivation premise binds to `cDerived` which the user does NOT
        // assign (claim queue should not surface it — but if the filter is
        // missing the premise still contributes a null to the supporting
        // chain).
        const draft: TReviewDraft = {
            schemaVersion: 1,
            reviewId: "00000000-0000-0000-0000-000000000002",
            argumentId: engine.getArgument().id,
            argumentVersion: 1,
            userId: undefined,
            createdAt: now,
            updatedAt: now,
            phase: "operators",
            currentStepIndex: 0,
            claimAssignments: {
                cConclusion: {
                    assignmentId: "a-conclusion",
                    claimId: "cConclusion",
                    value: true,
                    skipped: false,
                    decidedAt: now,
                },
            },
            operatorAssignments: [],
        }
        const result = evaluateArgumentForReview(draft, engine)
        // Pre-fix: naked-Q derivation premise's variable `cDerived` is null
        // (no user assignment) → its premise evaluates to null →
        // `allSupportingPremisesTrue` is null → "Indeterminate".
        // Post-fix: filter excludes the naked-Q premise; only the conclusion
        // premise remains (its single var = cConclusion = true).
        expect(result.ok).toBe(true)
        expect(result.conclusionTrue).toBe(true)
    })
})
