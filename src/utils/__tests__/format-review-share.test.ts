import { describe, it, expect } from "vitest"
import { formatReviewShareText } from "../format-review-share.js"

describe("formatReviewShareText", () => {
    it("prefixes each verdict with its symbol", () => {
        const verdicts = [
            ["Valid and Sound", "✓"],
            ["Failing", "✗"],
            ["Logically Invalid", "✗"],
            ["Vacuous", "∅"],
            ["Indeterminate", "…"],
        ] as const
        for (const [v, sym] of verdicts) {
            const out = formatReviewShareText({
                verdict: v,
                argumentTitle: "T",
                url: "https://example.com/r/1",
            })
            expect(out.startsWith(`${sym} ${v}`)).toBe(true)
        }
    })

    it("truncates long titles at 120 chars with ellipsis", () => {
        const longTitle = "x".repeat(200)
        const out = formatReviewShareText({
            verdict: "Valid and Sound",
            argumentTitle: longTitle,
            url: "https://example.com/r/1",
        })
        expect(out).toContain("…")
        expect(out).toContain("x".repeat(120))
        expect(out).not.toContain("x".repeat(121))
    })

    it("passes short titles through unchanged", () => {
        const out = formatReviewShareText({
            verdict: "Failing",
            argumentTitle: "Short title",
            url: "https://example.com/r/1",
        })
        expect(out).toContain('"Short title"')
        expect(out).not.toContain("…")
    })

    it("includes the URL", () => {
        const out = formatReviewShareText({
            verdict: "Failing",
            argumentTitle: "T",
            url: "https://example.com/r/abc123",
        })
        expect(out).toContain("https://example.com/r/abc123")
    })
})
