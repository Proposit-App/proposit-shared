import { codePointLength } from "@proposit/proposit-core"

/**
 * The length at which a source text stops being something to read in place.
 *
 * Roughly 260 words of English prose — the curated corpus in this package runs
 * 5.3–6.0 characters per word — which is a few paragraphs: enough to sit inside
 * an argument's own reading surface without pushing the argument off screen, and
 * short enough that a reader is not asked to scroll a sidebar to reach the end
 * of it. Past this, a reading surface of its own is the only presentation that
 * works.
 *
 * Code points rather than words, deliberately. A whitespace word count cannot
 * see a script that does not put spaces between words: a 40,000-character
 * Chinese or Japanese source text scores as roughly one word and would render
 * in place, which is the failure this threshold exists to prevent, in the case
 * where it is worst. Code points are also the unit the rest of the origin
 * surface already speaks — anchors, offsets, excerpt context — so there is no
 * second unit to keep in step.
 *
 * One constant, one predicate: moving the line is a one-line edit here rather
 * than a hunt through call sites.
 */
export const LARGE_ORIGIN_DOCUMENT_CODE_POINTS = 1500

/**
 * Whether a source text is long enough to need a reading surface of its own.
 *
 * Counted with `codePointLength`, not `String.prototype.length`: a UTF-16 length
 * counts every astral character twice, so an emoji-dense document measures up to
 * double its real size and crosses the line early.
 */
export function isLargeOriginDocument(text: string): boolean {
    return codePointLength(text) > LARGE_ORIGIN_DOCUMENT_CODE_POINTS
}
