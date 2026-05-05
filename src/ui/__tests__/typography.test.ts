import { describe, test, expect } from "vitest"
import { fontFamily, fontWeight, textStyle } from "../typography.js"

describe("fontFamily", () => {
    test("sans is Roboto, mono is Fira Code (logical names)", () => {
        expect(fontFamily.sans).toBe("Roboto")
        expect(fontFamily.mono).toBe("Fira Code")
    })
})

describe("fontWeight", () => {
    test("regular/medium/semibold/bold ascend", () => {
        expect(fontWeight.regular).toBeLessThan(fontWeight.medium)
        expect(fontWeight.medium).toBeLessThan(fontWeight.semibold)
        expect(fontWeight.semibold).toBeLessThan(fontWeight.bold)
    })
})

describe("textStyle", () => {
    test("includes the nine documented styles", () => {
        expect(Object.keys(textStyle).sort()).toEqual([
            "body",
            "caption",
            "code",
            "h1",
            "h2",
            "h3",
            "h4",
            "lead",
            "small",
        ])
    })

    test("each style has fontSize, lineHeight, letterSpacing", () => {
        for (const style of Object.values(textStyle)) {
            expect(typeof style.fontSize).toBe("number")
            expect(typeof style.lineHeight).toBe("number")
            expect(typeof style.letterSpacing).toBe("number")
            expect(style.fontSize).toBeGreaterThan(0)
            expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize)
        }
    })

    test("h1 is largest, caption is smallest among the headings + body", () => {
        const sizes = Object.values(textStyle).map((s) => s.fontSize)
        expect(textStyle.h1.fontSize).toBe(Math.max(...sizes))
        expect(textStyle.caption.fontSize).toBe(Math.min(...sizes))
    })
})
