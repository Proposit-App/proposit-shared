import {
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

/**
 * Returns true iff `pe` is a derivation-typed premise whose expression tree
 * is in naked-Q form (root is a single variable expression).
 *
 * Mirrors `@proposit/proposit-core`'s internal `isNakedQDerivationPremise`
 * (in `src/lib/grammar/naked-q.ts`) — which the core uses to filter naked-Q
 * scaffold premises out of `ArgumentEngine.asEvaluationContext()`'s premise
 * listings. Core does not re-export the predicate from its public surface,
 * so we re-implement it here against the public PremiseEngine API
 * (`toPremiseData`, `getExpressions`, `getRootExpression`).
 *
 * Used by `toEvaluationContext` so the review path's premise listings mirror
 * the engine's evaluation context. The shared review evaluation path
 * (`evaluateArgumentForReview`, `checkValidityForReview`) routes through
 * `argEngine.evaluate(...)` / `argEngine.checkValidity(...)` directly so the
 * engine's internal axiom-forcing pre-pass + naked-Q filter both fire; this
 * predicate is only used by `canonicalizeOperatorAssignments`'s
 * premise-scope fan-out via `toEvaluationContext`.
 */
function isNakedQDerivationPremise(
    pe: NonNullable<ReturnType<ProjectEngine["getPremise"]>>
): boolean {
    if (pe.toPremiseData().type !== "derivation") return false
    const exprs = pe.getExpressions()
    if (exprs.length !== 1) return false
    const root = pe.getRootExpression()
    if (root === undefined) return false
    return root.type === "variable"
}

/**
 * Build a read-only TArgumentEvaluationContext from a ProjectEngine.
 *
 * Mirrors `ArgumentEngine.asEvaluationContext()` (private in core 1.0+):
 * filters naked-Q derivation premises out of every premise listing so
 * downstream `canonicalizeOperatorAssignments` sees the same view of the
 * argument that the engine's own `evaluate(...)` / `checkValidity(...)`
 * use. Without this filter, premise-scope operator decisions would attempt
 * to fan out across naked-Q premises (a harmless no-op today since naked-Q
 * has no operator expressions, but a correctness drift waiting to bite).
 */
export function toEvaluationContext(
    argEngine: ProjectEngine
): TArgumentEvaluationContext {
    const conclusion = argEngine.getConclusionPremise()
    const filteredConclusion =
        conclusion && isNakedQDerivationPremise(conclusion)
            ? undefined
            : conclusion
    return {
        argumentId: argEngine.getArgument().id,
        getConclusionPremise: () => filteredConclusion,
        listSupportingPremises: () =>
            argEngine
                .listSupportingPremises()
                .filter((pm) => !isNakedQDerivationPremise(pm)),
        listPremises: () =>
            argEngine
                .listPremises()
                .filter((pm) => !isNakedQDerivationPremise(pm)),
        conclusionPremiseId: filteredConclusion?.getId(),
        getVariable: (id) => argEngine.getVariable(id),
        getPremise: (id) => {
            const pe = argEngine.getPremise(id)
            if (pe === undefined) return undefined
            if (isNakedQDerivationPremise(pe)) return undefined
            return pe
        },
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
        // Axiomatic-claim-bound variables MUST NOT appear in the assignment
        // map — `ArgumentEngine.evaluate()` throws
        // `AXIOM_VARIABLE_ASSIGNMENT_FORBIDDEN` on any caller-supplied key
        // for an axiom variable (presence check, not value check). The
        // engine's pre-pass forces them to `true` internally before
        // delegating to the standalone evaluator, so we leave them out and
        // let the safety net populate them.
        if (claimId != null && "claimVersion" in v) {
            const boundClaim = argEngine.getClaim(claimId, v.claimVersion)
            if (boundClaim?.type === "axiomatic") continue
        }
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
    const assignment = buildExpressionAssignment(draft, argEngine)
    // Route through `argEngine.evaluate(...)` rather than the standalone
    // `evaluateArgument(ctx, ...)` so the engine's safety nets fire:
    //   1. Axiomatic-bound variables are forced to `true` before evaluation
    //      (`applyAxiomaticForcedAssignments` in core 1.0+). The user-facing
    //      review wizard never assigns axiomatic claims, so without this
    //      pre-pass the axiom variable enters the evaluator as `null` and
    //      propagates → "Indeterminate" verdict.
    //   2. Naked-Q derivation premises are filtered out of the engine's
    //      internal eval context — so the scaffold premises minted by
    //      `addClaim` for every non-conclusion normal claim don't appear as
    //      supporting premises during evaluation.
    //
    // Pre-fix this path constructed the context manually via
    // `toEvaluationContext` and called the standalone `evaluateArgument`,
    // bypassing both safety nets. See followups-sweep-2026-05 C1 and the
    // investigation report at
    // proposit-server/docs/research/2026-05-16-review-indeterminate-bug.md.
    //
    // `strictUnknownAssignmentKeys: false` because we pass an argument-wide
    // assignment; per-premise strictness would reject every premise that
    // doesn't reference every claim-bound variable in the argument.
    return argEngine.evaluate(assignment, {
        validateFirst: true,
        strictUnknownAssignmentKeys: false,
        includeDiagnostics: true,
        includeExpressionValues: true,
    })
}

export function checkValidityForReview(
    argEngine: ProjectEngine,
    options: { maxVariables?: number; maxAssignmentsChecked?: number } = {}
): TCoreValidityCheckResult {
    // Route through `argEngine.checkValidity(...)` so axiomatic-bound
    // variables are excluded from the free-choice enumeration AND pinned to
    // `true` in every generated assignment (core's
    // `getAxiomaticBoundVariableIds` carve-out). Same C1 safety-net story as
    // `evaluateArgumentForReview` above.
    return argEngine.checkValidity({
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
