import { describe, it, expect } from "vitest"
import { buildReviewOverlay, isResultStale } from "../../review/overlay.js"
import { buildEngineWithTwoPremises } from "./fixtures.js"
import type { TReviewDraft, TReviewResult } from "../../../schemas/review.js"
import { materialFingerprint } from "../../review/fingerprint.js"

function makeDraft(overrides: Partial<TReviewDraft> = {}): TReviewDraft {
    const now = new Date()
    return {
        schemaVersion: 1,
        reviewId: "r",
        argumentId: "a",
        argumentVersion: 1,
        userId: undefined,
        createdAt: now,
        updatedAt: now,
        phase: "operators",
        currentStepIndex: 0,
        claimAssignments: {},
        operatorAssignments: [],
        ...overrides,
    }
}

describe("buildReviewOverlay", () => {
    it("returns undefined when no draft and no result", () => {
        expect(
            buildReviewOverlay({
                draft: undefined,
                result: undefined,
                argEngine: buildEngineWithTwoPremises(),
            })
        ).toBeUndefined()
    })

    it("maps claim assignments into TAssignmentPill values", () => {
        const engine = buildEngineWithTwoPremises()
        const now = new Date()
        const draft = makeDraft({
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
                    value: null,
                    skipped: true,
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
        })
        const overlay = buildReviewOverlay({
            draft,
            result: undefined,
            argEngine: engine,
        })!
        expect(overlay.claimValues.sA).toBe("true")
        expect(overlay.claimValues.cA).toBe("skipped")
        expect(overlay.claimValues.cB).toBe("false")
    })

    it("fans premise-scope decisions to every decidable expression", () => {
        const engine = buildEngineWithTwoPremises()
        const now = new Date()
        const draft = makeDraft({
            operatorAssignments: [
                {
                    assignmentId: "o1",
                    premiseId: "pConclusion",
                    scope: "premise",
                    decision: "accepted",
                    decidedAt: now,
                },
            ],
        })
        const overlay = buildReviewOverlay({
            draft,
            result: undefined,
            argEngine: engine,
        })!
        expect(overlay.operatorDecisions.eImpliesRoot).toBe("accepted")
    })

    it("expression-scope overrides win over premise-scope", () => {
        const engine = buildEngineWithTwoPremises()
        const now = new Date()
        const draft = makeDraft({
            operatorAssignments: [
                {
                    assignmentId: "o1",
                    premiseId: "pConclusion",
                    scope: "premise",
                    decision: "accepted",
                    decidedAt: now,
                },
                {
                    assignmentId: "o2",
                    premiseId: "pConclusion",
                    scope: "expression",
                    expressionId: "eImpliesRoot",
                    decision: "rejected",
                    decidedAt: now,
                },
            ],
        })
        const overlay = buildReviewOverlay({
            draft,
            result: undefined,
            argEngine: engine,
        })!
        expect(overlay.operatorDecisions.eImpliesRoot).toBe("rejected")
    })
})

describe("isResultStale", () => {
    it("returns false when draft or result is missing", () => {
        const draft = makeDraft()
        expect(isResultStale(undefined, undefined)).toBe(false)
        expect(isResultStale(draft, undefined)).toBe(false)
    })

    it("returns true when draft fingerprint differs from result fingerprint", () => {
        const draft = makeDraft()
        const result: TReviewResult = {
            schemaVersion: 1,
            createdAt: new Date(),
            evaluatedAt: new Date(),
            evaluatedFingerprint: "stale",
            evaluation: { ok: true },
        }
        expect(isResultStale(draft, result)).toBe(true)
    })

    it("returns false when fingerprints match", () => {
        const draft = makeDraft()
        const result: TReviewResult = {
            schemaVersion: 1,
            createdAt: new Date(),
            evaluatedAt: new Date(),
            evaluatedFingerprint: materialFingerprint(draft),
            evaluation: { ok: true },
        }
        expect(isResultStale(draft, result)).toBe(false)
    })
})
