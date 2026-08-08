import type { TCoreArgumentEvaluationResult } from "@proposit/proposit-core"

/**
 * The two axes a review reports, and the words every client renders them with.
 *
 * They answer different questions and may legitimately disagree: the
 * **conclusion assessment** is about the proposition (is it true, and where did
 * that come from), the **argument assessment** is about the author's work (did
 * it get there). A conclusion can be true while the argument that offered it
 * did nothing.
 *
 * Two rules hold across every string in this module.
 *
 * - **No proof language.** Every finding here is relative to one reader's
 *   assignment and may rest on steps they granted for inductive reasons, so
 *   "proved" would overclaim in two directions at once. Reaching a conclusion
 *   is the strongest thing said.
 * - **Nothing implies a granted inductive step establishes less than an
 *   entailment does.** Acceptance reasons are a record of why, not a modifier
 *   on force.
 *
 * The strings live here rather than in each client so the web app, the mobile
 * app and anything later render one vocabulary.
 */

/** The conclusion's truth value under the reader's assignment. */
export type TConclusionValue = "true" | "false" | "unknown"

export const CONCLUSION_VALUE_LABELS: Record<TConclusionValue, string> = {
    true: "True",
    false: "False",
    unknown: "Unknown",
}

/**
 * Attribution is two independent facts, rendered as two independent
 * statements. Fusing them into one label denies a good argument all credit
 * exactly when its reader happened to agree with it.
 */
export const CONCLUSION_ASSERTED_STATEMENT = "You assigned this."
export const CONCLUSION_REACHED_STATEMENT =
    "The argument reaches it on its own."
export const CONCLUSION_ONLY_ASSERTED_STATEMENT =
    "It holds only because you assigned it."

export interface TConclusionAssessment {
    value: TConclusionValue
    label: string
    /** The reader supplied `true` or `false`. An explicit unknown is a decision, not an assertion. */
    assertedByReader: boolean
    /** The value still holds once the reader's own assertion is withheld and closure is recomputed. */
    reachedWithoutAssertion: boolean
    /** Zero, one or two statements. Render them as separate sentences. */
    statements: string[]
}

/** The primary finding about the author's work. */
export type TArgumentOutcome =
    | "reaches-conclusion"
    | "does-not-reach"
    | "premises-contradict"

export const ARGUMENT_OUTCOME_LABELS: Record<TArgumentOutcome, string> = {
    "reaches-conclusion": "Reaches its conclusion",
    "does-not-reach": "Doesn't reach its conclusion",
    "premises-contradict": "Its premises contradict each other",
}

/** Why an argument didn't reach its conclusion. Shown with the negative outcome only. */
export type TArgumentReason =
    | "conclusion-came-from-you"
    | "reasoning-rejected"
    | "not-enough-settled"
    | "premises-hold-conclusion-does-not-follow"

export const ARGUMENT_REASON_TEXT: Record<TArgumentReason, string> = {
    "conclusion-came-from-you": "the conclusion came from you",
    "reasoning-rejected": "you rejected part of its reasoning",
    "not-enough-settled": "not enough was settled",
    "premises-hold-conclusion-does-not-follow":
        "its premises hold and its conclusion doesn't follow",
}

/**
 * Struck premises are their own badge, never a member of {@link TArgumentOutcome}.
 * That is what lets "Reaches its conclusion" and "1 premise rejected" appear
 * together, which is the honest reading of an argument that survived a refusal.
 *
 * A restriction premise is *declined*, never denied or refuted: declining
 * grants nothing and asserts nothing, which is precisely why assignments that
 * violate a declined constraint stay admissible.
 */
export interface TStruckBadges {
    struckPremiseIds: string[]
    rejectedPremiseCount: number
    declinedConstraintCount: number
    /** One badge per non-zero count, rejections first. Empty when nothing was struck. */
    labels: string[]
}

export interface TArgumentAssessment {
    outcome: TArgumentOutcome
    label: string
    reason?: TArgumentReason
    reasonText?: string
    struck: TStruckBadges
}

export interface TReviewAssessment {
    conclusion: TConclusionAssessment
    argument: TArgumentAssessment
}

