// The four grammar tiers form a strict subset chain
// (Structural ⊇ Evaluable ⊇ Derivable ⊇ Presentable). See cross-repo spec
// 2026-05-13-grammar-tiers-design §3 for the full definition.
//
// Wire format owned by @proposit/shared; consumed by proposit-core
// (validator implementations), proposit-server (endpoint gates),
// and proposit-mobile (inline issue surface).

import { Type, type Static } from "typebox"

export const GrammarTierSchema = Type.Union([
    Type.Literal("structural"),
    Type.Literal("evaluable"),
    Type.Literal("derivable"),
    Type.Literal("presentable"),
])

export type TGrammarTier = Static<typeof GrammarTierSchema>
