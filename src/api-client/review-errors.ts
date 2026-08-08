// Discriminator helpers for the coded review envelopes the server returns
// alongside the ordinary `TErrorResponse` shape. `parseResponse` detects both
// and hands them back as values, so a caller narrows rather than catches.
//
// Mirrors `isGrammarViolationsError` and `isMutationConflictError`: use these
// when the error comes from a wider union — the error half of a `parseResponse`
// result is one, and `TErrorResponse` carries no `error` key to switch on.

import type {
    TReviewCreateConflictResponse,
    TReviewGetNotFoundResponse,
} from "../schemas/api/review/index.js"

/**
 * The reader has no review of this argument yet.
 *
 * An ordinary empty state, not a failure: it is the answer for every reader
 * opening an argument for the first time. Branch to "start a new review",
 * never to an error path.
 */
export function isReviewNotFoundError(
    err: unknown
): err is TReviewGetNotFoundResponse {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { error?: unknown }).error === "not_found"
    )
}

/**
 * A review of this argument already exists for the reader, and the envelope
 * carries its `reviewId`. Reached from a second tab, or a retry after a partial
 * failure; adopt the named review rather than creating another.
 */
export function isReviewAlreadyExistsError(
    err: unknown
): err is TReviewCreateConflictResponse {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { error?: unknown }).error === "already_exists"
    )
}
