// Machine-readable 422-equivalent envelope returned when the server refuses a
// write because its content violates Proposit's content policy. Emitted by the
// write boundaries that screen user-authored text before it becomes public.
//
// `error` is the stable string discriminator ("CONTENT_POLICY_VIOLATION") that
// lets a client switch on response type without sniffing status codes.
// `message` carries the server's human-readable text for direct display.
//
// **422, sharing the status with the grammar-tier envelope.** Both are
// "well-formed request, refused on its content", and a second convention would
// cost every consumer another branch. Sharing a status is already how this
// codebase works — 409 carries both MUTATION_CONFLICT and the review-create
// conflict — because `parseResponse` disambiguates by checking each envelope's
// shape, not by status alone. This envelope cannot be confused with the grammar
// one, which requires `error: "GRAMMAR_VIOLATIONS"` plus `tier` and
// `violations`.
//
// **Two fields, deliberately.** Consumers render an explanation plus Dismiss /
// Appeal, and `message` is the explanation. Notably absent: the categories the
// content tripped and their confidence scores. Those are an internal signal —
// publishing them to every client leaks the filter's shape and freezes the
// server's ability to tune it behind a wire contract. A field pointing at
// *which* part of a submission was refused is plausibly useful and can be added
// additively if a server surface can actually produce one.

import { Type, type Static } from "typebox"

export const ContentPolicyViolationResponseSchema = Type.Object({
    error: Type.Literal("CONTENT_POLICY_VIOLATION"),
    message: Type.String(),
})

export type TContentPolicyViolationResponse = Static<
    typeof ContentPolicyViolationResponseSchema
>
