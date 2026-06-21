import type { TArgumentImportOrigin } from "../schemas/integrations/index.js"

export const ARGUMENT_TITLE_MAX_LEN = 100
export const ARGUMENT_DESCRIPTION_MAX_LEN = 500
export const PREMISE_TITLE_MAX_LEN = 100
export const CLAIM_TITLE_MAX_LEN = 100
export const CLAIM_BODY_MAX_LEN = 500

export const POPULARITY_ALGO_PARAMS = {
    a: 0.01,
} as const

export function calculatePopularity(
    currentPopularity: number,
    time?: number,
    alpha?: number
): number {
    alpha = alpha ?? POPULARITY_ALGO_PARAMS.a
    time = time ?? Date.now()
    return Math.round(alpha * time + (1 - alpha) * currentPopularity)
}

export const AllArgumentImportOrigins: TArgumentImportOrigin[] = [
    "twitter",
    "reddit",
    "raw_text",
    "manual",
]
