import type { TPropositionalVariable } from "../../schemas/logic.js"
import type { ProjectEngine, ProjectChangeset } from "./types.js"

export function mutateCreateVariable(
    engine: ProjectEngine,
    variableId: string,
    data: {
        argumentId: string
        argumentVersion: number
        creatorId: string
        createdOn: Date
        claimId: string
        claimVersion: number
        symbol: string
    }
): { variable: TPropositionalVariable; changes: ProjectChangeset } {
    const { result, changes } = engine.addVariable({
        id: variableId,
        ...data,
    } as never)

    return { variable: result, changes }
}

export function mutateUpdateVariable(
    engine: ProjectEngine,
    variableId: string,
    updates: { symbol?: string; claimId?: string; claimVersion?: number }
): { variable: TPropositionalVariable | undefined; changes: ProjectChangeset } {
    const { result, changes } = engine.updateVariable(variableId, updates)
    return { variable: result, changes }
}

export function mutateDeleteVariable(
    engine: ProjectEngine,
    variableId: string
): { removed: boolean; changes: ProjectChangeset } {
    const { result, changes } = engine.removeVariable(variableId)
    return { removed: result !== undefined, changes }
}
