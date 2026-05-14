// Wire format for a single grammar violation. Returned by core's
// `validate(tier)` and by server's 422 grammar-violations envelope
// (see ./api/grammar-violations.ts).
//
// `tier` and `code` are constrained unions. `message` is a human-readable
// string the UI may localize/replace. The locator fields are all optional
// because some rules apply argument-wide and have no per-entity locator.
// `additionalProperties: true` reserves an extension slot for rule-specific
// context fields the validator may attach (e.g., D-3 might attach
// `mixedCitationCount`/`mixedAxiomCount` for UI rendering); see spec §7.1.

import { Type, type Static } from "typebox"
import { GrammarTierSchema } from "./tier.js"
import { GrammarRuleCodeSchema } from "./rule-code.js"

export const ViolationSchema = Type.Object(
    {
        tier: GrammarTierSchema,
        code: GrammarRuleCodeSchema,
        message: Type.String(),
        argumentId: Type.Optional(Type.String()),
        premiseId: Type.Optional(Type.String()),
        expressionId: Type.Optional(Type.String()),
        variableId: Type.Optional(Type.String()),
        claimId: Type.Optional(Type.String()),
    },
    { additionalProperties: true }
)

export type TViolation = Static<typeof ViolationSchema>
