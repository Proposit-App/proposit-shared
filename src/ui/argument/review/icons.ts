/**
 * The semantic marks the review surface draws, named once so the web app and
 * the mobile app label the same concepts the same way.
 *
 * **Names only.** No components, no glyphs, no runtime registry: the two
 * clients draw from incompatible sources (MUI icon components on the web,
 * Ionicons glyph names and vendored SVG paths on mobile), and neither can hold
 * the other's artwork. What they can share is the vocabulary — each declares a
 * review-scoped map `satisfies Record<TReviewIconName, …>` in its own terms,
 * which makes an unmapped name a compile error there rather than a blank icon
 * at runtime.
 *
 * A name belongs here once **both** clients draw a mark for that concept.
 * `satisfies` rejects extra keys as well as missing ones, so a name neither
 * repo has artwork for cannot be quietly left unmapped — it would force one of
 * them to invent a mark it renders nowhere. Adding a name later is a compile
 * error in both repos until both map it, which is the point.
 */
export const REVIEW_ICON_NAMES = [
    /**
     * The mark on the conclusion-assessment chip — the axis about the
     * proposition. Drawn as a checked document in both clients.
     */
    "conclusionAxis",
    /**
     * The mark on the argument-outcome chip — the axis about the author's
     * work. Drawn as two columns of text set side by side, so the two chips
     * are told apart by shape as well as by wording.
     */
    "argumentAxis",
] as const

export type TReviewIconName = (typeof REVIEW_ICON_NAMES)[number]
