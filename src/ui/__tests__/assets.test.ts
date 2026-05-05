import { describe, test, expect } from "vitest"
import {
    propositLogoBlack,
    propositLogoWhite,
    propositLetterLogoBlack,
    propositLogoFor,
} from "../assets/index.js"
import type { TBrandAsset } from "../assets/index.js"

const VIEWBOX_RE =
    /^-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? \d+(?:\.\d+)? \d+(?:\.\d+)?$/

const allAssets: readonly (readonly [string, TBrandAsset])[] = [
    ["propositLogoBlack", propositLogoBlack],
    ["propositLogoWhite", propositLogoWhite],
    ["propositLetterLogoBlack", propositLetterLogoBlack],
]

describe("brand assets", () => {
    test.each(allAssets)("%s is a valid TBrandAsset", (_, asset) => {
        expect(asset.svg).toMatch(/^<svg[\s>]/)
        expect(asset.svg).toContain("</svg>")
        expect(asset.viewBox).toMatch(VIEWBOX_RE)
        expect(asset.intrinsicWidth).toBeGreaterThan(0)
        expect(asset.intrinsicHeight).toBeGreaterThan(0)
    })

    test.each(allAssets)("%s.svg has no XML declaration", (_, asset) => {
        expect(asset.svg).not.toMatch(/^<\?xml/)
    })
})

describe("propositLogoFor", () => {
    test("returns the black full logo for 'light'", () => {
        expect(propositLogoFor("light")).toBe(propositLogoBlack)
    })

    test("returns the white full logo for 'dark'", () => {
        expect(propositLogoFor("dark")).toBe(propositLogoWhite)
    })
})
