// Inherited from proposit-server. Legacy type-alias names (ExprInput,
// ExprInputNoPos) predate the brain-style T-prefix convention; renaming
// cascades through every consumer. Tracked as tech debt for a dedicated
// follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import type { TExpressionUpdate as TCoreExpressionUpdate } from "@proposit/proposit-core"
import type {
    TPropositionalExpressionCombined,
    TPropositionalExpressionTypes,
    TLogicalOperatorType,
} from "../../schemas/logic.js"
import type { ProjectEngine, ProjectChangeset } from "./types.js"

// Local type aliases matching the core expression input shapes.
type ExprInput =
    import("@proposit/proposit-core").TExpressionInput<TPropositionalExpressionCombined>
type ExprInputNoPos =
    import("@proposit/proposit-core").TExpressionWithoutPosition<TPropositionalExpressionCombined>

export type TAddSiblingExpressionData = {
    premiseId: string
    targetExpressionId: string
    direction: "before" | "after"
    siblingId: string
    type: TPropositionalExpressionTypes
    variableId?: string | null
    argumentId: string
    argumentVersion: number
    creatorId: string
    createdOn: Date
}

export type TWrapExpressionData = {
    premiseId: string
    targetExpressionId: string
    direction: "before" | "after"
    operatorId: string
    operatorType: TLogicalOperatorType
    siblingId: string
    siblingType: TPropositionalExpressionTypes
    variableId?: string | null
    argumentId: string
    argumentVersion: number
    creatorId: string
    createdOn: Date
}

export function mutateCreateExpression(
    engine: ProjectEngine,
    data: {
        premiseId: string
        expressionId: string
        parentId: string | null
        position?: number
        type: TPropositionalExpressionTypes
        variableId?: string | null
        operator?: TLogicalOperatorType | null
        relativeTo?: { expressionId: string; direction: "before" | "after" }
        argumentId: string
        argumentVersion: number
        creatorId: string
        createdOn: Date
    }
): {
    created: TPropositionalExpressionCombined
    shifted: TPropositionalExpressionCombined[]
    changes: ProjectChangeset
} {
    const pm = engine.getPremise(data.premiseId)
    if (!pm) {
        throw new Error(`Premise ${data.premiseId} not found`)
    }

    const shared = {
        id: data.expressionId,
        argumentId: data.argumentId,
        argumentVersion: data.argumentVersion,
        premiseId: data.premiseId,
        parentId: data.parentId,
        creatorId: data.creatorId,
        createdOn: data.createdOn,
    }

    // Build a properly narrowed expression input based on type.
    // Each branch satisfies the corresponding member of the
    // TExpressionInput<TPropositionalExpressionCombined> union.
    let narrowedInput: ExprInput
    if (data.type === "variable") {
        narrowedInput = {
            ...shared,
            type: "variable" as const,
            variableId: data.variableId!,
            operator: null,
            position: 0, // placeholder; overwritten by relative/append
        }
    } else if (data.type === "operator") {
        narrowedInput = {
            ...shared,
            type: "operator" as const,
            operator: data.operator!,
            variableId: null,
            position: 0,
        }
    } else {
        narrowedInput = {
            ...shared,
            type: "formula" as const,
            variableId: null,
            operator: null,
            position: 0,
        }
    }

    let result: ReturnType<typeof pm.addExpression>

    if (data.relativeTo) {
        const { expressionId: siblingId, direction } = data.relativeTo
        const { position: _pos, ...noPosInput } = narrowedInput
        result = pm.addExpressionRelative(
            siblingId,
            direction,
            noPosInput as ExprInputNoPos
        )
    } else if (data.position !== undefined) {
        narrowedInput.position = data.position
        result = pm.addExpression(narrowedInput as never)
    } else {
        const { position: _pos, ...noPosInput } = narrowedInput
        result = pm.appendExpression(
            data.parentId,
            noPosInput as ExprInputNoPos
        )
    }

    const created = result.result
    const shifted = (result.changes.expressions?.modified ?? []).filter(
        (e) => e.id !== data.expressionId
    )

    return { created, shifted, changes: result.changes }
}

