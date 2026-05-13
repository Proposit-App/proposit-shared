import { describe, test, expect } from "vitest"
import { shadow } from "../shadows.js"

describe("shadow", () => {
    test("includes sm / md / lg keys", () => {
        expect(Object.keys(shadow).sort()).toEqual(["lg", "md", "sm"])
    })

    test("each level has both css and native shapes", () => {
        for (const level of Object.values(shadow)) {
            expect(typeof level.css).toBe("string")
            expect(level.css.length).toBeGreaterThan(0)
            expect(level.native).toMatchObject({
                shadowColor: expect.any(String) as unknown,
                shadowOffset: {
                    width: expect.any(Number) as unknown,
                    height: expect.any(Number) as unknown,
                },
                shadowOpacity: expect.any(Number) as unknown,
                shadowRadius: expect.any(Number) as unknown,
                elevation: expect.any(Number) as unknown,
            })
        }
    })

    test("shadowOpacity is between 0 and 1; elevation is positive", () => {
        for (const level of Object.values(shadow)) {
            expect(level.native.shadowOpacity).toBeGreaterThan(0)
            expect(level.native.shadowOpacity).toBeLessThanOrEqual(1)
            expect(level.native.elevation).toBeGreaterThan(0)
            expect(Number.isInteger(level.native.elevation)).toBe(true)
        }
    })
})
