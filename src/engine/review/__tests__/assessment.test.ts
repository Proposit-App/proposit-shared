import { describe, it, expect } from "vitest"
import {
    CONTESTED,
    type TCoreArgumentEvaluationResult,
} from "@proposit/proposit-core"
import {
    ARGUMENT_OUTCOME_LABELS,
    ARGUMENT_REASON_TEXT,
    CONCLUSION_ASSERTED_STATEMENT,
    CONCLUSION_ONLY_ASSERTED_STATEMENT,
    CONCLUSION_REACHED_STATEMENT,
    CONCLUSION_VALUE_LABELS,
    argumentAssessmentLine,
    composeAssessment,
    conclusionAssessmentLine,
} from "../assessment.js"
import { evaluateArgumentForReview } from "../evaluation.js"
import {
    buildEngineWithRedundantSupport,
    buildEngineWithTwoPremises,
} from "./fixtures.js"
import type { TReviewDraft } from "../../../schemas/review.js"

function evaluation(
    over: Partial<TCoreArgumentEvaluationResult> = {}
): TCoreArgumentEvaluationResult {
    return {
        ok: true,
        conclusionTrue: null,
        struckPremiseIds: [],
        survivingSupportingPremiseCount: 1,
        survivingSupportingPremisesTrue: null,
        premisesHoldConclusionFalse: false,
        premiseSetSatisfiable: true,
        conclusionAttribution: {
            assertedByReader: false,
            reachedWithoutAssertion: false,
        },
        ...over,
    }
}

describe("composeAssessment — conclusion axis", () => {
    it("maps every conclusion value onto its label", () => {
        const cases = [
            [true, "true"],
            [false, "false"],
            [null, "unknown"],
            [CONTESTED, "contested"],
        ] as const
        for (const [conclusionTrue, value] of cases) {
            const a = composeAssessment(evaluation({ conclusionTrue }))!
            expect(a.conclusion.value).toBe(value)
            expect(a.conclusion.label).toBe(CONCLUSION_VALUE_LABELS[value])
        }
    })

    it("keeps a value settled both ways distinct from one nobody settled", () => {
        const contested = composeAssessment(
            evaluation({ conclusionTrue: CONTESTED })
        )!
        const unsettled = composeAssessment(
            evaluation({ conclusionTrue: null })
        )!
        expect(contested.conclusion.value).not.toBe(unsettled.conclusion.value)
        expect(contested.conclusion.label).not.toBe(unsettled.conclusion.label)
    })

    it("keeps the two attribution facts as separate statements", () => {
        const a = composeAssessment(
            evaluation({
                conclusionTrue: true,
                conclusionAttribution: {
                    assertedByReader: true,
                    reachedWithoutAssertion: true,
                },
            })
        )!
        // Asserted AND independently derivable is a real combination: the
        // reader agreed with an argument that also works. Recording only
        // "asserted" would deny a good argument all credit.
        expect(a.conclusion.statements).toEqual([
            CONCLUSION_ASSERTED_STATEMENT,
            CONCLUSION_REACHED_STATEMENT,
        ])
    })

    it("says the value holds only because the reader assigned it", () => {
        const a = composeAssessment(
            evaluation({
                conclusionTrue: true,
                conclusionAttribution: {
                    assertedByReader: true,
                    reachedWithoutAssertion: false,
                },
            })
        )!
        expect(a.conclusion.statements).toEqual([
            CONCLUSION_ASSERTED_STATEMENT,
            CONCLUSION_ONLY_ASSERTED_STATEMENT,
        ])
    })

    it("says nothing about attribution when the reader neither assigned nor derived it", () => {
        expect(composeAssessment(evaluation())!.conclusion.statements).toEqual(
            []
        )
    })

    it("claims nothing about holding when the conclusion does not come out true", () => {
        // Core defines `reachedWithoutAssertion` as "the root still comes back
        // *true*", so it is necessarily false for every other value. Both
        // statements are claims about a value that holds, and neither means
        // anything beside False, Unknown or Contested.
        for (const conclusionTrue of [false, null, CONTESTED] as const) {
            const a = composeAssessment(
                evaluation({
                    conclusionTrue,
                    conclusionAttribution: {
                        assertedByReader: true,
                        reachedWithoutAssertion: false,
                    },
                })
            )!
            expect(a.conclusion.statements).toEqual([
                CONCLUSION_ASSERTED_STATEMENT,
            ])
            expect(conclusionAssessmentLine(a.conclusion)).not.toContain(
                "It holds"
            )
        }
    })
})

