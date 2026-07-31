import { isClaimBound } from "@proposit/proposit-core"
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
// Unmarking DELETES the key. `entityChecksum` includes a field whenever the
// key is *present* on the entity, and `createChecksumConfig` unions the
// app's extra fields onto core's per-entity defaults rather than replacing
// them — and core's defaults now carry `enthymeme`. This app's effective
// `expressionFields` therefore contains it, and a mark demonstrably changes
// both the expression checksum and the premise checksum. Storing `null` or
// `false` to mean "not marked" would move every unmarked entity in existence
// off its current checksum and break hierarchical checksums and sync
// detection. Core's `updateExtras` and `patchExpressionAppFields` both delete
// a key whose value is `undefined`, which is why `undefined` is passed here
// rather than `false`.

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
 * Only a **claim-bound variable expression** may be marked. Core reports a
 * mark on an operator or formula expression, or on a premise-bound variable
 * expression, as a `P-6` Presentable violation — a premise-bound variable's
 * truth is derived from another premise's evaluation rather than asserted, so
 * declaring it unspoken says nothing. Per core's standing rule only Structural
 * violations throw, so core itself accepts the write and surfaces it at
 * `validate('presentable')`; this mutation refuses up front instead, because
 * it is the single route every caller takes and an author should not discover
 * the violation at publish time.
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
    const target = engine.getExpression(expressionId)
    if (!target) {
        throw new Error(`Expression ${expressionId} not found`)
    }
    if (target.type !== "variable") {
        throw new Error(
            `Expression ${expressionId} is ${target.type}, not a claim; only a claim can be marked unspoken`
        )
    }
    const variable = engine.getVariable(target.variableId)
    if (!variable || !isClaimBound(variable)) {
        throw new Error(
            `Expression ${expressionId} is bound to a premise, not a claim; only a claim can be marked unspoken`
        )
    }

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
            // A copy, not the engine's own object: the changeset is a record
            // of one moment, and a caller that queues changesets must not see
            // an earlier one silently re-write itself when the entity is
            // mutated again.
            expressions: {
                added: [],
                modified: [{ ...expression }],
                removed: [],
            },
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
 * Attaching over an existing, *different* document replaces it and **drops
 * every anchor into the old one** — an anchor is a pair of code-point offsets
 * into one exact text, and correcting a source means replacing it. This is the
 * same rule {@link mutateDetachOriginDocument} states; the replace path is
 * where it is easiest to forget.
 *
 * **Persistence: model surface, not the changeset.**
 */
export function mutateAttachOriginDocument(
    engine: PropositArgumentEngine,
    document: TOriginDocument,
    link: TOriginLink
): { document: TOriginDocument; link: TOriginLink } {
    if (link.documentId !== document.id) {
        throw new Error(
            `Link ${link.id} points at document ${link.documentId}, not the document being attached (${document.id})`
        )
    }
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
