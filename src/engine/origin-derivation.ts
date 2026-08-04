import { isClaimBound } from "@proposit/proposit-core"
import type { TOriginAnchorTargetType } from "../schemas/model/origin.js"
import type { TProjectReactiveSnapshot } from "./engine.js"

/**
 * A piece of argument content the reader may want to declare unspoken: it
 * traces to no span of a source text the argument claims to represent.
 *
 * A suggestion is a suggestion. Nothing here writes a mark, and no code path
 * anywhere may mark content unspoken without an explicit human action.
 */
export type TEnthymemeSuggestion = {
    targetType: TOriginAnchorTargetType
    targetId: string
}

/**
 * Content that is both anchored to the source text and declared unspoken —
 * two statements that cannot both be true.
 */
export type TEnthymemeContradiction = TEnthymemeSuggestion & {
    anchorIds: string[]
}

/**
 * Content whose absence from the source text carries no meaning: the stance
 * is `seed`, or there is no source text at all. Both derivations below are
 * empty in that case, because only under `representation` does the argument
 * claim to reproduce its source, and only then does unanchored content say
 * anything.
 *
 * Provenance highlighting is deliberately NOT gated this way — "this came
 * from here" is true under either stance.
 */
function claimsToRepresentSource(snapshot: TProjectReactiveSnapshot): boolean {
    // The document is checked as well as the stance, not just for symmetry: a
    // link can outlive its document (a detach that removed the row but not the
    // link, or a `GET …/origin` body whose two fields are typed
    // independently), and a `representation` stance with nothing to compare
    // against would suggest that every premise in the argument goes unspoken.
    return (
        snapshot.origin?.document !== undefined &&
        snapshot.origin.link?.stance === "representation"
    )
}

/**
 * Walks the content an enthymeme mark can legally sit on: every premise, and
 * every claim-bound variable expression within it.
 *
 * Premise-bound variable expressions are excluded. Their truth is derived
 * from another premise's evaluation rather than asserted, so core's `P-6`
 * reports a mark on one as a Presentable violation — suggesting it would be
 * suggesting a violation. Operator and formula expressions are excluded for
 * the same reason.
 *
 * Derivation premises are excluded whole. They are engine-synthesized — one
 * per claim, each carrying a consequent expression bound to the same claim the
 * authored expression is — so walking them reports every claim twice plus a
 * titleless premise the author never wrote, and a mark on one lands on content
 * nothing renders and so nothing can un-mark.
 */
function* markableContent(snapshot: TProjectReactiveSnapshot): Generator<{
    targetType: TOriginAnchorTargetType
    targetId: string
    marked: boolean
}> {
    for (const premiseSnapshot of Object.values(snapshot.premises)) {
        if (premiseSnapshot.premise.type === "derivation") continue
        yield {
            targetType: "premise",
            targetId: premiseSnapshot.premise.id,
            marked: premiseSnapshot.premise.enthymeme === true,
        }
        for (const expression of Object.values(premiseSnapshot.expressions)) {
            if (expression.type !== "variable") continue
            const variable = snapshot.variables[expression.variableId]
            if (!variable || !isClaimBound(variable)) continue
            yield {
                targetType: "expression",
                targetId: expression.id,
                marked: expression.enthymeme === true,
            }
        }
    }
}

/**
 * Content the author may want to declare unspoken: unanchored, unmarked, and
 * under a `representation` stance.
 *
 * Pure — reads the snapshot and returns a list. It mutates nothing, by
 * design: an enthymeme is declared, never derived.
 */
export function deriveEnthymemeSuggestions(
    snapshot: TProjectReactiveSnapshot
): TEnthymemeSuggestion[] {
    if (!claimsToRepresentSource(snapshot)) return []

    const suggestions: TEnthymemeSuggestion[] = []
    for (const { targetType, targetId, marked } of markableContent(snapshot)) {
        if (marked) continue
        if ((snapshot.origin?.anchors[targetId] ?? []).length > 0) continue
        suggestions.push({ targetType, targetId })
    }
    return suggestions
}

/**
 * Content that is both anchored to the source text and declared unspoken,
 * under a `representation` stance. Under `seed`, and with no source text, the
 * pairing says nothing and nothing is reported.
 *
 * Pure — mutates nothing.
 */
export function deriveEnthymemeContradictions(
    snapshot: TProjectReactiveSnapshot
): TEnthymemeContradiction[] {
    if (!claimsToRepresentSource(snapshot)) return []

    const contradictions: TEnthymemeContradiction[] = []
    for (const { targetType, targetId, marked } of markableContent(snapshot)) {
        if (!marked) continue
        const anchors = snapshot.origin?.anchors[targetId] ?? []
        if (anchors.length === 0) continue
        contradictions.push({
            targetType,
            targetId,
            anchorIds: anchors.map((anchor) => anchor.id),
        })
    }
    return contradictions
}
