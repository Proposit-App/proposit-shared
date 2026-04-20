import type { PropositArgumentEngine } from "../engine.js"
import type {
    TAssignmentPill,
    TConclusionVerdict,
    TReviewOverlay,
} from "../review/types.js"
import type { TReviewDraft, TReviewResult } from "../../schemas/review.js"
import { computePropagatedVariableValues } from "./evaluation.js"
import { materialFingerprint } from "./fingerprint.js"

function pillForAssignment(
    value: boolean | null,
    skipped: boolean
): TAssignmentPill {
    if (skipped) return "skipped"
    if (value === true) return "true"
    if (value === false) return "false"
    return "unknown"
}

export function verdictOf(
    result: TReviewResult | undefined
): TConclusionVerdict | undefined {
    if (!result) return undefined
    const e = result.evaluation
    if (e.isCounterexample === true) return "Logically Invalid"
    const vacuous =
        e.conclusion?.inferenceDiagnostic?.kind === "implies" &&
        e.conclusion.inferenceDiagnostic.isVacuouslyTrue === true
    if (vacuous && e.conclusionTrue === true) return "Vacuous"
    if (e.conclusionTrue === true) return "Valid and Sound"
    if (e.conclusionTrue === false) return "Failing"
    return "Indeterminate"
}

/**
 * Build a review overlay suitable for `createArgumentGraph({ reviewOverlay })`.
 * Returns undefined when there's nothing to paint (no draft + no result).
 */
export function buildReviewOverlay(params: {
    draft: TReviewDraft | undefined
    result: TReviewResult | undefined
    argEngine: PropositArgumentEngine
}): TReviewOverlay | undefined {
    const { draft, result, argEngine } = params
    if (!draft && !result) return undefined

    const claimValues: Record<string, TAssignmentPill> = {}
    if (draft) {
        for (const a of Object.values(draft.claimAssignments)) {
            claimValues[a.claimId] = pillForAssignment(a.value, a.skipped)
        }
    }

    const propagatedValues: Record<string, boolean | null> = result
        ? { ...computePropagatedVariableValues(result.evaluation) }
        : {}

    const operatorDecisions: Record<string, "accepted" | "rejected"> = {}
    if (draft) {
        // Fan out premise-scope decisions via the engine's decidable operator expressions,
        // then layer expression-scope overrides on top — matches evaluation's canonicalize.
        for (const op of draft.operatorAssignments) {
            if (op.scope !== "premise") continue
            const p = argEngine.getPremise(op.premiseId)
            if (!p) continue
            for (const e of p.getDecidableOperatorExpressions()) {
                operatorDecisions[e.id] = op.decision
            }
        }
        for (const op of draft.operatorAssignments) {
            if (op.scope === "expression" && op.expressionId) {
                operatorDecisions[op.expressionId] = op.decision
            }
        }
    }

    return {
        claimValues,
        propagatedValues,
        operatorDecisions,
        conclusionVerdict: verdictOf(result),
    }
}

/**
 * True when the current draft's material fingerprint differs from the stored result's.
 * Used to render the stale-results banner.
 */
export function isResultStale(
    draft: TReviewDraft | undefined,
    result: TReviewResult | undefined
): boolean {
    if (!draft || !result) return false
    return materialFingerprint(draft) !== result.evaluatedFingerprint
}
