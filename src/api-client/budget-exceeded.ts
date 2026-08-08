// Discriminator helper for the 402 budget-exceeded envelope every LLM-bearing
// entry route emits (argument import, argument build) when the caller's monthly
// token budget is exhausted.
//
// Mirrors `isGrammarViolationsError` and `isMutationConflictError`. Keyed on
// `code` rather than `error`, because that is the discriminator this envelope
// carries — and it is the same code the task-level failure uses, so a client
// has one classifier across the request-level and task-level surfaces.

import type { TBudgetExceededErrorBody } from "../schemas/api/errors.js"

export function isBudgetExceededError(
    err: unknown
): err is TBudgetExceededErrorBody {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { code?: unknown }).code === "TOKEN_BUDGET_EXCEEDED"
    )
}
