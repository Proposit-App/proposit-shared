import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import { CONTESTED } from "@proposit/proposit-core"
import {
    ReviewDraftSchema,
    ReviewResultSchema,
    ClaimAssignmentSchema,
    OperatorAssignmentSchema,
    TCoreExpressionAssignmentSchema,
} from "../review.js"

describe("review schemas", () => {
    it("round-trips a draft through Encode → stringify → parse → Decode", () => {
        const draft = {
            schemaVersion: 1 as const,
            reviewId: "00000000-0000-0000-0000-000000000001",
            argumentId: "00000000-0000-0000-0000-000000000002",
            argumentVersion: 3,
            userId: undefined,
            createdAt: new Date("2026-04-14T00:00:00Z"),
            updatedAt: new Date("2026-04-14T00:00:00Z"),
            phase: "claims" as const,
            currentStepIndex: 0,
            claimAssignments: {},
            operatorAssignments: [],
        }
        const encoded = Value.Encode(ReviewDraftSchema, draft)
        const parsed: unknown = JSON.parse(JSON.stringify(encoded))
        const back = Value.Decode(ReviewDraftSchema, parsed)
        expect(back.createdAt instanceof Date).toBe(true)
        expect(back.argumentVersion).toBe(3)
    })

    it("rejects currentStepIndex < 0", () => {
        const bad = {
            schemaVersion: 1,
            reviewId: "00000000-0000-0000-0000-000000000001",
            argumentId: "00000000-0000-0000-0000-000000000002",
            argumentVersion: 1,
            userId: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            phase: "claims",
            currentStepIndex: -1,
            claimAssignments: {},
            operatorAssignments: [],
        }
        expect(Value.Check(ReviewDraftSchema, bad)).toBe(false)
    })

    it("ClaimAssignment requires decidedAt", () => {
        const incomplete = {
            assignmentId: "00000000-0000-0000-0000-000000000003",
            claimId: "00000000-0000-0000-0000-000000000004",
            value: true,
            skipped: false,
        }
        expect(Value.Check(ClaimAssignmentSchema, incomplete)).toBe(false)
    })

    it("OperatorAssignment allows scope='expression' with expressionId", () => {
        const op = {
            assignmentId: "00000000-0000-0000-0000-000000000005",
            premiseId: "00000000-0000-0000-0000-000000000006",
            expressionId: "00000000-0000-0000-0000-000000000007",
            scope: "expression",
            decision: "accepted",
            decidedAt: new Date(),
        }
        expect(Value.Check(OperatorAssignmentSchema, op)).toBe(true)
    })
})

describe("evaluation result mirror", () => {
    // A stored review whose evaluation the schema rejects is dropped whole by
    // the review store, so the mirror has to admit every value core produces.
    it("round-trips a result carrying a value settled both ways", () => {
        const result = {
            schemaVersion: 1 as const,
            createdAt: new Date("2026-04-14T00:00:00Z"),
            evaluatedAt: new Date("2026-04-14T00:00:00Z"),
            evaluatedFingerprint: "fp",
            evaluation: {
                ok: true,
                conclusionTrue: CONTESTED,
                assignment: {
                    variables: { vQ: CONTESTED },
                    operatorAssignments: {},
                },
                propagatedVariableValues: { vQ: CONTESTED },
                variableProvenance: {
                    vQ: {
                        value: CONTESTED,
                        origin: "contested" as const,
                        contestedBy: [
                            {
                                expressionId: "e1",
                                premiseId: "p1",
                                fromVariableIds: ["vP"],
                            },
                        ],
                    },
                },
            },
        }
        const parsed: unknown = JSON.parse(
            JSON.stringify(Value.Encode(ReviewResultSchema, result))
        )
        const back = Value.Decode(ReviewResultSchema, parsed)
        expect(back.evaluation.conclusionTrue).toBe(CONTESTED)
        expect(back.evaluation.variableProvenance!.vQ.origin).toBe("contested")
        expect(back.evaluation.variableProvenance!.vQ.contestedBy).toHaveLength(
            1
        )
    })

    it("keeps a reader's own assignment three-valued", () => {
        expect(
            Value.Check(TCoreExpressionAssignmentSchema, {
                variables: { vQ: CONTESTED },
                operatorAssignments: {},
            })
        ).toBe(false)
    })
})

describe("evaluation result mirror — nothing is dropped on the way out", () => {
    // TypeBox strips undeclared properties on Encode, so a core field the
    // mirror forgot vanishes silently between save and load. Anything a
    // consumer reads off a rehydrated result has to appear here.
    const evaluation = {
        ok: true,
        conclusionTrue: true,
        isAdmissibleAssignment: true,
        survivingSupportingPremisesTrue: true,
        premisesHoldConclusionFalse: false,
        premiseSetSatisfiable: true,
        survivingSupportingPremiseCount: 1,
        struckPremiseIds: ["p2"],
        referencedVariableIds: ["vP", "vQ"],
        contestedVariableIds: ["vP"],
        propagatedVariableValues: { vP: CONTESTED, vQ: true },
        conclusionAttribution: {
            assertedByReader: true,
            reachedWithoutAssertion: false,
        },
        claimAttribution: {
            vP: { assertedByReader: true, reachedWithoutAssertion: false },
        },
        assignment: {
            variables: { vP: CONTESTED, vQ: true },
            operatorAssignments: { e1: "accepted" as const },
        },
        variableProvenance: {
            vP: {
                value: CONTESTED,
                origin: "contested" as const,
                contestedBy: [
                    {
                        expressionId: "e1",
                        premiseId: "p1",
                        fromVariableIds: ["vQ"],
                    },
                ],
            },
        },
    }

    function roundTrip(): Record<string, unknown> {
        const result = {
            schemaVersion: 1 as const,
            createdAt: new Date("2026-04-14T00:00:00Z"),
            evaluatedAt: new Date("2026-04-14T00:00:00Z"),
            evaluatedFingerprint: "fp",
            evaluation,
        }
        const parsed: unknown = JSON.parse(
            JSON.stringify(Value.Encode(ReviewResultSchema, result))
        )
        return Value.Decode(ReviewResultSchema, parsed).evaluation as Record<
            string,
            unknown
        >
    }

    it("survives Encode → JSON → Decode field for field", () => {
        const back = roundTrip()
        for (const field of Object.keys(evaluation)) {
            expect({ field, value: back[field] }).toEqual({
                field,
                value: evaluation[field as keyof typeof evaluation],
            })
        }
    })

    it("keeps the contested-variable list, which is the whole gate on reload", () => {
        // Every aggregate can read clean while a variable is held both ways,
        // so this list is the only thing left to reconstruct the block from.
        expect(roundTrip().contestedVariableIds).toEqual(["vP"])
    })
})
