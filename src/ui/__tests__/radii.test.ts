import { describe, test, expect } from "vitest"
import { radius } from "../radii.js"

describe("radius", () => {
    test("includes sm/md/lg/xl/full keys", () => {
        expect(Object.keys(radius).sort()).toEqual([
            "full",
            "lg",
            "md",
            "sm",
            "xl",
        ])
    })

    test("each value is a non-negative integer", () => {
        for (const value of Object.values(radius)) {
            expect(Number.isInteger(value)).toBe(true)
            expect(value).toBeGreaterThanOrEqual(0)
        }
    })

    test("full is 9999 (pill)", () => {
        expect(radius.full).toBe(9999)
    })
})
