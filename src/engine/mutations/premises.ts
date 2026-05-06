import type {
    TPremiseRoleType,
    TPropositionalPremise,
} from "../../schemas/logic.js"
import type { ProjectEngine, ProjectChangeset } from "./types.js"
import { mergeChangesets } from "./types.js"

export function mutateCreatePremise(
    engine: ProjectEngine,
    premiseId: string,
    data: {
        argumentId: string
        argumentVersion: number
        creatorId: string
        createdOn: Date
        title: string | null
        role: TPremiseRoleType
    }
): { premise: TPropositionalPremise; changes: ProjectChangeset } {
    if (data.role === "conclusion" && engine.getConclusionPremise()) {
        throw new Error(
            "A conclusion premise already exists for this argument version"
        )
    }

    const { result: pm, changes } = engine.createPremiseWithId(premiseId, {
        type: "freeform",
        extras: data,
    })

    let allChanges = changes
    if (data.role === "conclusion") {
        // Ensure this premise is marked as conclusion (createPremiseWithId
        // auto-sets the first premise as conclusion, but call explicitly
        // for clarity and to handle edge cases).
        const { changes: roleChanges } = engine.setConclusionPremise(premiseId)
        allChanges = mergeChangesets(changes, roleChanges)
    } else if (engine.getConclusionPremise()?.getId() === premiseId) {
        // proposit-core 0.8.0+ auto-sets the first premise as conclusion
        // regardless of the requested role. Undo the auto-assignment when
        // the caller requested "supporting".
        const { changes: clearChanges } = engine.clearConclusionPremise()
        allChanges = mergeChangesets(changes, clearChanges)
    }

    return {
        premise: pm.toPremiseData(),
        changes: allChanges,
    }
}

export function mutateUpdatePremiseRole(
    engine: ProjectEngine,
    premiseId: string,
    newRole: TPremiseRoleType
): { changes: ProjectChangeset } {
    if (newRole === "conclusion") {
        const { changes } = engine.setConclusionPremise(premiseId)
        return { changes }
    }

    const currentConclusion = engine.getConclusionPremise()
    if (currentConclusion?.getId() === premiseId) {
        const { changes } = engine.clearConclusionPremise()
        return { changes }
    }

    return { changes: {} }
}

export function mutateUpdatePremiseExtras(
    engine: ProjectEngine,
    premiseId: string,
    updates: Record<string, unknown>
): { premise: TPropositionalPremise; changes: ProjectChangeset } {
    const pm = engine.getPremise(premiseId)
    if (!pm) {
        throw new Error(`Premise ${premiseId} not found`)
    }
    const { changes } = pm.updateExtras(updates)
    return { premise: pm.toPremiseData(), changes }
}

export function mutateDeletePremise(
    engine: ProjectEngine,
    premiseId: string
): { removed: boolean; changes: ProjectChangeset } {
    const { result, changes } = engine.removePremise(premiseId)
    return { removed: result !== undefined, changes }
}
