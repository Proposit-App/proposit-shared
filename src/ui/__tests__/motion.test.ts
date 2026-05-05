import { describe, test, expect } from "vitest"
import { duration, easing } from "../motion.js"

describe("duration", () => {
    test("fast < base < slow", () => {
        expect(duration.fast).toBeLessThan(duration.base)
        expect(duration.base).toBeLessThan(duration.slow)
    })

    test("each value is a positive number in seconds", () => {
        for (const value of Object.values(duration)) {
            expect(typeof value).toBe("number")
            expect(value).toBeGreaterThan(0)
        }
    })
})

describe("easing.brand", () => {
    test("is a 4-tuple of numbers", () => {
        expect(easing.brand).toHaveLength(4)
        for (const n of easing.brand) {
            expect(typeof n).toBe("number")
        }
    })

    test("matches the documented bezier control points", () => {
        expect(easing.brand).toEqual([0.22, 1, 0.36, 1])
    })
})

describe("easing.brandCss", () => {
    test("renders the same control points as a CSS cubic-bezier string", () => {
        expect(easing.brandCss).toBe("cubic-bezier(0.22, 1, 0.36, 1)")
    })
})
