import type {
    TClaimReasonCode,
    TClaimTrueReasonCode,
    TClaimFalseReasonCode,
    TClaimUnknownReasonCode,
    TOperatorReasonCode,
    TOperatorAcceptReasonCode,
    TOperatorRejectReasonCode,
    TTrivalentValue,
} from "../../schemas/review.js"

export interface TReasonEntry<TCode extends string> {
    code: TCode
    label: string
    description: string
}

export const CLAIM_TRUE_REASONS: readonly TReasonEntry<TClaimTrueReasonCode>[] =
    [
        {
            code: "common-knowledge",
            label: "Common knowledge",
            description:
                "This is widely accepted and doesn't need supporting evidence to be credible.",
        },
        {
            code: "well-supported-by-sources",
            label: "Well-supported by sources",
            description:
                "The cited sources provide solid, direct support for the claim.",
        },
        {
            code: "definitionally-true",
            label: "True by definition",
            description:
                "The claim is a tautology — it's true purely by what the words mean.",
        },
        {
            code: "expert-consensus",
            label: "Expert consensus",
            description: "The relevant experts broadly agree on this.",
        },
        {
            code: "empirically-verified",
            label: "Directly observed",
            description:
                "Has been directly observed or measured in a reliable way.",
        },
        {
            code: "historically-established",
            label: "Historical fact",
            description:
                "A well-established event or state of affairs in the historical record.",
        },
        {
            code: "logically-necessary",
            label: "Logically necessary",
            description:
                "Follows necessarily from other established facts — it couldn't be otherwise.",
        },
    ]

export const CLAIM_FALSE_REASONS: readonly TReasonEntry<TClaimFalseReasonCode>[] =
    [
        {
            code: "factually-incorrect",
            label: "Factually incorrect",
            description: "Contradicted by solid, established evidence.",
        },
        {
            code: "contradicts-expert-consensus",
            label: "Contradicts expert consensus",
            description:
                "Conflicts with what the relevant experts broadly agree on.",
        },
        {
            code: "hyperbole",
            label: "Hyperbole",
            description:
                "Exaggerated for effect — not literally true as stated.",
        },
        {
            code: "proven-false-elsewhere",
            label: "Proven false elsewhere",
            description: "Refuted by credible prior work or analysis.",
        },
        {
            code: "logical-contradiction",
            label: "Logical contradiction",
            description:
                "The claim contradicts itself — it can't be true under any interpretation.",
        },
        {
            code: "strawman",
            label: "Strawman",
            description:
                "Misrepresents the actual position it's attributed to.",
        },
        {
            code: "equivocation",
            label: "Equivocation",
            description:
                "Uses a key term with shifting meanings across the claim.",
        },
        {
            code: "category-error",
            label: "Category error",
            description: "Applies a concept to the wrong kind of thing.",
        },
    ]

export const CLAIM_UNKNOWN_REASONS: readonly TReasonEntry<TClaimUnknownReasonCode>[] =
    [
        {
            code: "insufficient-evidence",
            label: "Insufficient evidence",
            description:
                "Not enough evidence exists to decide one way or the other.",
        },
        {
            code: "unknowable",
            label: "Unknowable",
            description:
                "Not decidable in principle — no procedure could settle it.",
        },
        {
            code: "speculation",
            label: "Speculation",
            description: "Plausible but untested — no reliable evidence yet.",
        },
        {
            code: "matter-of-opinion",
            label: "Matter of opinion",
            description:
                "Normative or subjective — not a factual claim that can be true or false.",
        },
        {
            code: "ambiguous-wording",
            label: "Ambiguous wording",
            description: "Too ambiguous to evaluate as stated.",
        },
        {
            code: "too-vague",
            label: "Too vague",
            description: "Too imprecise to assign a truth value.",
        },
        {
            code: "context-dependent",
            label: "Context-dependent",
            description:
                "True in some contexts, false in others — depends on how you read it.",
        },
        {
            code: "expert-dispute",
            label: "Expert dispute",
            description: "Relevant experts genuinely disagree about this.",
        },
    ]

export const OPERATOR_ACCEPT_REASONS: readonly TReasonEntry<TOperatorAcceptReasonCode>[] =
    [
        {
            code: "entailment-holds",
            label: "Logically entailed",
            description:
                "One side really does entail the other — the inference is valid.",
        },
        {
            code: "sound-causal-mechanism",
            label: "Sound causal mechanism",
            description: "A plausible causal mechanism links them.",
        },
        {
            code: "strong-inductive-support",
            label: "Strong inductive support",
            description:
                "Strong inductive or statistical evidence backs the link.",
        },
        {
            code: "true-by-definition",
            label: "True by definition",
            description: "The terms on each side are definitionally linked.",
        },
        {
            code: "well-established-inference",
            label: "Well-established inference",
            description:
                "A commonly accepted inference pattern in the relevant field.",
        },
    ]

export const OPERATOR_REJECT_REASONS: readonly TReasonEntry<TOperatorRejectReasonCode>[] =
    [
        {
            code: "non-sequitur",
            label: "Non sequitur",
            description: "The conclusion doesn't follow from what preceded it.",
        },
        {
            code: "correlation-not-causation",
            label: "Correlation, not causation",
            description: "The link is correlational, not causal.",
        },
        {
            code: "hasty-generalization",
            label: "Hasty generalization",
            description:
                "The inductive leap from examples to rule is too large.",
        },
        {
            code: "counterexamples-exist",
            label: "Counterexamples exist",
            description: "Known counterexamples refute the link.",
        },
        {
            code: "false-dichotomy",
            label: "False dichotomy",
            description:
                "Presents alternatives as exhaustive when they aren't.",
        },
        {
            code: "equivocation-across-link",
            label: "Equivocation across the link",
            description: "A key term shifts meaning across the relation.",
        },
        {
            code: "circular-inference",
            label: "Circular inference",
            description:
                "The relation presupposes the conclusion it claims to establish.",
        },
    ]

export function getClaimReasonsForValue(
    v: TTrivalentValue
): readonly TReasonEntry<TClaimReasonCode>[] {
    if (v === true) return CLAIM_TRUE_REASONS
    if (v === false) return CLAIM_FALSE_REASONS
    return CLAIM_UNKNOWN_REASONS
}

// Reverse of getClaimReasonsForValue: the trivalent stance a claim reason
// expresses (true-bucket → true, false-bucket → false, otherwise null).
// An unrecognized code resolves to null, mirroring how getClaimReasonsForValue
// treats the null/unknown stance as the catch-all bucket.
export function getStanceForClaimReason(
    code: TClaimReasonCode
): TTrivalentValue {
    if (CLAIM_TRUE_REASONS.some((r) => r.code === code)) return true
    if (CLAIM_FALSE_REASONS.some((r) => r.code === code)) return false
    return null
}

export function getOperatorReasonsForDecision(
    d: "accepted" | "rejected"
): readonly TReasonEntry<TOperatorReasonCode>[] {
    return d === "accepted" ? OPERATOR_ACCEPT_REASONS : OPERATOR_REJECT_REASONS
}

export function findReasonByCode(
    code: TClaimReasonCode | TOperatorReasonCode
): TReasonEntry<string> | undefined {
    const buckets = [
        CLAIM_TRUE_REASONS,
        CLAIM_FALSE_REASONS,
        CLAIM_UNKNOWN_REASONS,
        OPERATOR_ACCEPT_REASONS,
        OPERATOR_REJECT_REASONS,
    ] as const
    for (const b of buckets) {
        const hit = b.find((r) => r.code === code)
        if (hit) return hit
    }
    return undefined
}
