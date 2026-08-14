// Discriminator helper for the 422 content-policy envelope the server emits
// when it refuses a write because its content violates Proposit's content
// policy.
//
// Mirrors `isGrammarViolationsError` and `isMutationConflictError`, and is
// keyed on `error` for the same reason they are — that is the discriminator
// this envelope carries. (`isBudgetExceededError` keys on `code` because its
// envelope is the odd one out.)

import type { TContentPolicyViolationResponse } from "../schemas/api/content-policy.js"

export function isContentPolicyViolationError(
    err: unknown
): err is TContentPolicyViolationResponse {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { error?: unknown }).error === "CONTENT_POLICY_VIOLATION"
    )
}
