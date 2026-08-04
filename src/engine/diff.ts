import type { TCoreArgumentDiff } from "@proposit/proposit-core"
import type { TArgument, TArgumentDiff } from "../schemas/model/arguments.js"
import type { TClaim } from "../schemas/model/claims.js"
import type { TClaimCitation } from "../schemas/model/citations.js"
import type {
    TPropositionalVariable,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
} from "../schemas/logic.js"

export interface TComposeArgumentDiffInput {
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
    input: TComposeArgumentDiffInput
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
                    {
                        field: "digest",
                        before: before.digest,
                        after: after.digest,
                    },
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
    for (const m of citations.modified)
        changedCitationClaimIds.add(m.after.claimId)
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
    // Core's diff premise objects lack `role`; the full app-level premise must
    // be re-sourced from the caller's arrays. A missing id means the caller's
    // premise arrays disagree with the core diff — fail loud rather than emit a
    // schema-invalid identity-only premise onto the wire.
    const requirePremise = (
        byId: ReadonlyMap<string, TPropositionalPremise>,
        id: string,
        source: "premisesBefore" | "premisesAfter"
    ): TPropositionalPremise => {
        const premise = byId.get(id)
        if (!premise) {
            throw new Error(
                `composeArgumentDiff: premise "${id}" from the core diff is missing from ${source}`
            )
        }
        return premise
    }
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

    // A premise `title` is application-level display text, deliberately outside
    // the engine's premise checksum — so a title-only edit is invisible to the
    // structural diff and is detected here instead. It is the premise's own
    // content, hence `modified-own`. Absent / null / "" all mean "no title" and
    // must not read as a change against one another.
    const premiseTitle = (p: TPropositionalPremise) => p.title ?? ""
    const titleChanges = new Map<
        string,
        { field: string; before: unknown; after: unknown }
    >()
    for (const after of input.premisesAfter) {
        if (!keepPremise(after)) continue
        const before = beforePremiseById.get(after.id)
        if (!before) continue
        if (premiseTitle(before) === premiseTitle(after)) continue
        titleChanges.set(after.id, {
            field: "title",
            before: before.title ?? null,
            after: after.title ?? null,
        })
    }

    type TModifiedPremise = TArgumentDiff["premises"]["modified"][number]
    // Core's structurally-modified premises come first, absorbing any title
    // change for the same premise so it is reported once, not twice.
    const modifiedPremises: TModifiedPremise[] = coreDiff.premises.modified
        .filter((m) => keepPremise(m.after))
        .map((m) => {
            const titleChange = titleChanges.get(m.after.id)
            titleChanges.delete(m.after.id)
            return {
                before: requirePremise(
                    beforePremiseById,
                    m.before.id,
                    "premisesBefore"
                ),
                after: requirePremise(
                    afterPremiseById,
                    m.after.id,
                    "premisesAfter"
                ),
                changes: titleChange ? [...m.changes, titleChange] : m.changes,
                state: titleChange ? "modified-own" : m.state,
                expressions: keepExprSet(m.expressions),
            } as TModifiedPremise
        })
    for (const [id, titleChange] of titleChanges) {
        modifiedPremises.push({
            before: requirePremise(beforePremiseById, id, "premisesBefore"),
            after: requirePremise(afterPremiseById, id, "premisesAfter"),
            changes: [titleChange],
            state: "modified-own",
            expressions: { added: [], removed: [], modified: [] },
        } as TModifiedPremise)
    }

    const premises: TArgumentDiff["premises"] = {
        added: coreDiff.premises.added
            .filter(keepPremise)
            .map((p) =>
                requirePremise(afterPremiseById, p.id, "premisesAfter")
            ),
        removed: coreDiff.premises.removed
            .filter(keepPremise)
            .map((p) =>
                requirePremise(beforePremiseById, p.id, "premisesBefore")
            ),
        modified: modifiedPremises,
    }

    return {
        claims: {
            added: claimsAdded,
            removed: claimsRemoved,
            modified: claimsModified,
        },
        variables: coreDiff.variables as unknown as TArgumentDiff["variables"],
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

// A citation is a directional support edge; its identity is the endpoint pair
// (claimId, supportingClaimId). The row id is minted fresh when an edge is
// carried across versions/forks, and the checksum is the edge's content — so
// neither can serve as identity. A matched edge whose supporting-referent pin
// or checksum moved reflects that a referenced claim advanced: modified-within,
// never modified-own (changing an endpoint is a different edge).
const citationKey = (c: TClaimCitation) => `${c.claimId}:${c.supportingClaimId}`

function composeCitations(
    input: TComposeArgumentDiffInput
): TArgumentDiff["citations"] {
    const beforeByKey = new Map(
        input.citationsBefore.map((c) => [citationKey(c), c])
    )
    const matched = new Set<string>()
    const added: TClaimCitation[] = []
    const modified: TArgumentDiff["citations"]["modified"] = []

    for (const after of input.citationsAfter) {
        const key = citationKey(after)
        const before = beforeByKey.get(key)
        if (!before) {
            added.push(after)
            continue
        }
        matched.add(key)
        const changes = citationReferentChanges(before, after)
        if (changes.length > 0) {
            modified.push({ before, after, changes, state: "modified-within" })
        }
    }
    const removed = input.citationsBefore.filter(
        (c) => !matched.has(citationKey(c))
    )
    return { added, removed, modified }
}

// Only the supporting referent's own signals count. The citing side's
// `claimVersion` is the citing claim's head version — a bump there is that
// claim's own edit, not a change to what it references, and must not flip the
// edge to `modified-within`.
function citationReferentChanges(
    before: TClaimCitation,
    after: TClaimCitation
) {
    const changes: { field: string; before: unknown; after: unknown }[] = []
    for (const field of ["supportingClaimVersion", "checksum"] as const) {
        if (before[field] !== after[field]) {
            changes.push({ field, before: before[field], after: after[field] })
        }
    }
    return changes
}
