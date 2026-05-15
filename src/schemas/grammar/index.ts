// Re-export of the four-tier grammar wire format from
// `@proposit/proposit-core`. Server and mobile import the schemas + types
// through `@proposit/shared/schemas/grammar` for the ergonomic single-import
// path; the source of truth is core (its `src/lib/grammar/types.ts`).
//
// The 2026-05-14 design restructure relocated wire-format ownership of
// `TGrammarTier`, `TGrammarRuleCode`, and `TViolation` from shared to
// core, matching the existing dep direction (shared has core as a peer
// dep; the inverse would have created a mutual peer-dep pattern).
// Pre-restructure drafts authored the schemas locally in this folder
// (`tier.ts`, `rule-code.ts`, `violation.ts`) — those files were deleted
// in shared 0.9.0 and replaced with this re-export. The 422-equivalent
// response envelope that composes `TViolation` remains shared's
// (`./schemas/api/grammar-violations`).
//
// Rule-code coordination: adding or renaming a code is a **core → shared
// → consumers** publish chain. Core bumps to extend the `TGrammarRuleCode`
// union and ship the validator emitting the new code; shared bumps
// minor (no code changes here — the re-export automatically reflects
// core's union via the dep range); server + mobile pick up via dep
// bumps. See `CLAUDE.md` for the full protocol.

export {
    GrammarTierSchema,
    GrammarRuleCodeSchema,
    ViolationSchema,
} from "@proposit/proposit-core"
export type {
    TGrammarTier,
    TGrammarRuleCode,
    TViolation,
} from "@proposit/proposit-core"
