import { describe, test, expect } from "vitest"
import { breakpoint } from "../breakpoints.js"

describe("breakpoint", () => {
    test("matches MUI parity values from server design-system.md §1", () => {
        expect(breakpoint.sm).toBe(600)
        expect(breakpoint.md).toBe(900)
        expect(breakpoint.lg).toBe(1200)
        expect(breakpoint.xl).toBe(1536)
    })

    test("breakpoints ascend monotonically", () => {
        expect(breakpoint.sm).toBeLessThan(breakpoint.md)
        expect(breakpoint.md).toBeLessThan(breakpoint.lg)
        expect(breakpoint.lg).toBeLessThan(breakpoint.xl)
    })
})