describe("composeAssessment — argument axis", () => {
    it("reaches its conclusion when the value survives the counterfactual", () => {
        const a = composeAssessment(
            evaluation({
                conclusionTrue: true,
                conclusionAttribution: {
                    assertedByReader: false,
                    reachedWithoutAssertion: true,
                },
            })
        )!
        expect(a.argument.outcome).toBe("reaches-conclusion")
        expect(a.argument.reason).toBeUndefined()
        expect(a.argument.struck.labels).toEqual([])
    })

    it("composes reaching the conclusion with a rejected premise", () => {
        // The redundant-support shape: one path refused, another granted.
        // The badge is separate from the outcome precisely so both can be
        // stated at once.
        const a = composeAssessment(
            evaluation({
                conclusionTrue: true,
                struckPremiseIds: ["p1"],
                survivingSupportingPremiseCount: 1,
                conclusionAttribution: {
                    assertedByReader: false,
                    reachedWithoutAssertion: true,
                },
            })
        )!
        expect(a.argument.outcome).toBe("reaches-conclusion")
        expect(a.argument.struck.labels).toEqual(["1 premise rejected"])
        expect(argumentAssessmentLine(a.argument)).toBe(
            "Reaches · 1 premise rejected"
        )
    })

    it("attributes the conclusion to the reader when nothing derives it", () => {
        // Water and mammals: the conclusion is true, the reader supplied it,
        // and the argument contributed nothing.
        const a = composeAssessment(
            evaluation({
                conclusionTrue: true,
                survivingSupportingPremisesTrue: true,
                conclusionAttribution: {
                    assertedByReader: true,
                    reachedWithoutAssertion: false,
                },
            })
        )!
        expect(a.argument.outcome).toBe("does-not-reach")
        expect(a.argument.reason).toBe("conclusion-came-from-you")
        expect(a.conclusion.value).toBe("true")
        expect(a.conclusion.statements).toEqual([
            CONCLUSION_ASSERTED_STATEMENT,
            CONCLUSION_ONLY_ASSERTED_STATEMENT,
        ])
    })

    it("separates a reader with nothing outstanding from one with claims still unanswered", () => {
        // Same evaluation either way — core cannot tell the two apart, because
        // a persisted claim also binds an engine-synthesized variable the
        // reader can never answer. The caller supplies the discriminator.
        const facts = evaluation({
            conclusionTrue: true,
            struckPremiseIds: [],
            premiseSetSatisfiable: true,
            premisesHoldConclusionFalse: false,
            survivingSupportingPremiseCount: 1,
            conclusionAttribution: {
                assertedByReader: true,
                reachedWithoutAssertion: false,
            },
        })
        expect(
            composeAssessment(facts, { unsettledAnswerableClaimIds: [] })!
                .argument.reason
        ).toBe("conclusion-came-from-you-nothing-left-to-settle")
    })

    it("keeps the actionable reason while a claim the reader could answer is outstanding", () => {
        const facts = evaluation({
            conclusionTrue: true,
            struckPremiseIds: [],
            premiseSetSatisfiable: true,
            premisesHoldConclusionFalse: false,
            survivingSupportingPremiseCount: 1,
            conclusionAttribution: {
                assertedByReader: true,
                reachedWithoutAssertion: false,
            },
        })
        expect(
            composeAssessment(facts, {
                unsettledAnswerableClaimIds: ["some-claim-id"],
            })!.argument.reason
        ).toBe("conclusion-came-from-you")
    })

    it("never infers that nothing is outstanding from a caller that did not say", () => {
        // Absent is "could not tell", which is not the same finding as an
        // empty set. Guessing here would tell a reader who left claims open
        // that there is nothing left for them to do.
        const facts = evaluation({
            conclusionTrue: true,
            struckPremiseIds: [],
            premiseSetSatisfiable: true,
            premisesHoldConclusionFalse: false,
            survivingSupportingPremiseCount: 1,
            conclusionAttribution: {
                assertedByReader: true,
                reachedWithoutAssertion: false,
            },
        })
        expect(composeAssessment(facts)!.argument.reason).toBe(
            "conclusion-came-from-you"
        )
        expect(composeAssessment(facts, {})!.argument.reason).toBe(
            "conclusion-came-from-you"
        )
    })

    it("leads with the structural gap when the premises hold and the conclusion is false", () => {
        const a = composeAssessment(
            evaluation({
                conclusionTrue: false,
                survivingSupportingPremisesTrue: true,
                premisesHoldConclusionFalse: true,
                conclusionAttribution: {
                    assertedByReader: true,
                    reachedWithoutAssertion: false,
                },
            })
        )!
        expect(a.argument.reason).toBe(
            "premises-hold-conclusion-does-not-follow"
        )
    })

    it("names a rejection when nothing was derived and something was struck", () => {
        const a = composeAssessment(evaluation({ struckPremiseIds: ["p1"] }))!
        expect(a.argument.reason).toBe("reasoning-rejected")
    })

    it("falls through to insufficient information", () => {
        expect(composeAssessment(evaluation())!.argument.reason).toBe(
            "not-enough-settled"
        )
    })

    it("never reads as reaching its conclusion when every supporting premise is struck", () => {
        // An empty conjunction is true, so `survivingSupportingPremisesTrue`
        // comes back vacuously true here. That must not become a positive
        // reading.
        const a = composeAssessment(
            evaluation({
                conclusionTrue: true,
                struckPremiseIds: ["p1", "p2"],
                survivingSupportingPremiseCount: 0,
                survivingSupportingPremisesTrue: true,
                conclusionAttribution: {
                    assertedByReader: false,
                    reachedWithoutAssertion: true,
                },
            })
        )!
        expect(a.argument.outcome).toBe("does-not-reach")
        expect(a.argument.reason).toBe("reasoning-rejected")
        expect(a.argument.struck.labels).toEqual(["2 premises rejected"])
    })

    it("reports contradictory premises ahead of everything else", () => {
        const a = composeAssessment(
            evaluation({
                premiseSetSatisfiable: false,
                conclusionTrue: true,
                conclusionAttribution: {
                    assertedByReader: false,
                    reachedWithoutAssertion: true,
                },
            })
        )!
        expect(a.argument.outcome).toBe("premises-contradict")
        expect(a.argument.reason).toBeUndefined()
    })

    it("counts a struck constraint as declined, not rejected", () => {
        const a = composeAssessment(
            evaluation({
                struckPremiseIds: ["pConstraint"],
                constraintPremises: [
                    {
                        premiseId: "pConstraint",
                        premiseType: "constraint",
                        expressionValues: {},
                        variableValues: {},
                    },
                ],
            })
        )!
        expect(a.argument.struck.declinedConstraintCount).toBe(1)
        expect(a.argument.struck.rejectedPremiseCount).toBe(0)
        expect(a.argument.struck.labels).toEqual(["1 constraint declined"])
    })

    it("returns nothing for an evaluation that did not complete", () => {
        expect(composeAssessment(undefined)).toBeUndefined()
        expect(composeAssessment({ ok: false })).toBeUndefined()
    })
})

