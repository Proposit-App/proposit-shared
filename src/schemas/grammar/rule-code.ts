// Canonical grammar rule-code namespace. The string-literal codes themselves
// are owned here (wire format); proposit-core owns the *definitions* of what
// each code means and what triggers it.
//
// Codes 'E-2' and 'D-7' are intentionally absent — their rules were
// promoted/restated in the spec (E-2 → S-13 per §4.2; D-7 → E-6 per §4.3)
// and their codes are reserved (not reused) so historical references remain
// unambiguous. Do not add them back without coordinating with core.
//
// Adding a new rule code is a coordinated shared+core publish — see this
// repo's CLAUDE.md "Grammar rule-code coordination protocol" for the flow.

import { Type, type Static } from "typebox"

export const GrammarRuleCodeSchema = Type.Union([
    // Structural (S-1..S-14)
    Type.Literal("S-1"),
    Type.Literal("S-2"),
    Type.Literal("S-3"),
    Type.Literal("S-4"),
    Type.Literal("S-5"),
    Type.Literal("S-6"),
    Type.Literal("S-7"),
    Type.Literal("S-8"),
    Type.Literal("S-9"),
    Type.Literal("S-10"),
    Type.Literal("S-11"),
    Type.Literal("S-12"),
    Type.Literal("S-13"),
    Type.Literal("S-14"),
    // Evaluable (E-1, E-3..E-7 — 'E-2' reserved)
    Type.Literal("E-1"),
    Type.Literal("E-3"),
    Type.Literal("E-4"),
    Type.Literal("E-5"),
    Type.Literal("E-6"),
    Type.Literal("E-7"),
    // Derivable (D-1..D-6 — 'D-7' reserved)
    Type.Literal("D-1"),
    Type.Literal("D-2"),
    Type.Literal("D-3"),
    Type.Literal("D-4"),
    Type.Literal("D-5"),
    Type.Literal("D-6"),
    // Presentable (P-1..P-5)
    Type.Literal("P-1"),
    Type.Literal("P-2"),
    Type.Literal("P-3"),
    Type.Literal("P-4"),
    Type.Literal("P-5"),
])

export type TGrammarRuleCode = Static<typeof GrammarRuleCodeSchema>