export function mutateUpdateExpression(
    engine: ProjectEngine,
    expressionId: string,
    updates: {
        position?: number
        variableId?: string | null
        operator?: TLogicalOperatorType | null
    }
): {
    expression: TPropositionalExpressionCombined
    changes: ProjectChangeset
} {
    // Find the premise containing this expression
    for (const premiseId of engine.listPremiseIds()) {
        const pm = engine.getPremise(premiseId)
        if (!pm) continue
        const expr = pm.getExpression(expressionId)
        if (!expr) continue

        const engineUpdates: TCoreExpressionUpdate = {}
        if (updates.position !== undefined) {
            engineUpdates.position = updates.position
        }
        if (updates.variableId !== undefined) {
            engineUpdates.variableId = updates.variableId ?? undefined
        }
        if (updates.operator !== undefined) {
            engineUpdates.operator = updates.operator ?? undefined
        }

        const { result, changes } = pm.updateExpression(
            expressionId,
            engineUpdates
        )
        return {
            expression: result,
            changes,
        }
    }

    throw new Error(`Expression ${expressionId} not found in any premise`)
}

export function mutateDeleteExpression(
    engine: ProjectEngine,
    expressionId: string
): {
    removed: TPropositionalExpressionCombined | undefined
    changes: ProjectChangeset
} {
    // Find the premise containing this expression
    for (const premiseId of engine.listPremiseIds()) {
        const pm = engine.getPremise(premiseId)
        if (!pm) continue
        const expr = pm.getExpression(expressionId)
        if (!expr) continue

        const { result, changes } = pm.removeExpression(expressionId, true)
        return {
            removed: result,
            changes,
        }
    }

    throw new Error(`Expression ${expressionId} not found in any premise`)
}

export function mutateToggleNegation(
    engine: ProjectEngine,
    expressionId: string,
    extraFields: { creatorId: string; createdOn: Date }
): { changes: ProjectChangeset } {
    const pm = engine.findPremiseByExpressionId(expressionId)
    if (!pm) {
        throw new Error(`Expression ${expressionId} not found in any premise`)
    }

    const { changes } = pm.toggleNegation(expressionId, {
        ...extraFields,
        variableId: null,
    } as Partial<TPropositionalExpressionCombined>)

    return { changes }
}

export function mutateChangeOperator(
    engine: ProjectEngine,
    data: {
        expressionId: string
        newOperator: TLogicalOperatorType
        sourceChildId?: string
        targetChildId?: string
        extraFields?: { creatorId: string; createdOn: Date }
    }
): { changes: ProjectChangeset } {
    const pm = engine.findPremiseByExpressionId(data.expressionId)
    if (!pm) {
        throw new Error(
            `Expression ${data.expressionId} not found in any premise`
        )
    }

    const extraFieldsWithNull = data.extraFields
        ? ({
              ...data.extraFields,
              variableId: null,
              operator: null,
          } as Partial<TPropositionalExpressionCombined>)
        : undefined

    const { changes } = pm.changeOperator(
        data.expressionId,
        data.newOperator,
        data.sourceChildId,
        data.targetChildId,
        extraFieldsWithNull
    )

    return { changes }
}

export type TCreateExpressionWithOperatorData = {
    premiseId: string
    targetExpressionId: string
    operatorType: TLogicalOperatorType
    direction: "before" | "after"
    operatorId: string
    siblingId: string
    type: TPropositionalExpressionTypes
    variableId?: string | null
    argumentId: string
    argumentVersion: number
    creatorId: string
    createdOn: Date
}

export function mutateAddSiblingExpression(
    engine: ProjectEngine,
    data: TAddSiblingExpressionData
): {
    created: TPropositionalExpressionCombined[]
    modified: TPropositionalExpressionCombined[]
    changes: ProjectChangeset
} {
    const pm = engine.getPremise(data.premiseId)
    if (!pm) {
        throw new Error(`Premise ${data.premiseId} not found`)
    }

    const shared = {
        id: data.siblingId,
        argumentId: data.argumentId,
        argumentVersion: data.argumentVersion,
        premiseId: data.premiseId,
        parentId: null,
        creatorId: data.creatorId,
        createdOn: data.createdOn,
    }

    const siblingInput: ExprInputNoPos =
        data.type === "variable"
            ? {
                  ...shared,
                  type: "variable" as const,
                  variableId: data.variableId!,
                  operator: null,
              }
            : {
                  ...shared,
                  type: "formula" as const,
                  variableId: null,
                  operator: null,
              }

    const result = pm.addExpressionRelative(
        data.targetExpressionId,
        data.direction,
        siblingInput
    )

    const created = result.changes.expressions?.added ?? []
    const modified = (result.changes.expressions?.modified ?? []).filter(
        (e) => !created.some((c) => c.id === e.id)
    )

    return { created, modified, changes: result.changes }
}

