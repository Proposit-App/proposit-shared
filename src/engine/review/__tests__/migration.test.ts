import { describe, it, expect } from "vitest"
import { migrateReviewState } from "../../review/review-store.js"

describe("migrateReviewState", () => {
    it("returns identity for shape without recognizable draft", () => {
        const input = { foo: "bar" }
        expect(migrateReviewState(input)).toEqual({
            state: input,
            migrated: false,
        })
    })

    it("strips unknown claim reason codes silently", () => {
        const input = {
            draft: {
                schemaVersion: 1,
                claimAssignments: {
                    c1: {
                        assignmentId: "a",
                        claimId: "c1",
                        value: true,
                        skipped: false,
                        decidedAt: "2026-04-14T00:00:00Z",
                        reasonCode: "obsolete-code",
                    },
                },
            },
        }
        const { state, migrated } = migrateReviewState(input)
        expect(migrated).toBe(true)
        const s = state as typeof input
        expect(s.draft.claimAssignments.c1.reasonCode).toBeUndefined()
    })

    it("strips unknown operator reason codes silently", () => {
        const input = {
            draft: {
                schemaVersion: 1,
                operatorAssignments: [
                    { reasonCode: "invented-code" },
                    { reasonCode: "non-sequitur" },
                ],
            },
        }
        const { state, migrated } = migrateReviewState(input)
        expect(migrated).toBe(true)
        const s = state as {
            draft: { operatorAssignments: { reasonCode?: string }[] }
        }
        expect(s.draft.operatorAssignments[0].reasonCode).toBeUndefined()
        expect(s.draft.operatorAssignments[1].reasonCode).toBe("non-sequitur")
    })

    it("returns migrated: false when no unknown codes are present", () => {
        const input = {
            draft: {
                schemaVersion: 1,
                claimAssignments: {
                    c1: {
                        assignmentId: "a",
                        claimId: "c1",
                        value: true,
                        skipped: false,
                        decidedAt: "2026-04-14T00:00:00Z",
                        reasonCode: "common-knowledge",
                    },
                },
                operatorAssignments: [],
            },
        }
        expect(migrateReviewState(input).migrated).toBe(false)
    })
})
