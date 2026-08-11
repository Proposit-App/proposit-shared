import { describe, it, expect } from "vitest"
import { formatReviewShareText } from "../format-review-share.js"
import type {
    TArgumentOutcome,
    TReviewAssessment,
} from "../../engine/review/assessment.js"
import {
    ARGUMENT_OUTCOME_LABELS,
    CONCLUSION_ASSERTED_STATEMENT,
} from "../../engine/review/assessment.js"

function assessment(outcome: TArgumentOutcome): TReviewAssessment {
    return {
        conclusion: {
            value: "true",
            label: "True",
            assertedByReader: true,
            reachedWithoutAssertion: true,
            statements: [CONCLUSION_ASSERTED_STATEMENT],
        },
        argument: {
            outcome,
            label: ARGUMENT_OUTCOME_LABELS[outcome],
            struck: {
                struckPremiseIds: [],
                rejectedPremiseCount: 0,
                declinedConstraintCount: 0,
                labels: [],
            },
        },
    }
}

describe("formatReviewShareText", () => {
    it("prefixes each argument outcome with its symbol", () => {
        const cases = [
            ["reaches-conclusion", "✓"],
            ["does-not-reach", "✗"],
            ["premises-contradict", "⚠"],
        ] as const
        for (const [outcome, sym] of cases) {
            const out = formatReviewShareText({
                assessment: assessment(outcome),
                argumentTitle: "T",
                url: "https://example.com/r/1",
            })
            expect(
                out.startsWith(`${sym} ${ARGUMENT_OUTCOME_LABELS[outcome]}`)
            ).toBe(true)
        }
    })

    it("carries both axes on separate lines", () => {
        const out = formatReviewShareText({
            assessment: assessment("reaches-conclusion"),
            argumentTitle: "T",
            url: "https://example.com/r/1",
        })
        const [argumentLine, conclusionLine] = out.split("\n")
        expect(argumentLine).toContain(
            ARGUMENT_OUTCOME_LABELS["reaches-conclusion"]
        )
        expect(conclusionLine).toContain("Conclusion: True")
        expect(conclusionLine).toContain(CONCLUSION_ASSERTED_STATEMENT)
    })

    it("truncates long titles at 120 chars with ellipsis", () => {
        const out = formatReviewShareText({
            assessment: assessment("reaches-conclusion"),
            argumentTitle: "x".repeat(200),
            url: "https://example.com/r/1",
        })
        expect(out).toContain("…")
        expect(out).toContain("x".repeat(120))
        expect(out).not.toContain("x".repeat(121))
    })

    it("passes short titles through unchanged", () => {
        const out = formatReviewShareText({
            assessment: assessment("does-not-reach"),
            argumentTitle: "Short title",
            url: "https://example.com/r/1",
        })
        expect(out).toContain('"Short title"')
        expect(out).not.toContain("…")
    })

    it("includes the URL", () => {
        const out = formatReviewShareText({
            assessment: assessment("does-not-reach"),
            argumentTitle: "T",
            url: "https://example.com/r/abc123",
        })
        expect(out).toContain("https://example.com/r/abc123")
    })
})