export function mutateWrapExpression(
    engine: ProjectEngine,
    data: TWrapExpressionData
): {
    created: TPropositionalExpressionCombined[]
    modified: TPropositionalExpressionCombined[]
    changes: ProjectChangeset
} {
    const pm = engine.getPremise(data.premiseId)
    if (!pm) {
        throw new Error(`Premise ${data.premiseId} not found`)
    }

    const shared = {
        argumentId: data.argumentId,
        argumentVersion: data.argumentVersion,
        premiseId: data.premiseId,
        parentId: null,
        creatorId: data.creatorId,
        createdOn: data.createdOn,
    }

    const operatorInput: ExprInputNoPos = {
        id: data.operatorId,
        ...shared,
        type: "operator" as const,
        operator: data.operatorType,
        variableId: null,
    }

    const siblingInput: ExprInputNoPos =
        data.siblingType === "variable"
            ? {
                  id: data.siblingId,
                  ...shared,
                  type: "variable" as const,
                  variableId: data.variableId!,
                  operator: null,
              }
            : {
                  id: data.siblingId,
                  ...shared,
                  type: "formula" as const,
                  variableId: null,
                  operator: null,
              }

    const wrapResult = pm.wrapExpression(
        operatorInput,
        siblingInput,
        data.direction === "after" ? data.targetExpressionId : undefined,
        data.direction === "before" ? data.targetExpressionId : undefined
    )

    // Auto-generated expressions (formula buffers inserted by the engine's
    // post-mutation AN pass when running in assistive behavior; see cross-repo
    // spec 2026-05-13-grammar-tiers-design §5) only have core fields. Patch
    // both the engine's internal state AND the changeset copies with the
    // missing application-level fields.
    // pm.getExpression() returns the actual Map-stored object, so
    // Object.assign mutates the engine's internal expression in-place.
    const appFields = {
        creatorId: data.creatorId,
        createdOn: data.createdOn,
        variableId: null,
        operator: null,
    }
    if (wrapResult.changes.expressions?.added) {
        for (const expr of wrapResult.changes.expressions.added) {
            if (!("creatorId" in expr) || expr.creatorId == null) {
                // Patch the engine's internal Map entry
                const internal = pm.getExpression(expr.id)
                if (internal) {
                    Object.assign(internal, appFields)
                }
                // Patch the changeset copy as well
                Object.assign(expr, appFields)
            }
        }
    }

    const created = wrapResult.changes.expressions?.added ?? []
    const modified = (wrapResult.changes.expressions?.modified ?? []).filter(
        (e) => !created.some((c) => c.id === e.id)
    )

    return { created, modified, changes: wrapResult.changes }
}

export function mutateCreateExpressionWithOperator(
    engine: ProjectEngine,
    data: TCreateExpressionWithOperatorData
): {
    created: TPropositionalExpressionCombined[]
    modified: TPropositionalExpressionCombined[]
    changes: ProjectChangeset
} {
    if (data.type === "operator") {
        throw new Error(
            "Cannot create operator type via this endpoint; operator is auto-created"
        )
    }

    const pm = engine.getPremise(data.premiseId)
    if (!pm) {
        throw new Error(`Premise ${data.premiseId} not found`)
    }

    const targetExpr = pm.getExpression(data.targetExpressionId)
    if (!targetExpr) {
        throw new Error(`Expression ${data.targetExpressionId} not found`)
    }

    // Check if parent is a multi-child operator (and/or)
    const parentExpr = targetExpr.parentId
        ? pm.getExpression(targetExpr.parentId)
        : null
    const parentIsMultiChild =
        parentExpr?.type === "operator" &&
        (parentExpr.operator === "and" || parentExpr.operator === "or")

    if (parentIsMultiChild) {
        return mutateAddSiblingExpression(engine, {
            premiseId: data.premiseId,
            targetExpressionId: data.targetExpressionId,
            direction: data.direction,
            siblingId: data.siblingId,
            type: data.type,
            variableId: data.variableId,
            argumentId: data.argumentId,
            argumentVersion: data.argumentVersion,
            creatorId: data.creatorId,
            createdOn: data.createdOn,
        })
    }

    return mutateWrapExpression(engine, {
        premiseId: data.premiseId,
        targetExpressionId: data.targetExpressionId,
        direction: data.direction,
        operatorId: data.operatorId,
        operatorType: data.operatorType,
        siblingId: data.siblingId,
        siblingType: data.type,
        variableId: data.variableId,
        argumentId: data.argumentId,
        argumentVersion: data.argumentVersion,
        creatorId: data.creatorId,
        createdOn: data.createdOn,
    })
}
