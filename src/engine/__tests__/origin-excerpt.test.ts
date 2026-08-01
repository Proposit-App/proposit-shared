import { describe, test, expect } from "vitest"
import { buildOriginExcerpt } from "../render/origin-excerpt.js"

// A reading surface wants the anchored passage plus enough of the writing
// around it to see where it sat. Everything below is measured in CODE POINTS,
// which is the only reason the astral case works.

// Long enough that a 60-code-point window falls inside it at both ends, which
// is what makes the elision assertions mean anything.
const DOC =
    "It is a truth long since settled, and needing no fresh argument here. " +
    "The time, it is to be hoped, is gone by, when any defence would be " +
    "necessary of the 'liberty of the press' as one of the securities " +
    "against corrupt or tyrannical government."

/** The DOC fixture is ASCII, so UTF-16 indices and code points coincide. */
function anchorOn(text: string, quote: string) {
    const startCodePoint = text.indexOf(quote)
    if (startCodePoint < 0) throw new Error(`fixture missing quote: ${quote}`)
    return { startCodePoint, endCodePoint: startCodePoint + quote.length }
}

/**
 * The same, for a fixture containing an astral character — where `indexOf`
 * returns a UTF-16 index and the function takes code points, so the two differ
 * by one per astral character before the quote. Getting this wrong in the TEST
 * is how a passing suite hides the bug the function exists to avoid.
 */
function anchorOnCodePoints(text: string, quote: string) {
    const units = text.indexOf(quote)
    if (units < 0) throw new Error(`fixture missing quote: ${quote}`)
    return {
        startCodePoint: [...text.slice(0, units)].length,
        endCodePoint: [...text.slice(0, units)].length + [...quote].length,
    }
}

