import { describe, expect, it } from "vitest"
import { AXIOM_KIND_DESCRIPTIONS, AXIOM_KIND_LABELS } from "../axioms.js"

const ALL_KINDS = [
    "definition",
    "stipulation",
    "logical-principle",
    "mathematical-principle",
    "domain-rule",
    "background-assumption",
] as const

describe("AXIOM_KIND_LABELS", () => {
    it("has a non-empty label for every kind", () => {
        for (const kind of ALL_KINDS) {
            expect(AXIOM_KIND_LABELS[kind]).toBeTruthy()
        }
    })
})

describe("AXIOM_KIND_DESCRIPTIONS", () => {
    it("has a non-empty description for every kind", () => {
        for (const kind of ALL_KINDS) {
            expect(AXIOM_KIND_DESCRIPTIONS[kind]).toBeTruthy()
        }
    })

    it("includes an example sentence in each description", () => {
        for (const kind of ALL_KINDS) {
            expect(AXIOM_KIND_DESCRIPTIONS[kind]).toMatch(/Example:/)
        }
    })
})
