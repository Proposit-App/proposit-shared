import { describe, test, expect } from "vitest"
import {
    LARGE_ORIGIN_DOCUMENT_CODE_POINTS,
    isLargeOriginDocument,
} from "../origin-size.js"

describe("isLargeOriginDocument", () => {
    test("a text exactly at the threshold still reads in place", () => {
        expect(
            isLargeOriginDocument("a".repeat(LARGE_ORIGIN_DOCUMENT_CODE_POINTS))
        ).toBe(false)
    })

    test("one code point past the threshold needs its own surface", () => {
        expect(
            isLargeOriginDocument(
                "a".repeat(LARGE_ORIGIN_DOCUMENT_CODE_POINTS + 1)
            )
        ).toBe(true)
    })

    test("an empty text is not large", () => {
        expect(isLargeOriginDocument("")).toBe(false)
    })

    // Each astral character is two UTF-16 units and one code point, so a text of
    // exactly `LARGE_ORIGIN_DOCUMENT_CODE_POINTS` emoji measures at the
    // threshold by code point and at twice it by `String.prototype.length`. This
    // fails the moment the count is done in UTF-16 units.
    test("counts an astral character once, not twice", () => {
        const emoji = "🙂".repeat(LARGE_ORIGIN_DOCUMENT_CODE_POINTS)
        expect(emoji.length).toBe(LARGE_ORIGIN_DOCUMENT_CODE_POINTS * 2)
        expect(isLargeOriginDocument(emoji)).toBe(false)
        expect(isLargeOriginDocument(`${emoji}🙂`)).toBe(true)
    })
})