describe("assessment vocabulary", () => {
    const strings = [
        ...Object.values(CONCLUSION_VALUE_LABELS),
        ...Object.values(ARGUMENT_OUTCOME_LABELS),
        ...Object.values(ARGUMENT_REASON_TEXT),
        CONCLUSION_ASSERTED_STATEMENT,
        CONCLUSION_REACHED_STATEMENT,
        CONCLUSION_ONLY_ASSERTED_STATEMENT,
        "1 premise rejected",
        "2 premises rejected",
        "1 constraint declined",
    ]

    it("uses no proof language and no soundness language", () => {
        // Every finding is relative to one reader's assignment and may rest on
        // steps granted for inductive reasons, so proof words overclaim in two
        // directions at once. Refusal words are barred separately: declining a
        // constraint asserts nothing false.
        const banned =
            /prov(ed|en)|\bsound\b|unsound|\bvalid\b|invalid|refut|denie|denied|refus/i
        expect(strings.filter((s) => banned.test(s))).toEqual([])
    })

    it("addresses the reader in the second person", () => {
        expect(ARGUMENT_REASON_TEXT["conclusion-came-from-you"]).toContain(
            "you"
        )
        expect(ARGUMENT_REASON_TEXT["reasoning-rejected"]).toContain("you")
        expect(CONCLUSION_ASSERTED_STATEMENT.startsWith("You")).toBe(true)
    })
})

