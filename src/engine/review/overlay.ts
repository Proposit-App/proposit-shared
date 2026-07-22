import {
    gradeEvaluation,
    type TCoreOperatorAssignment,
    type TCoreTrivalentValue,
    type TCoreVariableAssignment,
} from "@proposit/proposit-core"
import type { PropositArgumentEngine } from "../engine.js"
import type {
    TAssignmentPill,
    TAssignmentProvenance,
    TConclusionVerdict,
    TReviewOverlay,
} from "../review/types.js"
import type {
    TReviewDraft,
    TReviewResult,
    TTrivalentValue,
} from "../../schemas/review.js"
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

/** Maps a trivalent value (a reaction stance or a usage-based default) to a pill. */
function pillForTrivalent(value: boolean | null): TAssignmentPill {
    if (value === true) return "true"
    if (value === false) return "false"
    return "unknown"
}

/** Inverse of {@link pillForTrivalent} for feeding an effective pill to `evaluate()`. */
function trivalentForPill(pill: TAssignmentPill): TCoreTrivalentValue {
    if (pill === "true") return true
    if (pill === "false") return false
    return null // "unknown" and "skipped" both evaluate as unknown
}

export function verdictOf(
    result: TReviewResult | undefined
): TConclusionVerdict | undefined {
    if (!result) return undefined
    const e = result.evaluation
    if (e.isCounterexample === true) return "Logically Invalid"
    if (e.conclusionTrue === false) return "Failing"
    // Soundness requires the supporting premises to be true. Unknown or absent
    // is not true, so neither verdict below can be awarded on it.
    if (e.allSupportingPremisesTrue !== true) return "Indeterminate"
    const vacuous =
        e.conclusion?.inferenceDiagnostic?.kind === "implies" &&
        e.conclusion.inferenceDiagnostic.isVacuouslyTrue === true
    if (vacuous && e.conclusionTrue === true) return "Vacuous"
    if (e.conclusionTrue === true) return "Valid and Sound"
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
 * Resolve the inline argument-text-view review overlay from three layered
 * sources, without any wizard draft. For each claim the effective assignment is
 *
 *     effective  = override ?? reaction ?? default
 *     provenance = (override present || reaction present) ? "user" : "default"
 *
 * where `default` is core's usage-based `deriveDefaultAssignment()` (translated
 * to claim keys), `reaction` is the reviewer's own claim stance
 * (`true`/`false`/`null` → `"true"`/`"false"`/`"unknown"`; a reaction never
 * yields `"skipped"`), and `override` is an in-review pill (which may be
 * `"skipped"`).
 *
 * The merged assignment is fed to `evaluate()` with every operator accepted so
 * transitive grounding (`unknown → true`) propagates; the overlay carries the
 * claim-keyed propagated values and the argument grade the chip renders.
 *
 * Axiom-bound keys are stripped from the assignment (`evaluate()` throws
 * `AXIOM_VARIABLE_ASSIGNMENT_FORBIDDEN` on any axiom key — the engine forces
 * them true internally); citation-bound keys are kept (free, default-true,
 * overridable).
 *
 * ONE-WAY WRITE INVARIANT (consumers MUST enforce): this merge is read-only.
 * Setting an override in review never writes a reaction, and reacting never
 * writes an override. Keep the two stores independent; this function only reads
 * them. `reactions` uses key-presence to mean "reacted" — a present `null` is an
 * "unsure" reaction, not the absence of one.
 *
 * The overlay is keyed strictly by the engine's claims (`getClaims()`); any
 * `reactions`/`overrides` entry for a `claimId` the engine doesn't hold is
 * silently ignored.
 */
