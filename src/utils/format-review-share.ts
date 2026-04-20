import type { TConclusionVerdict } from "../engine/review/types.js"

const SYMBOLS: Record<TConclusionVerdict, string> = {
    "Valid and Sound": "✓",
    Failing: "✗",
    "Logically Invalid": "✗",
    Vacuous: "∅",
    Indeterminate: "…",
}

const MAX_TITLE = 120

export function formatReviewShareText(args: {
    verdict: TConclusionVerdict
    argumentTitle: string
    url: string
}): string {
    const symbol = SYMBOLS[args.verdict]
    const title =
        args.argumentTitle.length > MAX_TITLE
            ? `${args.argumentTitle.slice(0, MAX_TITLE)}…`
            : args.argumentTitle
    return `${symbol} ${args.verdict}\n"${title}"\nMy review: ${args.url}`
}
