import { describe, test, expect } from "vitest"
import { zIndex } from "../z-index.js"

describe("zIndex", () => {
    test("layers ascend dropdown < popover < tooltip < dialog < toast", () => {
        expect(zIndex.dropdown).toBeLessThan(zIndex.popover)
        expect(zIndex.popover).toBeLessThan(zIndex.tooltip)
        expect(zIndex.tooltip).toBeLessThan(zIndex.dialog)
        expect(zIndex.dialog).toBeLessThan(zIndex.toast)
    })

    test("each value is a positive integer", () => {
        for (const value of Object.values(zIndex)) {
            expect(Number.isInteger(value)).toBe(true)
            expect(value).toBeGreaterThan(0)
        }
    })
})
