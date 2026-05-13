import type { TAxiomKind } from "../schemas/model/claims.js"

export const AXIOM_KIND_LABELS: Readonly<Record<TAxiomKind, string>> = {
    "definition": "True by definition or meaning",
    "stipulation": "Assumed for this argument",
    "logical-principle": "Basic logical principle",
    "mathematical-principle": "Basic mathematical principle",
    "domain-rule": "Rule or authority within a system",
    "background-assumption": "General background assumption",
} as const

export const AXIOM_KIND_DESCRIPTIONS: Readonly<Record<TAxiomKind, string>> = {
    "definition":
        "Use when the claim is treated as true because of what the relevant words, categories, or concepts mean. Example: 'A bachelor is unmarried.'",
    "stipulation":
        "Use when the argument explicitly defines or assumes something for its own purposes. Example: 'For this argument, an active user means someone who logs in weekly.'",
    "logical-principle":
        "Use for basic principles of valid reasoning. Example: 'If P implies Q, and P is true, then Q follows.'",
    "mathematical-principle":
        "Use for basic mathematical identities, axioms, or quantitative rules. Example: 'For any number x, x + 0 = x.'",
    "domain-rule":
        "Use for rules, standards, texts, contracts, doctrines, protocols, or authorities internal to a system. Example: 'Under this contract, payment is due within 30 days.'",
    "background-assumption":
        "Use for a foundational assumption the argument relies on but does not prove. Example: 'Human well-being matters.'",
} as const
