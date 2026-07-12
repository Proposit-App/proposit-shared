import type { TCoreArgumentDiff } from "@proposit/proposit-core"
import type { TArgument, TArgumentDiff } from "../schemas/model/arguments.js"
import type { TClaim } from "../schemas/model/claims.js"
import type { TClaimCitation } from "../schemas/model/citations.js"
import type {
    TPropositionalVariable,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
} from "../schemas/logic.js"

export interface ComposeArgumentDiffInput {
    coreDiff: TCoreArgumentDiff<
        TArgument,
        TPropositionalVariable,
        TPropositionalPremise,
        TPropositionalExpressionCombined
    >
    /** Normal claims on the before side (the caller pre-filters citation/axiom). */
    claimsBefore: TClaim[]
    claimsAfter: TClaim[]
    citationsBefore: TClaimCitation[]
    citationsAfter: TClaimCitation[]
    /** Engine-synthesized premises to drop from premises + expressions. */
    derivationPremiseIds: ReadonlySet<string>
    /**
     * Full app-level premises for each side. Core's diff premise objects carry
     * only identity fields — `role` (a property of the argument/premise pairing)
     * is not on the core entity — so the composition re-attaches it from these
     * arrays to satisfy the app-level premise schema.
     */
    premisesBefore: TPropositionalPremise[]
    premisesAfter: TPropositionalPremise[]
    /** entityId -> forkedFromEntityId, to pair a claim across a fork rename. */
    claimForkMap?: ReadonlyMap<string, string>
}

/**
 * Folds app-level claim + citation diffs onto core's structural argument diff,
 * producing the lossless four-state wire shape. Claims and citations are not
 * part of the engine's structural graph, so their diffs are composed here from
 * the entity arrays the caller supplies (the caller owns data access).
 */
export function composeArgumentDiff(
    input: ComposeArgumentDiffInput
): TArgumentDiff {
    const { coreDiff, derivationPremiseIds } = input

    const citations = composeCitations(input)

    // Claims: match after -> before by id (through the fork map when a fork
    // renamed the entity). A digest change is the entity's own content change.
    const beforeById = new Map(input.claimsBefore.map((c) => [c.id, c]))
    const matchedBefore = new Set<string>()
    const claimsAdded: TClaim[] = []
    const claimsModified: TArgumentDiff["claims"]["modified"] = []
    const unchangedMatched: { before: TClaim; after: TClaim }[] = []
    for (const after of input.claimsAfter) {
        const beforeId = input.claimForkMap?.get(after.id) ?? after.id
        const before = beforeById.get(beforeId)
        if (!before) {
            claimsAdded.push(after)
            continue
        }
        matchedBefore.add(before.id)
        if (before.digest !== after.digest) {
            claimsModified.push({
                before,
                after,
                changes: [
                    { field: "digest", before: before.digest, after: after.digest },
                ],
                state: "modified-own",
            })
        } else {
            unchangedMatched.push({ before, after })
        }
    }
    const claimsRemoved = input.claimsBefore.filter(
        (c) => !matchedBefore.has(c.id)
    )

    // A claim whose own content is unchanged still reads as `modified-within`
    // when a citation edge it owns changed (added/removed/version-bumped) or the
    // claim it cites was itself edited. The origin stays the cited claim's
    // `modified-own`; the citing claim is a container the change reaches. Own
    // content change wins — a `modified-own` claim is never re-marked.
    const ownModifiedClaimIds = new Set(claimsModified.map((m) => m.after.id))
    const changedCitationClaimIds = new Set<string>()
    for (const c of citations.added) changedCitationClaimIds.add(c.claimId)
    for (const c of citations.removed) changedCitationClaimIds.add(c.claimId)
    for (const m of citations.modified) changedCitationClaimIds.add(m.after.claimId)
    const citesModifiedOwnClaim = new Set<string>()
    for (const cite of input.citationsAfter) {
        if (ownModifiedClaimIds.has(cite.supportingClaimId)) {
            citesModifiedOwnClaim.add(cite.claimId)
        }
    }
    for (const { before, after } of unchangedMatched) {
        if (
            changedCitationClaimIds.has(after.id) ||
            citesModifiedOwnClaim.has(after.id)
        ) {
            claimsModified.push({
                before,
                after,
                changes: [],
                state: "modified-within",
            })
        }
    }

    // Premises / expressions: carry core's four-state through, re-attaching the
    // full app-level premise (for `role`), and dropping engine-synthesized
    // derivation premises (and their expressions) — auto-managed model state,
    // not authored content.
    const beforePremiseById = new Map(
        input.premisesBefore.map((p) => [p.id, p])
    )
    const afterPremiseById = new Map(input.premisesAfter.map((p) => [p.id, p]))
    const keepPremise = (p: { id: string }) => !derivationPremiseIds.has(p.id)
    const keepExprSet = <E extends { premiseId?: string }>(set: {
        added: E[]
        removed: E[]
        modified: { before: E; after: E; changes: unknown[]; state: string }[]
    }) => ({
        added: set.added.filter(
            (e) => !derivationPremiseIds.has(e.premiseId ?? "")
        ),
        removed: set.removed.filter(
            (e) => !derivationPremiseIds.has(e.premiseId ?? "")
        ),
        modified: set.modified.filter(
            (m) => !derivationPremiseIds.has(m.after.premiseId ?? "")
        ),
    })

    type ModifiedPremise = TArgumentDiff["premises"]["modified"][number]
    const premises: TArgumentDiff["premises"] = {
        added: coreDiff.premises.added
            .filter(keepPremise)
            .map(
                (p) => afterPremiseById.get(p.id) ?? p
            ) as TArgumentDiff["premises"]["added"],
        removed: coreDiff.premises.removed
            .filter(keepPremise)
            .map(
                (p) => beforePremiseById.get(p.id) ?? p
            ) as TArgumentDiff["premises"]["removed"],
        modified: coreDiff.premises.modified
            .filter((m) => keepPremise(m.after))
            .map(
                (m) =>
                    ({
                        before: beforePremiseById.get(m.before.id) ?? m.before,
                        after: afterPremiseById.get(m.after.id) ?? m.after,
                        changes: m.changes,
                        state: m.state,
                        expressions: keepExprSet(m.expressions),
                    }) as ModifiedPremise
            ),
    }

    return {
        claims: {
            added: claimsAdded,
            removed: claimsRemoved,
            modified: claimsModified,
        },
        variables:
            coreDiff.variables as unknown as TArgumentDiff["variables"],
        premises,
        citations,
        roles: {
            conclusion: {
                before: coreDiff.roles.conclusion.before ?? null,
                after: coreDiff.roles.conclusion.after ?? null,
            },
        },
    }
}

// Placeholder citation diff — replaced by the endpoint-pair implementation.
function composeCitations(
    _input: ComposeArgumentDiffInput
): TArgumentDiff["citations"] {
    return { added: [], removed: [], modified: [] }
}