export function buildInlineReviewOverlay(params: {
    argEngine: PropositArgumentEngine
    reactions: Record<string, TTrivalentValue>
    overrides: Record<string, TAssignmentPill>
}): TReviewOverlay {
    const { argEngine, reactions, overrides } = params

    // One pass over the variables: hoist claimId → canonical variableId
    // (first-wins, matching core's `getVariableIdForClaim`) so we never re-run
    // that O(N) scan per claim on a per-render call.
    const variableIdByClaimId = new Map<string, string>()
    for (const v of argEngine.getVariables()) {
        const claimId = "claimId" in v ? v.claimId : undefined
        if (claimId != null && !variableIdByClaimId.has(claimId)) {
            variableIdByClaimId.set(claimId, v.id)
        }
    }

    const defaults = argEngine.deriveDefaultAssignment() // variable-keyed
    const claims = argEngine.getClaims() // claimId → TClaim

    const claimValues: Record<string, TAssignmentPill> = {}
    const claimProvenance: Record<string, TAssignmentProvenance> = {}

    for (const claimId of Object.keys(claims)) {
        const hasOverride = claimId in overrides
        const hasReaction = claimId in reactions
        if (hasOverride) {
            claimValues[claimId] = overrides[claimId]
        } else if (hasReaction) {
            claimValues[claimId] = pillForTrivalent(reactions[claimId])
        } else {
            const variableId = variableIdByClaimId.get(claimId)
            const defaultValue =
                variableId != null ? (defaults[variableId] ?? null) : null
            claimValues[claimId] = pillForTrivalent(defaultValue)
        }
        claimProvenance[claimId] =
            hasOverride || hasReaction ? "user" : "default"
    }

    // Effective variable assignment for evaluation. Mirror
    // `buildExpressionAssignment`: set every claim-bound non-axiom variable from
    // its claim's effective pill and leave premise-bound variables unknown.
    // Strip axiom-bound keys using the engine's version-pinned claim library
    // (`getClaim(claimId, claimVersion)`) — the exact source `evaluate()`
    // enforces `AXIOM_VARIABLE_ASSIGNMENT_FORBIDDEN` from. `getClaims()` is
    // claimId-only, so on claim-version skew it could miss an axiom and let the
    // key through, making `evaluate()` throw on every render.
    const variables: Record<string, TCoreTrivalentValue> = {}
    for (const v of argEngine.getVariables()) {
        const claimId = "claimId" in v ? v.claimId : undefined
        if (claimId != null && "claimVersion" in v) {
            const boundClaim = argEngine.getClaim(claimId, v.claimVersion)
            if (boundClaim?.type === "axiomatic") continue
        }
        variables[v.id] =
            claimId != null
                ? trivalentForPill(claimValues[claimId] ?? "unknown")
                : null
    }

    // Every *inference* accepted, so transitive grounding lights up: a claim
    // grounded by citations propagates truth to what it supports.
    //
    // Deliberately NOT every operator. Core reads an accepted `and` as an
    // assertion that the conjunction holds and force-sets each unknown conjunct
    // to true, so blanket acceptance on `(A ∧ B) → Q` manufactures true for A,
    // B and then Q out of an assignment nobody has touched — an argument whose
    // claims are all unknown would grade sound on its own scaffolding. Only
    // `implies`/`iff` express an inference the overlay is entitled to assume;
    // `and`/`or` still resolve normally under Kleene logic, so a conjunction of
    // genuinely-grounded conjuncts still drives the accepted implication.
    const operatorAssignments: Record<string, TCoreOperatorAssignment> = {}
    for (const premise of argEngine.listPremises()) {
        for (const expr of premise.getDecidableOperatorExpressions()) {
            if (expr.operator === "implies" || expr.operator === "iff") {
                operatorAssignments[expr.id] = "accepted"
            }
        }
    }

    const result = argEngine.evaluate(
        { variables, operatorAssignments },
        {
            validateFirst: true,
            strictUnknownAssignmentKeys: false,
            includeDiagnostics: true,
            includeExpressionValues: true,
        }
    )

    const propagatedValues: TCoreVariableAssignment =
        computePropagatedVariableValues(result)
    const claimPropagatedValues: Record<string, TCoreTrivalentValue> = {}
    for (const claimId of Object.keys(claims)) {
        // A claim bound to multiple variables renders its first-bound
        // variable's propagated value (first-wins, matching core's
        // `getVariableIdForClaim`).
        const variableId = variableIdByClaimId.get(claimId)
        claimPropagatedValues[claimId] =
            variableId != null && variableId in propagatedValues
                ? propagatedValues[variableId]
                : trivalentForPill(claimValues[claimId] ?? "unknown")
    }

    return {
        claimValues,
        propagatedValues,
        operatorDecisions: operatorAssignments,
        claimProvenance,
        claimPropagatedValues,
        grade: gradeEvaluation(result).grade,
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
