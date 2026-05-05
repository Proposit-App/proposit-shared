import { describe, test, expect } from "vitest"
import { spacing } from "../spacing.js"

describe("spacing", () => {
    test("includes the documented Tailwind v4 4px-scale keys", () => {
        expect(
            Object.keys(spacing)
                .map(Number)
                .sort((a, b) => a - b),
        ).toEqual([0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24])
    })

    test("each value is a non-negative integer in px", () => {
        for (const value of Object.values(spacing)) {
            expect(Number.isInteger(value)).toBe(true)
            expect(value).toBeGreaterThanOrEqual(0)
        }
    })

    test("specific anchor values match the spec", () => {
        expect(spacing[0]).toBe(0)
        expect(spacing[1]).toBe(4)
        expect(spacing[4]).toBe(16)
        expect(spacing[24]).toBe(96)
    })
})
