import { describe, test, expect } from "vitest"
import { sizing } from "../sizing.js"

describe("sizing", () => {
    test("icon scale ascends xs..xl", () => {
        expect(sizing.iconXs).toBeLessThan(sizing.iconSm)
        expect(sizing.iconSm).toBeLessThan(sizing.iconMd)
        expect(sizing.iconMd).toBeLessThan(sizing.iconLg)
        expect(sizing.iconLg).toBeLessThan(sizing.iconXl)
    })

    test("field scale ascends sm..lg", () => {
        expect(sizing.fieldSm).toBeLessThan(sizing.fieldMd)
        expect(sizing.fieldMd).toBeLessThan(sizing.fieldLg)
    })

    test("targetMin meets or exceeds 40px (a11y minimum)", () => {
        expect(sizing.targetMin).toBeGreaterThanOrEqual(40)
    })

    test("each value is a positive integer", () => {
        for (const value of Object.values(sizing)) {
            expect(Number.isInteger(value)).toBe(true)
            expect(value).toBeGreaterThan(0)
        }
    })
})
