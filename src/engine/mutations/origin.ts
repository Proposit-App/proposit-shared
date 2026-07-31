import type {
    TPropositionalExpressionCombined,
    TPropositionalPremise,
} from "../../schemas/logic.js"
import type {
    TOriginAnchor,
    TOriginDocument,
    TOriginLink,
    TOriginStance,
} from "../../schemas/model/origin.js"
import type { PropositArgumentEngine } from "../engine.js"
import type { ProjectChangeset } from "./types.js"

// ──── Enthymeme marks — changeset entities ─────────────────────────────────
//
// An enthymeme is declared, never derived: nothing below is reachable except
// from an explicit caller action. Both marks live on entities the engine
// already tracks in its changeset, so a consumer persists them through
// `persistChangeset` alongside every other logic edit.
//
// Unmarking DELETES the key. A present `enthymeme` key — even holding `null`
// or `false` — is included in the entity checksum, which would change the
// checksum of every premise and expression in existence and break
// hierarchical checksums. Core's `updateExtras` and `patchExpressionAppFields`
// both delete a key whose value is `undefined`, which is why `undefined` is
// passed here rather than `false`.

/**
 * Marks (or unmarks) a premise as going unspoken in the natural-language
 * original.
 *
 * **Persistence: changeset.** A premise is a changeset entity; persist the
 * returned `changes` through `persistChangeset`.
 */
export function mutateMarkPremiseEnthymeme(
    engine: PropositArgumentEngine,
    premiseId: string,
    marked: boolean
): { premise: TPropositionalPremise; changes: ProjectChangeset } {
    const pm = engine.getPremise(premiseId)
    if (!pm) {
        throw new Error(`Premise ${premiseId} not found`)
    }
    const { changes } = pm.updateExtras({
        enthymeme: marked ? true : undefined,
    })
    return { premise: pm.toPremiseData(), changes }
}

/**
 * Marks (or unmarks) a claim expression as going unspoken in the
 * natural-language original.
 *
 * **Persistence: changeset.** An expression is a changeset entity; persist the
 * returned `changes` through `persistChangeset`. Core's
 * `patchExpressionAppFields` returns nothing, so the changeset is assembled
 * from the patched expression read back off the engine.
 */
export function mutateMarkExpressionEnthymeme(
    engine: PropositArgumentEngine,
    expressionId: string,
    marked: boolean
): {
    expression: TPropositionalExpressionCombined
    changes: ProjectChangeset
} {
    engine.patchExpressionAppFields(expressionId, {
        enthymeme: marked ? true : undefined,
    } as Partial<TPropositionalExpressionCombined>)
    const expression = engine.getExpression(expressionId)
    if (!expression) {
        throw new Error(`Expression ${expressionId} not found`)
    }
    return {
        expression,
        changes: {
            expressions: { added: [], modified: [expression], removed: [] },
        },
    }
}

// ──── Origin library — its own model surface ───────────────────────────────
//
// Origin documents, links, and anchors never enter a `TCoreChangeset`, so
// none of the mutations below return one. They follow the `claimCitations`
// precedent: a consumer persists them through their own model surface, in
// dependency order — document, then link, then anchors, and delete in
// reverse.

/**
 * Attaches a source text to the argument version, together with the link
 * carrying its stance.
 *
 * **Persistence: model surface, not the changeset.**
 */
export function mutateAttachOriginDocument(
    engine: PropositArgumentEngine,
    document: TOriginDocument,
    link: TOriginLink
): { document: TOriginDocument; link: TOriginLink } {
    engine.setOriginDocument(document)
    engine.setOriginLink(link)
    return { document, link }
}

/**
 * Drops the source text, its link, and every anchor into it.
 *
 * Anchors are code-point offsets into one exact text, so replacing a document
 * invalidates them by design — they are removed rather than re-pointed.
 *
 * **Persistence: model surface, not the changeset.**
 */
export function mutateDetachOriginDocument(
    engine: PropositArgumentEngine
): void {
    engine.clearOrigin()
}

/**
 * Declares whether the argument claims to *represent* its source text or
 * merely *started* from it. The stance governs only whether the absence of
 * provenance is meaningful; provenance highlighting works under either.
 *
 * **Persistence: model surface, not the changeset.**
 */
export function mutateSetOriginStance(
    engine: PropositArgumentEngine,
    stance: TOriginStance
): { link: TOriginLink } {
    const existing = engine.getOrigin().link
    if (!existing) {
        throw new Error(
            "Cannot set a stance on an argument with no source text attached"
        )
    }
    const link: TOriginLink = { ...existing, stance }
    engine.setOriginLink(link)
    return { link }
}

/**
 * Records the span of the source text one argument part derives from.
 *
 * **Persistence: model surface, not the changeset.**
 */
export function mutateAddOriginAnchor(
    engine: PropositArgumentEngine,
    anchor: TOriginAnchor
): { anchor: TOriginAnchor } {
    engine.addOriginAnchor(anchor)
    return { anchor }
}

/**
 * Removes one anchor.
 *
 * **Persistence: model surface, not the changeset.**
 */
export function mutateRemoveOriginAnchor(
    engine: PropositArgumentEngine,
    anchorId: string
): void {
    engine.removeOriginAnchor(anchorId)
}

/**
 * Attributes the source text to a real, publicly reachable document, or
 * clears the attribution when `reference` is `undefined`.
 *
 * The document's entity checksum covers its content `digest`, not its open
 * properties, so attributing leaves the checksum unchanged — which is why
 * clearing deletes the key rather than writing `null`.
 *
 * **Persistence: model surface, not the changeset.**
 */
export function mutateAttributeOriginDocument(
    engine: PropositArgumentEngine,
    reference: TOriginDocument["reference"]
): { document: TOriginDocument } {
    const existing = engine.getOrigin().document
    if (!existing) {
        throw new Error(
            "Cannot attribute an argument with no source text attached"
        )
    }
    const { reference: _dropped, ...rest } = existing
    const document: TOriginDocument =
        reference === undefined ? rest : { ...rest, reference }
    engine.setOriginDocument(document)
    return { document }
}
