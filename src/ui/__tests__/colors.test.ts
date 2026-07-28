import { describe, test, expect } from "vitest"
import { colors, colorSchemeFor } from "../colors.js"
import type { TColorPalette } from "../colors.js"

const HEX_RE = /^#[0-9a-f]{6}$/

/** WCAG 2.x relative luminance of an `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
    const [r, g, b] = [0, 2, 4]
        .map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.x contrast ratio between two `#rrggbb` colours (1:1 … 21:1). */
function contrastRatio(a: string, b: string): number {
    const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
        (x, y) => y - x
    )
    return (lighter + 0.05) / (darker + 0.05)
}

/** Every background an accent can be painted onto as text. */
const backgroundsOf = (scheme: TColorPalette) => [
    scheme.background,
    scheme.backgroundElevated,
    scheme.muted,
]

const AA_BODY_TEXT = 4.5

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
                    HEX_RE
                )
            }
        }
    })

    test("reactionUpvote is decoupled from primary", () => {
        expect(colors.light.reactionUpvote).not.toBe(colors.light.primary)
        expect(colors.dark.reactionUpvote).not.toBe(colors.dark.primary)
    })

    test("every *AsText token clears AA against every background it lands on", () => {
        // The bright citron/amber/sage fills are unreadable as text on the pale
        // ground; the *AsText variants are the same hue pushed dark enough to
        // clear the 4.5:1 body-text floor against every background they can be
        // painted on, in both schemes (in dark mode the fill already clears AA,
        // so the *AsText token is the fill itself).
        for (const scheme of [colors.light, colors.dark]) {
            const asTextTokens = (
                Object.keys(scheme) as (keyof TColorPalette)[]
            )
                .filter((key) => key.endsWith("AsText"))
                .map((key) => [key, scheme[key]] as const)
            expect(asTextTokens.length).toBeGreaterThan(0)
            for (const [key, asText] of asTextTokens) {
                for (const background of backgroundsOf(scheme)) {
                    expect(
                        contrastRatio(asText, background),
                        `${key} ${asText} on ${background}`
                    ).toBeGreaterThanOrEqual(AA_BODY_TEXT)
                }
            }
        }
    })

    test("the light fills the *AsText tokens stand in for are not themselves AA-safe as text", () => {
        // Guards the distinction the *AsText tokens exist for. Without it, a
        // future "fix" that darkens a fill until it reads as text would pass
        // the suite while wrecking every surface that fill is painted behind.
        for (const fill of [
            colors.light.primary,
            colors.light.warning,
            colors.light.success,
        ]) {
            expect(
                contrastRatio(fill, colors.light.background),
                `${fill} on ${colors.light.background}`
            ).toBeLessThan(AA_BODY_TEXT)
            expect(
                contrastRatio(fill, colors.light.muted),
                `${fill} on ${colors.light.muted}`
            ).toBeLessThan(AA_BODY_TEXT)
        }
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
