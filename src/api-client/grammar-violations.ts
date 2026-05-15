// Discriminator helper for the 422 grammar-violations envelope returned by
// server endpoints that fail a grammar-tier gate (submit/save in assistive,
// publish in either mode). Lets clients narrow an unknown error value to
// `TGrammarViolationsResponse` without re-parsing the response shape.
//
// Sits next to `parseResponse`'s overload form: when a callsite passes
// `GrammarViolationsResponseSchema` as the third generic, `result.error` is
// already typed. Use this guard when the error originates from a wider union
// (e.g. caught `unknown`, or a `TErrorResponse | TGrammarViolationsResponse`
// boundary) and a runtime check is needed.

import type { TGrammarViolationsResponse } from "../schemas/api/grammar-violations.js"

export function isGrammarViolationsError(
    err: unknown
): err is TGrammarViolationsResponse {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { error?: unknown }).error === "GRAMMAR_VIOLATIONS"
    )
}
