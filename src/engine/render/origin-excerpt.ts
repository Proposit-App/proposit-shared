import {
    buildCodePointIndex,
    codePointLength,
    sliceByCodePointsIndexed,
} from "@proposit/proposit-core"
import type { TOriginAnchor } from "../../schemas/model/origin.js"

/**
 * How much of the source text to show either side of an anchored passage.
 *
 * A passage on its own reads as a fragment — an anchor starts and stops
 * mid-clause, because that is what an anchor is. Enough context to see where it
 * sat is a few words, not a paragraph: the surfaces that render this put it in a
 * small box beside the content it explains.
 */
const DEFAULT_CONTEXT_CODE_POINTS = 60

/**
 * An anchored passage with a little of the writing around it.
 *
 * Three parts rather than one string, so each surface decides its own
 * presentation — the web reading surface paints the quote with the origin
 * highlight accent and greys the context, which it could not do with a
 * pre-joined string.
 *
 * The elision flags describe **the window, not the trim**: they say whether text
 * exists beyond what is shown, which is what an ellipsis claims. Context that
 * trimmed away to nothing (see below) leaves its flag alone.
 */
export type TOriginExcerpt = {
    /** Context before the quote. `""` when the anchor starts the document. */
    before: string
    /** The anchored passage, whole. */
    quote: string
    /** Context after the quote. `""` when the anchor ends the document. */
    after: string
    /** Text exists before `before` — render a leading ellipsis. */
    elidedStart: boolean
    /** Text exists after `after` — render a trailing ellipsis. */
    elidedEnd: boolean
}

/**
 * `normalizeOriginText` deliberately preserves internal whitespace and line
 * breaks, because the document is meant to be the original. An excerpt is not
 * the original — it renders in a box a few lines tall, where a paragraph break
 * spends height on nothing. `originPassage` collapses for the same reason.
 */
function collapse(text: string): string {
    return text.replace(/\s+/g, " ")
}

/**
 * The excerpt of a source text around one anchor: the quote, the writing either
 * side of it, and whether anything was dropped at either end.
 *
 * Pure. Offsets are code points throughout — a UTF-16 slice at the same numbers
 * splits an astral character into surrogate halves and passes every ASCII test.
 *
 * Out-of-range and inverted spans degrade rather than throw. `originAnchors`
 * carries no constraint tying a span to its document's length, so a reading
 * surface has to survive one; a consumer that filters them out first (as
 * `anchorsForTarget` does) simply never exercises this.
 */
export function buildOriginExcerpt(
    text: string,
    anchor: Pick<TOriginAnchor, "startCodePoint" | "endCodePoint">,
    contextCodePoints: number = DEFAULT_CONTEXT_CODE_POINTS
): TOriginExcerpt {
    const length = codePointLength(text)
    const index = buildCodePointIndex(text)
    const slice = (from: number, to: number) =>
        sliceByCodePointsIndexed(index, from, to)

    const start = Math.min(Math.max(anchor.startCodePoint, 0), length)
    const end = Math.min(Math.max(anchor.endCodePoint, start), length)

    const windowStart = Math.max(0, start - contextCodePoints)
    const windowEnd = Math.min(length, end + contextCodePoints)

    const elidedStart = windowStart > 0
    const elidedEnd = windowEnd < length

    let before = collapse(slice(windowStart, start))
    const quote = collapse(slice(start, end))
    let after = collapse(slice(end, windowEnd))

    // Snap inward to a word boundary, so no context word is shown in half.
    //
    // Inward rather than outward: extending to take in the whole cut word cannot
    // be bounded without a second cap, because one "word" can be a
    // 200-character URL and these documents are pasted articles. Inward costs at
    // most one word and needs no cap.
    //
    // Only where the window actually cut a word, which is two conditions, not
    // one. The window must have stopped short of the document's edge — else it
    // cut nothing and trimming would eat the source text's opening word — AND
    // the character just outside it must not be whitespace, else the window
    // happened to land on a boundary and the first word is already whole.
    if (elidedStart && !/\s/.test(slice(windowStart - 1, windowStart))) {
        const firstSpace = before.indexOf(" ")
        before = firstSpace === -1 ? "" : before.slice(firstSpace + 1)
    }
    if (elidedEnd && !/\s/.test(slice(windowEnd, windowEnd + 1))) {
        const lastSpace = after.lastIndexOf(" ")
        after = lastSpace === -1 ? "" : after.slice(0, lastSpace)
    }

    return {
        before: before.trim(),
        quote: quote.trim(),
        after: after.trim(),
        elidedStart,
        elidedEnd,
    }
}
