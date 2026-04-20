import type { TClaim } from "../../schemas/model/claims.js"
import type { PropositArgumentEngine } from "../engine.js"
import type { ProjectChangeset } from "./types.js"
import { mergeChangesets } from "./types.js"

export function mutateSetClaim(
    engine: PropositArgumentEngine,
    claim: TClaim
): void {
    engine.setClaim(claim)
}

export function mutateUpdateClaim(
    engine: PropositArgumentEngine,
    claim: TClaim
): void {
    engine.setClaim(claim)
}

export function mutateRemoveClaimWithCascade(
    engine: PropositArgumentEngine,
    claimId: string
): { removedVariableIds: string[]; changes: ProjectChangeset } {
    const removedVariableIds: string[] = []
    let changes: ProjectChangeset = {}

    // Find and remove all variables referencing this claim (cascade to expressions)
    for (const variable of engine.getVariables()) {
        if ("claimId" in variable && variable.claimId === claimId) {
            const { changes: varChanges } = engine.removeVariable(variable.id)
            changes = mergeChangesets(changes, varChanges)
            removedVariableIds.push(variable.id)
        }
    }

    engine.removeClaim(claimId)

    return { removedVariableIds, changes }
}
