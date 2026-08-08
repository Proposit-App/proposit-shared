import {
    argumentAssessmentLine,
    conclusionAssessmentLine,
    type TArgumentOutcome,
    type TReviewAssessment,
} from "../engine/review/assessment.js"

const SYMBOLS: Record<TArgumentOutcome, string> = {
    "reaches-conclusion": "✓",
    "does-not-reach": "✗",
    "premises-contradict": "⚠",
}

const MAX_TITLE = 120

/**
 * Shared text for a review. Both axes appear, on their own lines — the
 * conclusion's value and where it came from, then what the argument did — so
 * the shared text can never collapse them into a single verdict.
 */
export function formatReviewShareText(args: {
    assessment: TReviewAssessment
    argumentTitle: string
    url: string
}): string {
    const symbol = SYMBOLS[args.assessment.argument.outcome]
    const title =
        args.argumentTitle.length > MAX_TITLE
            ? `${args.argumentTitle.slice(0, MAX_TITLE)}…`
            : args.argumentTitle
    return [
        `${symbol} ${argumentAssessmentLine(args.assessment.argument)}`,
        conclusionAssessmentLine(args.assessment.conclusion),
        `"${title}"`,
        `My review: ${args.url}`,
    ].join("\n")
}
