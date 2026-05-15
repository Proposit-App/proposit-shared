// 422-equivalent response envelope returned by server endpoints that
// reject a request due to grammar-tier violations. Used by:
//   - submit/save endpoints in assistive mode (validate('derivable') gate)
//   - publish endpoint (validate('presentable') gate)
//
// `error` is the stable string discriminator ("GRAMMAR_VIOLATIONS") that
// allows clients to switch on response type without sniffing tier/codes.
// `tier` is the gate the request failed at (the strictest tier the
// endpoint enforces). `violations` is the full list — clients may render
// them inline next to the offending entity (see spec §10.3, §10.4).

import { Type, type Static } from "typebox"
import { GrammarTierSchema, ViolationSchema } from "../grammar/index.js"

export const GrammarViolationsResponseSchema = Type.Object({
    error: Type.Literal("GRAMMAR_VIOLATIONS"),
    tier: GrammarTierSchema,
    violations: Type.Array(ViolationSchema),
})

export type TGrammarViolationsResponse = Static<
    typeof GrammarViolationsResponseSchema
>
