import {
    evaluateArgument,
    checkArgumentValidity,
    canonicalizeOperatorAssignments,
    type TArgumentEvaluationContext,
    type TCoreArgumentEvaluationResult,
    type TCoreExpressionAssignment,
    type TCoreValidityCheckResult,
    type TCoreTrivalentValue,
    type TCoreVariableAssignment,
    type TCoreOperatorAssignment,
} from "@proposit/proposit-core"
import type { ProjectEngine } from "../mutations/types.js"
import type { TReviewDraft } from "../../schemas/review.js"

/** Build a read-only TArgumentEvaluationContext from a ProjectEngine. */
export function toEvaluationContext(
    argEngine: ProjectEngine
): TArgumentEvaluationContext {
    return {
        argumentId: argEngine.getArgument().id,
        getConclusionPremise: () => argEngine.getConclusionPremise(),
        listSupportingPremises: () => argEngine.listSupportingPremises(),
        listPremises: () => argEngine.listPremises(),
        conclusionPremiseId: argEngine.getConclusionPremise()?.getId(),
        getVariable: (id) => argEngine.getVariable(id),
        getPremise: (id) => argEngine.getPremise(id),
        validateEvaluability: () => argEngine.validateEvaluability(),
    }
}

/**
 * Build a per-expression core assignment from the draft's mixed-scope entries.
 *
 * Delegates operator fan-out to proposit-core's `canonicalizeOperatorAssignments`
 * (available in 0.9.0+): premise-scope entries expand to every non-NOT operator
 * expression in the premise; expression-scope overrides layer on top.
 */
export function buildExpressionAssignment(
    draft: TReviewDraft,
    argEngine: ProjectEngine
): TCoreExpressionAssignment {
    const variables: Record<string, TCoreTrivalentValue> = {}
    for (const v of argEngine.getVariables()) {
        const claimId = "claimId" in v ? v.claimId : undefined
        const c = claimId ? draft.claimAssignments[claimId] : undefined
        variables[v.id] = c ? (c.skipped ? null : c.value) : null
    }

    const premiseScope: Record<string, TCoreOperatorAssignment> = {}
    const expressionOverrides: Record<string, TCoreOperatorAssignment> = {}
    for (const op of draft.operatorAssignments) {
        if (op.scope === "premise") {
            premiseScope[op.premiseId] = op.decision
        } else if (op.scope === "expression" && op.expressionId) {
            expressionOverrides[op.expressionId] = op.decision
        }
    }

    const operatorAssignments = canonicalizeOperatorAssignments(
        toEvaluationContext(argEngine),
        { premiseScope, expressionOverrides }
    )
    return { variables, operatorAssignments }
}

export function evaluateArgumentForReview(
    draft: TReviewDraft,
    argEngine: ProjectEngine
): TCoreArgumentEvaluationResult {
    const ctx = toEvaluationContext(argEngine)
    const assignment = buildExpressionAssignment(draft, argEngine)
    // `strictUnknownAssignmentKeys: false` because we pass an argument-wide
    // assignment; per-premise strictness would reject every premise that doesn't
    // reference every claim-bound variable in the argument.
    const result = evaluateArgument(ctx, assignment, {
        validateFirst: true,
        strictUnknownAssignmentKeys: false,
        includeDiagnostics: true,
        includeExpressionValues: true,
    })
    // Diagnostic dump for proposit-core debugging: full argument shape +
    // assignment + evaluation result as a single JSON payload.
    try {
        console.log(
            "[review:evaluation]",
            JSON.stringify(
                buildEvaluationDebugPayload(
                    draft,
                    argEngine,
                    assignment,
                    result
                ),
                null,
                2
            )
        )
    } catch (err) {
        console.warn("[review:evaluation] dump failed:", err)
    }
    return result
}

function buildEvaluationDebugPayload(
    draft: TReviewDraft,
    argEngine: ProjectEngine,
    assignment: TCoreExpressionAssignment,
    result: TCoreArgumentEvaluationResult
): Record<string, unknown> {
    const variables = argEngine.getVariables().map((v) => ({
        id: v.id,
        symbol: v.symbol,
        claimId: "claimId" in v ? v.claimId : undefined,
        boundPremiseId: "boundPremiseId" in v ? v.boundPremiseId : undefined,
    }))
    const premises = argEngine.listPremises().map((p) => {
        const id = p.getId()
        const expressions = p.getExpressions().map((e) => ({
            id: e.id,
            type: e.type,
            operator: "operator" in e ? e.operator : undefined,
            variableId: "variableId" in e ? e.variableId : undefined,
            parentId: e.parentId,
            position: e.position,
        }))
        return {
            id,
            role:
                argEngine.getConclusionPremise()?.getId() === id
                    ? "conclusion"
                    : "supporting",
            rootExpressionId: p.getRootExpressionId(),
            expressions,
        }
    })
    return {
        argumentId: argEngine.getArgument().id,
        argumentVersion: argEngine.getArgument().version,
        variables,
        premises,
        draft: {
            claimAssignments: draft.claimAssignments,
            operatorAssignments: draft.operatorAssignments,
        },
        canonicalAssignment: assignment,
        result,
    }
}

export function checkValidityForReview(
    argEngine: ProjectEngine,
    options: { maxVariables?: number; maxAssignmentsChecked?: number } = {}
): TCoreValidityCheckResult {
    return checkArgumentValidity(toEvaluationContext(argEngine), {
        mode: "exhaustive",
        maxVariables: options.maxVariables ?? 16,
        maxAssignmentsChecked: options.maxAssignmentsChecked ?? 10_000,
        includeCounterexampleEvaluations: true,
        validateFirst: true,
    })
}

/**
 * Argument-wide propagated values from `evaluateArgument` with `includeDiagnostics: true`.
 * The core populates `propagatedVariableValues` (0.9.0+); callers should already have it
 * on the result. Returns `{}` when a result isn't available.
 *
 * Key set = `referencedVariableIds` (claim-bound and externally-bound premise variables).
 */
export function computePropagatedVariableValues(
    result: TCoreArgumentEvaluationResult | undefined
): TCoreVariableAssignment {
    return result?.propagatedVariableValues ?? {}
}