function pluralize(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`
}

function buildStruckBadges(
    evaluation: TCoreArgumentEvaluationResult
): TStruckBadges {
    const struckPremiseIds = evaluation.struckPremiseIds ?? []
    const constraintIds = new Set(
        (evaluation.constraintPremises ?? []).map((p) => p.premiseId)
    )
    const declinedConstraintCount = struckPremiseIds.filter((id) =>
        constraintIds.has(id)
    ).length
    const rejectedPremiseCount =
        struckPremiseIds.length - declinedConstraintCount
    const labels: string[] = []
    if (rejectedPremiseCount > 0) {
        labels.push(
            `${pluralize(rejectedPremiseCount, "premise", "premises")} rejected`
        )
    }
    if (declinedConstraintCount > 0) {
        labels.push(
            `${pluralize(declinedConstraintCount, "constraint", "constraints")} declined`
        )
    }
    return {
        struckPremiseIds,
        rejectedPremiseCount,
        declinedConstraintCount,
        labels,
    }
}

function conclusionValueOf(
    evaluation: TCoreArgumentEvaluationResult
): TConclusionValue {
    if (evaluation.conclusionTrue === true) return "true"
    if (evaluation.conclusionTrue === false) return "false"
    return "unknown"
}

function composeConclusion(
    evaluation: TCoreArgumentEvaluationResult
): TConclusionAssessment {
    const value = conclusionValueOf(evaluation)
    const assertedByReader =
        evaluation.conclusionAttribution?.assertedByReader ?? false
    const reachedWithoutAssertion =
        evaluation.conclusionAttribution?.reachedWithoutAssertion ?? false
    const statements: string[] = []
    if (assertedByReader) statements.push(CONCLUSION_ASSERTED_STATEMENT)
    if (reachedWithoutAssertion) {
        statements.push(CONCLUSION_REACHED_STATEMENT)
    } else if (assertedByReader) {
        statements.push(CONCLUSION_ONLY_ASSERTED_STATEMENT)
    }
    return {
        value,
        label: CONCLUSION_VALUE_LABELS[value],
        assertedByReader,
        reachedWithoutAssertion,
        statements,
    }
}

function reasonFor(
    evaluation: TCoreArgumentEvaluationResult,
    struck: TStruckBadges
): TArgumentReason {
    // First match wins. The structural finding leads the attribution one
    // because it tells the reader something they could not have seen: their own
    // values satisfy every surviving premise and the conclusion still comes out
    // false. Both facts stay on the result, so a client that wants the other
    // reading can take it.
    if (evaluation.premisesHoldConclusionFalse === true) {
        return "premises-hold-conclusion-does-not-follow"
    }
    if (evaluation.conclusionAttribution?.assertedByReader === true) {
        return "conclusion-came-from-you"
    }
    if (struck.struckPremiseIds.length > 0) return "reasoning-rejected"
    return "not-enough-settled"
}

function composeArgument(
    evaluation: TCoreArgumentEvaluationResult
): TArgumentAssessment {
    const struck = buildStruckBadges(evaluation)
    const withReason = (reason: TArgumentReason): TArgumentAssessment => ({
        outcome: "does-not-reach",
        label: ARGUMENT_OUTCOME_LABELS["does-not-reach"],
        reason,
        reasonText: ARGUMENT_REASON_TEXT[reason],
        struck,
    })

    if (evaluation.premiseSetSatisfiable === false) {
        return {
            outcome: "premises-contradict",
            label: ARGUMENT_OUTCOME_LABELS["premises-contradict"],
            struck,
        }
    }
    // A conjunction over an empty set is true, so striking every supporting
    // premise satisfies `survivingSupportingPremisesTrue` vacuously. Nothing
    // remains to reach anything through, so state that explicitly rather than
    // letting the vacuous truth reach a positive reading.
    if (
        evaluation.survivingSupportingPremiseCount === 0 &&
        struck.struckPremiseIds.length > 0
    ) {
        return withReason("reasoning-rejected")
    }
    if (evaluation.conclusionAttribution?.reachedWithoutAssertion === true) {
        return {
            outcome: "reaches-conclusion",
            label: ARGUMENT_OUTCOME_LABELS["reaches-conclusion"],
            struck,
        }
    }
    return withReason(reasonFor(evaluation, struck))
}

/**
 * Compose the two axes from the orthogonal facts an evaluation emits.
 *
 * Returns `undefined` when the evaluation did not complete — there is nothing
 * to say about an argument that failed structural validation, and a blocked or
 * in-progress review has no assessment either. Callers already handle the
 * absent case.
 */
export function composeAssessment(
    evaluation: TCoreArgumentEvaluationResult | undefined
): TReviewAssessment | undefined {
    if (!evaluation?.ok) return undefined
    return {
        conclusion: composeConclusion(evaluation),
        argument: composeArgument(evaluation),
    }
}

/**
 * One line for the argument axis: the outcome, its reason when there is one,
 * and any struck badges. The two axes are never joined into a single line.
 */
export function argumentAssessmentLine(argument: TArgumentAssessment): string {
    const head = argument.reasonText
        ? `${argument.label} — ${argument.reasonText}`
        : argument.label
    return [head, ...argument.struck.labels].join(" · ")
}

/**
 * One line for the conclusion axis: the value, then the attribution statements
 * as separate sentences after it.
 */
export function conclusionAssessmentLine(
    conclusion: TConclusionAssessment
): string {
    return [`Conclusion: ${conclusion.label}`, ...conclusion.statements].join(
        " "
    )
}
