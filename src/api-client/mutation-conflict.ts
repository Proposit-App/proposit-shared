// Discriminator helper for the 409-equivalent mutation-conflict envelope
// returned by server publish/archive mutations that hit a state conflict. Lets
// clients narrow an unknown error value to `TMutationConflictResponse` (and
// then switch on `code`) without re-parsing the response shape.
//
// Mirrors `isGrammarViolationsError`: use this guard when the error originates
// from a wider union (e.g. a caught `unknown`, or a
// `TErrorResponse | TMutationConflictResponse` boundary) and a runtime check is
// needed.

import type { TMutationConflictResponse } from "../schemas/api/mutation-conflict.js"

export function isMutationConflictError(
    err: unknown
): err is TMutationConflictResponse {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { error?: unknown }).error === "MUTATION_CONFLICT"
    )
}