describe("assessment lines", () => {
    it("keeps the two axes on separate lines", () => {
        const a = composeAssessment(
            evaluation({
                conclusionTrue: true,
                struckPremiseIds: ["p1"],
                conclusionAttribution: {
                    assertedByReader: true,
                    reachedWithoutAssertion: false,
                },
            })
        )!
        expect(conclusionAssessmentLine(a.conclusion)).toBe(
            "Conclusion: True Your answers contributed to this. It holds only because you assigned it."
        )
        expect(argumentAssessmentLine(a.argument)).toBe(
            "Falls short — the conclusion came from you · 1 premise rejected"
        )
    })
})

describe("composeAssessment — against real evaluations", () => {
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

    it("reports the conclusion established and one premise rejected", () => {
        const argEngine = buildEngineWithRedundantSupport()
        const d = draft(
            { cA: true, cB: true, cC: null },
            { pFirstPath: "rejected", pSecondPath: "accepted" }
        )
        const a = composeAssessment(evaluateArgumentForReview(d, argEngine))!
        expect(a.conclusion.value).toBe("true")
        expect(a.argument.outcome).toBe("reaches-conclusion")
        expect(a.argument.struck.labels).toEqual(["1 premise rejected"])
    })

    it("reports a conclusion the reader supplied to an argument that did nothing", () => {
        // The water-and-mammals shape: the reader holds the conclusion and the
        // argument contributes nothing to it.
        const argEngine = buildEngineWithRedundantSupport()
        const d = draft(
            { cA: null, cB: null, cC: true },
            { pFirstPath: "accepted", pSecondPath: "accepted" }
        )
        const a = composeAssessment(evaluateArgumentForReview(d, argEngine))!
        expect(a.conclusion.value).toBe("true")
        expect(a.conclusion.statements).toEqual([
            CONCLUSION_ASSERTED_STATEMENT,
            CONCLUSION_ONLY_ASSERTED_STATEMENT,
        ])
        expect(a.argument.outcome).toBe("does-not-reach")
        expect(a.argument.reason).toBe("conclusion-came-from-you")
    })

    it("says nothing holds, and blames nothing on the reader, for a false conclusion", () => {
        // The reader's own values make the conclusion premise come out false.
        // Both defects met here: the conclusion line claimed the value "holds
        // only because you assigned it", and the argument axis reached for
        // `conclusion-came-from-you`, whose explanation opens by asserting the
        // conclusion holds.
        const argEngine = buildEngineWithTwoPremises()
        const d = draft({ cA: true, cB: false }, {})
        const a = composeAssessment(evaluateArgumentForReview(d, argEngine))!
        expect(a.conclusion.value).toBe("false")
        expect(a.conclusion.statements).not.toContain(
            CONCLUSION_ONLY_ASSERTED_STATEMENT
        )
        expect(a.conclusion.statements).not.toContain(
            CONCLUSION_REACHED_STATEMENT
        )
        expect(a.argument.reason).not.toBe("conclusion-came-from-you")
    })

    it("keeps the attribution reason for a conclusion that does come out true", () => {
        const argEngine = buildEngineWithRedundantSupport()
        const d = draft({ cA: null, cB: null, cC: true }, {})
        const a = composeAssessment(evaluateArgumentForReview(d, argEngine))!
        expect(a.conclusion.value).toBe("true")
        expect(a.argument.reason).toBe("conclusion-came-from-you")
    })
})