describe("buildOriginExcerpt", () => {
    test("returns the quote with context either side, both ends elided", () => {
        const quote = "when any defence would be necessary"
        const excerpt = buildOriginExcerpt(DOC, anchorOn(DOC, quote))

        expect(excerpt.quote).toBe(quote)
        expect(excerpt.before.length).toBeGreaterThan(0)
        expect(excerpt.after.length).toBeGreaterThan(0)
        expect(excerpt.elidedStart).toBe(true)
        expect(excerpt.elidedEnd).toBe(true)
        // The whole excerpt is a contiguous stretch of the document.
        expect(DOC).toContain(
            `${excerpt.before} ${excerpt.quote} ${excerpt.after}`
        )
    })

    test("cuts no word in half at either outer edge", () => {
        const excerpt = buildOriginExcerpt(
            DOC,
            anchorOn(DOC, "when any defence would be necessary")
        )

        // Every word of the context appears whole in the source.
        for (const word of [
            ...excerpt.before.split(" "),
            ...excerpt.after.split(" "),
        ]) {
            expect(DOC.split(/\s+/)).toContain(word)
        }
    })

    test("an anchor at the very start has no leading elision", () => {
        const excerpt = buildOriginExcerpt(DOC, anchorOn(DOC, "It is a truth"))

        expect(excerpt.before).toBe("")
        expect(excerpt.elidedStart).toBe(false)
        expect(excerpt.elidedEnd).toBe(true)
    })

    test("an anchor at the very end has no trailing elision", () => {
        const excerpt = buildOriginExcerpt(
            DOC,
            anchorOn(DOC, "tyrannical government.")
        )

        expect(excerpt.after).toBe("")
        expect(excerpt.elidedEnd).toBe(false)
        expect(excerpt.elidedStart).toBe(true)
    })

    // The trim exists to drop a word the WINDOW cut. Where the window reached
    // the start of the document it cut nothing, so trimming there would eat the
    // opening word of the source text — and an anchor near the start is the
    // commonest thing a reader selects.
    test("keeps the document's first word when the window reaches offset 0", () => {
        const excerpt = buildOriginExcerpt(
            DOC,
            anchorOn(DOC, "long since settled"),
            60
        )

        expect(excerpt.elidedStart).toBe(false)
        expect(excerpt.before).toBe("It is a truth")
    })

    // Same principle one step in: the window stopped short of the document's
    // edge, but landed exactly on a word boundary, so it cut nothing and the
    // first word must survive.
    test("keeps a whole word when the window lands on a word boundary", () => {
        const quote = "gone by,"
        const start = DOC.indexOf(quote)
        // Put the window boundary exactly on the "h" of "hoped,".
        const context = start - DOC.indexOf("hoped,")
        const excerpt = buildOriginExcerpt(DOC, anchorOn(DOC, quote), context)

        expect(excerpt.elidedStart).toBe(true)
        expect(excerpt.before.startsWith("hoped,")).toBe(true)
    })

    // The counterpart: the window cut into a word, so that word goes.
    test("drops the word the window cut in half", () => {
        const quote = "gone by,"
        const start = DOC.indexOf(quote)
        // Two characters into "hoped,".
        const context = start - (DOC.indexOf("hoped,") + 2)
        const excerpt = buildOriginExcerpt(DOC, anchorOn(DOC, quote), context)

        expect(excerpt.before.startsWith("ped,")).toBe(false)
        expect(excerpt.before).toBe("is")
    })

    test("counts context in code points, not UTF-16 units", () => {
        const astral = "A 📚 sits here. Then the quote. And a tail follows."
        const quote = "Then the quote."
        const excerpt = buildOriginExcerpt(
            astral,
            anchorOnCodePoints(astral, quote),
            14
        )

        expect(excerpt.quote).toBe(quote)
        // 14 code points back from the quote reaches into "📚 sits here." — a
        // UTF-16 slice at the same number lands one unit later and splits the
        // surrogate pair, leaving a lone half-character. A WELL-FORMED pair
        // still contains surrogate code units, so the assertion has to be about
        // unpaired ones specifically.
        const loneSurrogate =
            /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
        expect(excerpt.before).not.toMatch(loneSurrogate)
        expect(excerpt.before).toContain("📚")
        expect(astral).toContain(excerpt.before)
    })

    test("an anchor spanning an astral character keeps it whole", () => {
        const astral = "Lead in. A 📚 in the quote. Tail out."
        const excerpt = buildOriginExcerpt(
            astral,
            anchorOnCodePoints(astral, "A 📚 in the quote.")
        )

        expect(excerpt.quote).toBe("A 📚 in the quote.")
    })

    test("context inside a whitespace-free token drops out, elision stands", () => {
        const url = "x".repeat(200)
        const text = `${url} QUOTED ${url}`
        const excerpt = buildOriginExcerpt(text, anchorOn(text, "QUOTED"), 30)

        expect(excerpt.quote).toBe("QUOTED")
        expect(excerpt.before).toBe("")
        expect(excerpt.after).toBe("")
        expect(excerpt.elidedStart).toBe(true)
        expect(excerpt.elidedEnd).toBe(true)
    })

    test("collapses the whitespace a paragraph break leaves in the quote", () => {
        const text = "Lead.\n\nFirst line\nsecond line.\n\nTail."
        const excerpt = buildOriginExcerpt(
            text,
            anchorOn(text, "First line\nsecond line.")
        )

        expect(excerpt.quote).toBe("First line second line.")
        expect(excerpt.before).toBe("Lead.")
        expect(excerpt.after).toBe("Tail.")
    })

    test("a span past the end of the document degrades instead of throwing", () => {
        const excerpt = buildOriginExcerpt(DOC, {
            startCodePoint: DOC.indexOf("government."),
            endCodePoint: DOC.length + 5000,
        })

        expect(excerpt.quote).toBe("government.")
        expect(excerpt.elidedEnd).toBe(false)
    })

    test("an inverted span yields an empty quote instead of throwing", () => {
        const excerpt = buildOriginExcerpt(DOC, {
            startCodePoint: 40,
            endCodePoint: 10,
        })

        expect(excerpt.quote).toBe("")
    })

    test("a negative start clamps to the beginning", () => {
        const excerpt = buildOriginExcerpt(DOC, {
            startCodePoint: -20,
            endCodePoint: 8,
        })

        expect(excerpt.quote).toBe("It is a")
        expect(excerpt.elidedStart).toBe(false)
    })

    test("zero context returns the quote alone, still reporting elision", () => {
        const excerpt = buildOriginExcerpt(
            DOC,
            anchorOn(DOC, "when any defence"),
            0
        )

        expect(excerpt).toEqual({
            before: "",
            quote: "when any defence",
            after: "",
            elidedStart: true,
            elidedEnd: true,
        })
    })
})
