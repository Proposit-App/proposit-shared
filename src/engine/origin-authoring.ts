import { codePointLength, isClaimBound } from "@proposit/proposit-core"
import type { TProjectReactiveSnapshot } from "./engine.js"
import type { TOriginAnchor, TOriginDocument } from "../schemas/model/origin.js"

/**
 * The authoring half of the origin surface: the pure decisions the editing
 * controls make, kept out of the components so they can be measured and so that
 * every client answers them the same way.
 *
 * The reading half lives in `./render/origin-runs.js` and its neighbours. The
 * split is by direction, not by feature — reading turns stored anchors into runs
 * and cues, authoring turns a human's selection and a snapshot into a request
 * the server will accept.
 */

/**
 * A UTF-16 index into `text`, as its code-point offset.
 *
 * Every selection API counts UTF-16 code units; `originAnchors` and Postgres
 * `substring` both count code points. Mixing the two is how an off-by-N enters
 * silently — it is invisible on ASCII and wrong on the first emoji. The server's
 * origin model applies the same identity to the pipeline's offset hints, from
 * the other direction.
 */
export function utf16ToCodePoint(text: string, utf16Index: number): number {
    return codePointLength(text.slice(0, utf16Index))
}

/**
 * A text control's `selectionStart`/`selectionEnd` as the code-point span the
 * anchor request carries — or `null` when nothing is selected.
 *
 * `CreateOriginAnchorRequestSchema` refuses `endCodePoint <= startCodePoint`
 * through a `Type.Refine` that runs inside `strictFetch`'s pre-send
 * `Value.Assert`, so an empty or backwards span would throw before the network.
 * A caret sitting in the text with nothing selected is an ordinary state of the
 * control, not an error, so it is reported as absence and the caller keeps Save
 * disabled rather than catching a throw.
 */
export function selectionToCodePointSpan(
    text: string,
    selectionStart: number,
    selectionEnd: number
): { startCodePoint: number; endCodePoint: number } | null {
    if (selectionEnd <= selectionStart) return null
    return {
        startCodePoint: utf16ToCodePoint(text, selectionStart),
        endCodePoint: utf16ToCodePoint(text, selectionEnd),
    }
}

/** The premise snapshot holding `expressionId`, if any. */
function premiseHolding(
    snapshot: TProjectReactiveSnapshot,
    expressionId: string
) {
    for (const premiseSnapshot of Object.values(snapshot.premises)) {
        // Optional: a snapshot handed in by a preview or a fixture need not be
        // complete, and a missing expression map is not worth a render failure.
        if (premiseSnapshot.expressions?.[expressionId]) return premiseSnapshot
    }
    return undefined
}

/**
 * Whether this expression may be declared unspoken.
 *
 * Only a **claim-bound variable** may. An operator asserts nothing of its own;
 * a formula and a premise-bound variable derive their truth from elsewhere
 * rather than asserting it, so core reports a mark on any of them as a
 * Presentable violation and the route refuses it. Offering the affordance there
 * would be offering a control that fails — so the gate is here, in front of the
 * menu item, rather than in an error handler behind it.
 *
 * Premises are markable unconditionally and do not come through here.
 */
export function isMarkableExpression(
    snapshot: TProjectReactiveSnapshot,
    expressionId: string
): boolean {
    const expression = premiseHolding(snapshot, expressionId)?.expressions?.[
        expressionId
    ]
    if (expression?.type !== "variable") return false
    const variable = snapshot.variables[expression.variableId]
    return variable !== undefined && isClaimBound(variable)
}

/**
 * Whether this premise or claim expression is declared unspoken.
 *
 * Read straight off the entity rather than derived: an enthymeme is a statement
 * its author made, and it is meaningful with or without a source text, so this
 * is never gated on the origin document.
 */
export function isMarkedUnspoken(
    snapshot: TProjectReactiveSnapshot,
    targetId: string
): boolean {
    const premise = snapshot.premises[targetId]
    if (premise) return premise.premise.enthymeme === true
    const expression = premiseHolding(snapshot, targetId)?.expressions?.[
        targetId
    ]
    return expression?.type === "variable" && expression.enthymeme === true
}

/**
 * What a premise or claim expression is called, in words. Used wherever a target
 * has to be named away from its own card — the anchoring dialog's title and the
 * suggestion rows — so a reader can tell which part of the argument a control is
 * about without seeing it highlighted.
 */
export function describeTarget(
    snapshot: TProjectReactiveSnapshot,
    targetId: string
): string {
    const premise = snapshot.premises[targetId]
    // `||`, not `??`, on both titles below: these are nullable, uncapped text
    // columns where "absent" arrives as `""` at least as often as `null`, and a
    // nullish fallback would keep the empty string and render a control with no
    // name at all. Not a style preference — the tests pin both spellings of
    // absence.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (premise) return premise.premise.title || "an untitled premise"
    const expression = premiseHolding(snapshot, targetId)?.expressions?.[
        targetId
    ]
    if (expression?.type === "variable") {
        const variable = snapshot.variables[expression.variableId]
        const claimId =
            variable && "claimId" in variable ? variable.claimId : null
        const claim = claimId ? snapshot.claims[claimId] : undefined
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        return claim?.title || "a claim"
    }
    return "this argument"
}

/**
 * Every anchor recorded against one target, whether or not its span still
 * addresses the document — the authoring surface has to be able to remove an
 * anchor the reading surface refuses to draw, which is exactly the anchor a
 * reader would report as broken.
 */
export function allAnchorsForTarget(
    snapshot: TProjectReactiveSnapshot,
    targetId: string
): TOriginAnchor[] {
    return snapshot.origin?.anchors?.[targetId] ?? []
}

/**
 * Whether a stored attribution may still be written over.
 *
 * The client-side reading of the server's `isAttributionProvisional`, and it
 * must not drift from it: the server answers a second edit of a committed
 * attribution with a 400, and a UI that offers the edit anyway is a UI that
 * walks the user into it. The `unparsed` form is exempt because it is not an
 * attribution yet — it is what a platform import auto-fills from post data, a
 * prefill the person is meant to replace.
 *
 * The parameter admits `null` as well as `undefined` so that a caller reading a
 * stored column and a caller reading an optional field can both ask without a
 * cast. `== null` already answered for both, which is why the copies of this
 * rule had not yet drifted despite disagreeing about their own types.
 */
export function isAttributionEditable(
    reference: TOriginDocument["reference"] | null | undefined
): boolean {
    return reference == null || reference.type === "unparsed"
}
