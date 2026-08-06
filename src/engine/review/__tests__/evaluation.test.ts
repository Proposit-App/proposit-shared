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
    buildEngineWithConclusionThroughCitedClaim,
} from "./fixtures.js"
import { buildClaimQueue, buildOperatorQueue } from "../../review/step-queue.js"
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

    // Bug fix regression test.
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

    // The shape the claim-queue narrowing is riskiest on: nothing reaches the
    // conclusion except through `cCited`, and `cCited` is backed by a source.
    // The source is no longer queued, so its variable enters evaluation
    // unassigned, leaving the derivation premise `implies(source_var, Cited)`
    // with an unknown antecedent.
    function reviewConclusionThroughCitedClaim(claimValues: {
        cCited: boolean
        cQ: boolean
    }) {
        const engine = buildEngineWithConclusionThroughCitedClaim()
        const now = new Date()

        // Answer exactly what the reviewer is offered — nothing more.
        const queue = buildClaimQueue(engine)
        expect(queue).toEqual(["cCited", "cQ"])
        const claimAssignments = Object.fromEntries(
            queue.map((claimId, i) => [
                claimId,
                {
                    assignmentId: `a-${i}`,
                    claimId,
                    value: claimValues[claimId as keyof typeof claimValues],
                    skipped: false,
                    decidedAt: now,
                },
            ])
        )

        const draft: TReviewDraft = {
            schemaVersion: 1,
            reviewId: "00000000-0000-0000-0000-000000000003",
            argumentId: engine.getArgument().id,
            argumentVersion: 1,
            userId: undefined,
            createdAt: now,
            updatedAt: now,
            phase: "operators",
            currentStepIndex: 0,
            claimAssignments,
            operatorAssignments: buildOperatorQueue(engine).map((entry, i) => ({
                assignmentId: `o-${i}`,
                premiseId: entry.premiseId,
                scope: entry.scope,
                decision: "accepted" as const,
                decidedAt: now,
            })),
        }

        return evaluateArgumentForReview(draft, engine)
    }

    it("reaches a decided verdict when the only path to the conclusion runs through an accepted cited claim", () => {
        // `implies(unknown, true)` is true, so leaving the source unassigned
        // costs nothing: the derivation premise holds on the strength of the
        // derived claim alone.
        const result = reviewConclusionThroughCitedClaim({
            cCited: true,
            cQ: true,
        })
        expect(result.ok).toBe(true)
        expect(result.allSupportingPremisesTrue).toBe(true)
        expect(result.conclusionTrue).toBe(true)
    })

    it("leaves soundness unknown when a cited claim is rejected and the conclusion holds", () => {
        // `implies(unknown, false)` is unknown — the derivation premise can
        // only be true if the source is also false, and the source is no
        // longer something the reviewer is asked about. Soundness is therefore
        // undetermined rather than false.
        //
        // This is the one combination in the shape that does not settle. It is
        // not reachable through the conclusion, which still decides, and it is
        // not a rendering problem — whether rejecting a sourced claim ought to
        // make an argument unsound is a question about evaluation semantics,
        // not about which claims are queued.
        const result = reviewConclusionThroughCitedClaim({
            cCited: false,
            cQ: true,
        })
        expect(result.ok).toBe(true)
        expect(result.allSupportingPremisesTrue).toBe(null)
        expect(result.conclusionTrue).toBe(true)
    })

    it("still fails a rejected conclusion regardless of the unassigned source", () => {
        const result = reviewConclusionThroughCitedClaim({
            cCited: false,
            cQ: false,
        })
        expect(result.ok).toBe(true)
        expect(result.conclusionTrue).toBe(false)
    })
})
