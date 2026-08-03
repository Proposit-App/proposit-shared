import { codePointLength, sliceByCodePoints } from "@proposit/proposit-core"
import type { TProjectReactiveSnapshot } from "../engine.js"
import type { TOriginAnchor } from "../../schemas/model/origin.js"

/**
 * One stretch of the source text. `anchorIds` is empty on a stretch nothing
 * derives from; otherwise it names every anchor covering the stretch, and
 * `targetIds` every premise or claim expression those anchors belong to.
 */
export type TOriginRun = {
    text: string
    anchorIds: readonly string[]
    targetIds: readonly string[]
}

/**
 * Whether an anchor's span actually addresses a stretch of this document.
 * `originAnchors` carries no constraint tying a span to its document's length,
 * so an out-of-range one is a state the reading surface has to survive.
 */
function isAnchorInDocument(
    anchor: TOriginAnchor,
    documentLength: number
): boolean {
    return (
        anchor.startCodePoint >= 0 &&
        anchor.endCodePoint <= documentLength &&
        anchor.startCodePoint < anchor.endCodePoint
    )
}

/**
 * The anchors recorded against one target — a claim's expression id, a premise
 * id, or the argument id. Optional-chained: a snapshot rehydrated from wire data
 * written before origin data existed carries no origin slice at all.
 *
 * Applies the same span-validity filter {@link buildOriginRuns} does, so both
 * ends of the pairing agree on what an anchor is. Without that, an out-of-range
 * anchor produced a cue whose highlight no passage could ever match — a dead
 * control, which is the thing an argument with no source text is careful not to
 * grow.
 */
export function anchorsForTarget(
    snapshot: TProjectReactiveSnapshot,
    targetId: string
): TOriginAnchor[] {
    const document = snapshot.origin?.document
    if (!document) return []
    const length = codePointLength(document.text)
    return (snapshot.origin?.anchors?.[targetId] ?? []).filter((anchor) =>
        isAnchorInDocument(anchor, length)
    )
}

/**
 * The source text split into ordered runs for rendering.
 *
 * Anchors sharing a span collapse into one run, and overlapping spans merge
 * rather than nest: a highlight inside a highlight has no meaning a reader can
 * act on, and the same passage anchored from two places is one region of text.
 * A claim used in two premises is anchored at both of its expressions, so this
 * is the common case, not an edge case.
 *
 * Offsets are code-point offsets into the stored text, so every slice goes
 * through `sliceByCodePoints` — a UTF-16 slice would cut an astral character in
 * half.
 */
export function buildOriginRuns(
    snapshot: TProjectReactiveSnapshot
): TOriginRun[] {
    const document = snapshot.origin?.document
    if (!document) return []

    const length = codePointLength(document.text)
    const spans = Object.values(snapshot.origin?.anchors ?? {})
        .flat()
        .filter((anchor) => isAnchorInDocument(anchor, length))
        .sort((a, b) => a.startCodePoint - b.startCodePoint)

    const runs: TOriginRun[] = []
    let cursor = 0
    const plain = (start: number, end: number) => {
        if (end > start) {
            runs.push({
                text: sliceByCodePoints(document.text, start, end),
                anchorIds: [],
                targetIds: [],
            })
        }
    }

    for (let i = 0; i < spans.length; ) {
        // Absorb every later anchor that overlaps the group built so far, so
        // the emitted run is one flat region however the spans interleave.
        let end = spans[i].endCodePoint
        let j = i + 1
        while (j < spans.length && spans[j].startCodePoint < end) {
            end = Math.max(end, spans[j].endCodePoint)
            j++
        }
        const group = spans.slice(i, j)
        const start = spans[i].startCodePoint

        plain(cursor, start)
        runs.push({
            text: sliceByCodePoints(document.text, start, end),
            anchorIds: group.map((a) => a.id),
            targetIds: Array.from(new Set(group.map((a) => a.targetId))),
        })
        cursor = end
        i = j
    }
    plain(cursor, length)

    return runs
}
