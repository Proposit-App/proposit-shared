import type { TArgumentDiff, TDiffState } from "../schemas/model/arguments.js"
import type { TClaim } from "../schemas/model/claims.js"
import type { TClaimCitation } from "../schemas/model/citations.js"
import type {
    TPropositionalVariable,
    TPremiseRoleType,
} from "../schemas/logic.js"

/** Visual intent for one entity, keyed on diff state rather than edge type. */
export type TDiffCue = "added" | "removed" | "origin" | "touched"

export interface TDiffRenderMaps {
    nodeDiffMap: Map<string, TDiffCue>
    premiseDiffMap: Map<string, TDiffCue>
    edgeDiffMap: Map<string, TDiffCue>
    citationDiffMap: Map<string, TDiffCue>
    removedClaims: Map<string, TClaim>
    removedVariables: Map<string, TPropositionalVariable>
    removedPremises: Map<
        string,
        { role: TPremiseRoleType; title: string | null }
    >
    removedCitations: Map<string, TClaimCitation[]>
}

// `modified-own` is the single origin of a change (strong cue); every container
// or referrer that only reflects it is `modified-within` (subtle "touched").
const stateToCue = (state: TDiffState): TDiffCue =>
    state === "modified-own" ? "origin" : "touched"

export function buildDiffRenderMaps(diff: TArgumentDiff): TDiffRenderMaps {
    const nodeDiffMap = new Map<string, TDiffCue>()
    const premiseDiffMap = new Map<string, TDiffCue>()
    const edgeDiffMap = new Map<string, TDiffCue>()
    const citationDiffMap = new Map<string, TDiffCue>()

    // Belt-and-braces: derivation premises must never surface here even though
    // the composition already filtered them.
    const derivationPremiseIds = new Set(
        [...diff.premises.added, ...diff.premises.removed]
            .filter((p) => p.type === "derivation")
            .map((p) => p.id)
    )

    for (const p of diff.premises.added) {
        if (p.type === "derivation") continue
        premiseDiffMap.set(p.id, "added")
    }
    for (const p of diff.premises.removed) {
        if (p.type === "derivation") continue
        premiseDiffMap.set(p.id, "removed")
    }
    for (const m of diff.premises.modified) {
        if (derivationPremiseIds.has(m.after.id)) continue
        premiseDiffMap.set(m.after.id, stateToCue(m.state))
        const setExpr = (
            e: { id: string; type: string; premiseId?: string },
            cue: TDiffCue
        ) => {
            if (derivationPremiseIds.has(e.premiseId ?? "")) return
            if (e.type === "operator") edgeDiffMap.set(e.id, cue)
            else nodeDiffMap.set(e.id, cue)
        }
        for (const e of m.expressions.added) setExpr(e, "added")
        for (const e of m.expressions.removed) setExpr(e, "removed")
        for (const em of m.expressions.modified)
            setExpr(em.after, stateToCue(em.state))
    }

    for (const c of diff.claims.added) nodeDiffMap.set(`claim:${c.id}`, "added")
    for (const c of diff.claims.removed)
        nodeDiffMap.set(`claim:${c.id}`, "removed")
    for (const m of diff.claims.modified)
        nodeDiffMap.set(`claim:${m.after.id}`, stateToCue(m.state))

    for (const v of diff.variables.added)
        nodeDiffMap.set(`variable:${v.id}`, "added")
    for (const v of diff.variables.removed)
        nodeDiffMap.set(`variable:${v.id}`, "removed")
    for (const m of diff.variables.modified)
        nodeDiffMap.set(`variable:${m.after.id}`, stateToCue(m.state))

    for (const cc of diff.citations.added)
        citationDiffMap.set(`${cc.claimId}:${cc.supportingClaimId}`, "added")
    for (const cc of diff.citations.removed)
        citationDiffMap.set(`${cc.claimId}:${cc.supportingClaimId}`, "removed")
    for (const m of diff.citations.modified)
        citationDiffMap.set(
            `${m.after.claimId}:${m.after.supportingClaimId}`,
            stateToCue(m.state)
        )

    const removedClaims = new Map(diff.claims.removed.map((c) => [c.id, c]))
    const removedVariables = new Map(
        diff.variables.removed.map((v) => [v.id, v])
    )
    const removedPremises = new Map(
        diff.premises.removed.map((p) => [
            p.id,
            { role: p.role, title: p.title ?? null },
        ])
    )
    const removedCitations = new Map<string, TClaimCitation[]>()
    for (const cc of diff.citations.removed) {
        const list = removedCitations.get(cc.claimId)
        if (list) list.push(cc)
        else removedCitations.set(cc.claimId, [cc])
    }

    return {
        nodeDiffMap,
        premiseDiffMap,
        edgeDiffMap,
        citationDiffMap,
        removedClaims,
        removedVariables,
        removedPremises,
        removedCitations,
    }
}
