import { describe, it, expect } from "vitest"
import { buildInlineReviewOverlay } from "../../review/overlay.js"
import {
    buildEngineWithTwoPremises,
    buildEngineWithAxiomaticConclusion,
} from "./fixtures.js"
import type { TAssignmentPill } from "../../review/types.js"
import type { TTrivalentValue } from "../../../schemas/review.js"

const VALID_GRADES = new Set([
    "sound",
    "vacuously-true",
    "unsound",
    "counterexample",
    "inadmissible",
    "indeterminate",
])

describe("buildInlineReviewOverlay", () => {
    it("defaults every normal claim to unknown with 'default' provenance", () => {
        const engine = buildEngineWithTwoPremises()
        const overlay = buildInlineReviewOverlay({
            argEngine: engine,
            reactions: {},
            overrides: {},
        })
        // All three fixture claims are `normal` and unsupported → default unknown.
        expect(overlay.claimValues.sA).toBe("unknown")
        expect(overlay.claimValues.cA).toBe("unknown")
        expect(overlay.claimValues.cB).toBe("unknown")
        expect(overlay.claimProvenance!.sA).toBe("default")
        expect(overlay.claimProvenance!.cA).toBe("default")
        expect(overlay.claimProvenance!.cB).toBe("default")
    })

    it("maps trivalent reactions to pills and marks provenance 'user'", () => {
        const engine = buildEngineWithTwoPremises()
        const reactions: Record<string, TTrivalentValue> = {
            sA: true, // agree
            cA: false, // disagree
            cB: null, // unsure
        }
        const overlay = buildInlineReviewOverlay({
            argEngine: engine,
            reactions,
            overrides: {},
        })
        expect(overlay.claimValues.sA).toBe("true")
        expect(overlay.claimValues.cA).toBe("false")
        expect(overlay.claimValues.cB).toBe("unknown")
        expect(overlay.claimProvenance!.sA).toBe("user")
        expect(overlay.claimProvenance!.cA).toBe("user")
        expect(overlay.claimProvenance!.cB).toBe("user")
    })

    it("prefers override over reaction over default", () => {
        const engine = buildEngineWithTwoPremises()
        const reactions: Record<string, TTrivalentValue> = {
            sA: true,
            cA: true,
        }
        const overrides: Record<string, TAssignmentPill> = { sA: "false" }
        const overlay = buildInlineReviewOverlay({
            argEngine: engine,
            reactions,
            overrides,
        })
        // sA: override wins over reaction.
        expect(overlay.claimValues.sA).toBe("false")
        // cA: reaction wins over default.
        expect(overlay.claimValues.cA).toBe("true")
        // cB: default (no override/reaction).
        expect(overlay.claimValues.cB).toBe("unknown")
        expect(overlay.claimProvenance!.sA).toBe("user")
        expect(overlay.claimProvenance!.cA).toBe("user")
        expect(overlay.claimProvenance!.cB).toBe("default")
    })

    it("lets an override carry a 'skipped' pill; reactions never do", () => {
        const engine = buildEngineWithTwoPremises()
        const overlay = buildInlineReviewOverlay({
            argEngine: engine,
            reactions: { cB: null },
            overrides: { sA: "skipped" },
        })
        expect(overlay.claimValues.sA).toBe("skipped")
        expect(overlay.claimProvenance!.sA).toBe("user")
        // unsure reaction → "unknown", not "skipped".
        expect(overlay.claimValues.cB).toBe("unknown")
    })

    it("lazily falls back: reaction moves the value, override pins it, clearing falls back", () => {
        const engine = buildEngineWithTwoPremises()
        const base = (
            reactions: Record<string, TTrivalentValue>,
            overrides: Record<string, TAssignmentPill>
        ): TAssignmentPill =>
            buildInlineReviewOverlay({
                argEngine: engine,
                reactions,
                overrides,
            }).claimValues.cA

        // Reaction agree → true.
        expect(base({ cA: true }, {})).toBe("true")
        // Change the reaction to disagree → effective follows.
        expect(base({ cA: false }, {})).toBe("false")
        // Add an override → pins regardless of the reaction.
        expect(base({ cA: false }, { cA: "unknown" })).toBe("unknown")
        // Clear the override → falls back to the reaction again.
        expect(base({ cA: false }, {})).toBe("false")
    })

    it("surfaces per-claim propagated values and the argument grade", () => {
        const engine = buildEngineWithTwoPremises()
        const overlay = buildInlineReviewOverlay({
            argEngine: engine,
            reactions: { cA: true, cB: true },
            overrides: {},
        })
        // Propagated map is claim-keyed and carries the evaluated value.
        expect(overlay.claimPropagatedValues!.cA).toBe(true)
        expect(overlay.claimPropagatedValues!.cB).toBe(true)
        expect(VALID_GRADES.has(overlay.grade!)).toBe(true)
    })

    it("propagates unknown → true through an accepted inference while the chip value stays unknown", () => {
        const engine = buildEngineWithTwoPremises()
        // React agree to cA (A = true) only; leave cB with no reaction/override.
        const overlay = buildInlineReviewOverlay({
            argEngine: engine,
            reactions: { cA: true },
            overrides: {},
        })
        // cB's chip shows the usage-based default — unknown.
        expect(overlay.claimValues.cB).toBe("unknown")
        // But through the accepted implies(A, B) with A true, cB propagates to
        // true. The two MUST genuinely differ — a broken variableId → claimId
        // translation would drop back to the "unknown" effective value here.
        expect(overlay.claimPropagatedValues!.cB).toBe(true)
    })

    it("strips axiom-bound keys before evaluating (no AXIOM_VARIABLE_ASSIGNMENT_FORBIDDEN throw)", () => {
        const engine = buildEngineWithAxiomaticConclusion()
        // Axiom claim defaults to true; feeding its key to evaluate() would throw.
        const overlay = buildInlineReviewOverlay({
            argEngine: engine,
            reactions: {},
            overrides: {},
        })
        expect(overlay.claimValues.cAxiom).toBe("true")
        expect(overlay.claimProvenance!.cAxiom).toBe("default")
        expect(VALID_GRADES.has(overlay.grade!)).toBe(true)
    })
})
