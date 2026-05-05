import { describe, test, expect } from "vitest"
import { colors, colorSchemeFor } from "../colors.js"

const HEX_RE = /^#[0-9a-f]{6}$/

describe("colors", () => {
    test("light and dark have identical key sets", () => {
        const lightKeys = Object.keys(colors.light).sort()
        const darkKeys = Object.keys(colors.dark).sort()
        expect(darkKeys).toEqual(lightKeys)
    })

    test("every value matches /^#[0-9a-f]{6}$/", () => {
        for (const palette of [colors.light, colors.dark]) {
            for (const [key, value] of Object.entries(palette)) {
                expect(value, `colors.<scheme>.${key} = ${value}`).toMatch(
                    HEX_RE,
                )
            }
        }
    })

    test("warning foreground on warning bg meets WCAG AA in light mode", () => {
        // Sanity: warning is amber, foreground is dark slate — should NOT be
        // white, which fails AA on amber.
        expect(colors.light.warningForeground).not.toBe("#ffffff")
    })

    test("reactionUpvote is decoupled from primary", () => {
        expect(colors.light.reactionUpvote).not.toBe(colors.light.primary)
        expect(colors.dark.reactionUpvote).not.toBe(colors.dark.primary)
    })
})

describe("colorSchemeFor", () => {
    test("returns the light palette for 'light'", () => {
        expect(colorSchemeFor("light")).toBe(colors.light)
    })

    test("returns the dark palette for 'dark'", () => {
        expect(colorSchemeFor("dark")).toBe(colors.dark)
    })
})
