import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    ReviewDraftSchema,
    ClaimAssignmentSchema,
    OperatorAssignmentSchema,
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
