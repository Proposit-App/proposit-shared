import { describe, expect, it } from "vitest"
import {
    ARGUMENT_OUTCOME_LABELS,
    ARGUMENT_REASON_TEXT,
    CONCLUSION_ASSERTED_STATEMENT,
    CONCLUSION_ONLY_ASSERTED_STATEMENT,
    CONCLUSION_REACHED_STATEMENT,
    type TArgumentAssessment,
    type TArgumentOutcome,
    type TArgumentReason,
} from "../assessment.js"
import {
    ARGUMENT_EXPLAINERS,
    CONCLUSION_ATTRIBUTION_EXPLANATIONS,
    CONCLUSION_EXPLAINERS,
    argumentExplainerKey,
    describeCounterexample,
    type TExplainer,
} from "../explainer.js"

const OUTCOMES = Object.keys(ARGUMENT_OUTCOME_LABELS) as TArgumentOutcome[]
const REASONS = Object.keys(ARGUMENT_REASON_TEXT) as TArgumentReason[]

const NO_STRUCK = {
    struckPremiseIds: [],
    rejectedPremiseCount: 0,
    declinedConstraintCount: 0,
    labels: [],
}

function assessment(
    outcome: TArgumentOutcome,
    reason?: TArgumentReason
): TArgumentAssessment {
    return {
        outcome,
        label: ARGUMENT_OUTCOME_LABELS[outcome],
        ...(reason
            ? { reason, reasonText: ARGUMENT_REASON_TEXT[reason] }
            : undefined),
        struck: NO_STRUCK,
    }
}

const ALL_EXPLAINERS: [string, TExplainer][] = [
    ...Object.entries(CONCLUSION_EXPLAINERS),
    ...Object.entries(ARGUMENT_EXPLAINERS),
]

describe("argumentExplainerKey", () => {
    it("resolves every outcome × reason shape to a present entry", () => {
        for (const outcome of OUTCOMES) {
            for (const reason of REASONS) {
                const key = argumentExplainerKey(assessment(outcome, reason))
                expect(ARGUMENT_EXPLAINERS[key]).toBeDefined()
            }
            const key = argumentExplainerKey(assessment(outcome))
            expect(ARGUMENT_EXPLAINERS[key]).toBeDefined()
        }
    })

    it("composes the reason into the key, and falls back when one is missing", () => {
        expect(
            argumentExplainerKey(
                assessment("does-not-reach", "reasoning-rejected")
            )
        ).toBe("does-not-reach:reasoning-rejected")
        expect(argumentExplainerKey(assessment("does-not-reach"))).toBe(
            "does-not-reach:not-enough-settled"
        )
    })

    it("covers the six argument keys and no more", () => {
        expect(Object.keys(ARGUMENT_EXPLAINERS)).toHaveLength(
            2 + REASONS.length
        )
    })
})

describe("explainer content", () => {
    it.each(ALL_EXPLAINERS)(
        "%s has a definition and references",
        (_, entry) => {
            expect(entry.definition.trim().length).toBeGreaterThan(0)
            expect(entry.furtherReading.length).toBeGreaterThan(0)
            for (const reference of entry.furtherReading) {
                expect(reference.label.trim().length).toBeGreaterThan(0)
                expect(reference.url.startsWith("https://")).toBe(true)
            }
        }
    )

    it.each(ALL_EXPLAINERS)("%s has a worked example", (_, entry) => {
        expect(entry.example.scenario.trim().length).toBeGreaterThan(0)
        expect(entry.example.result.trim().length).toBeGreaterThan(0)
        expect(entry.example.items.length).toBeGreaterThanOrEqual(2)
    })

    it.each(ALL_EXPLAINERS)(
        "%s marks exactly one conclusion, first",
        (_, entry) => {
            const conclusions = entry.example.items.filter(
                (item) => item.kind === "claim" && item.isConclusion === true
            )
            expect(conclusions).toHaveLength(1)
            expect(entry.example.items[0]).toBe(conclusions[0])
        }
    )

    // The grade vocabulary the two-axis model replaced. A definition that
    // reintroduces it teaches a model the assessment no longer reports.
    it.each(ALL_EXPLAINERS)(
        "%s definition drops old grade words",
        (_, entry) => {
            expect(entry.definition).not.toMatch(
                /\b(sound|unsound|vacuously.true|counterexample-grade|inadmissible|indeterminate)\b/i
            )
        }
    )
})

describe("CONCLUSION_ATTRIBUTION_EXPLANATIONS", () => {
    it("explains exactly the three attribution statements", () => {
        expect(Object.keys(CONCLUSION_ATTRIBUTION_EXPLANATIONS).sort()).toEqual(
            [
                CONCLUSION_ASSERTED_STATEMENT,
                CONCLUSION_REACHED_STATEMENT,
                CONCLUSION_ONLY_ASSERTED_STATEMENT,
            ].sort()
        )
        for (const explanation of Object.values(
            CONCLUSION_ATTRIBUTION_EXPLANATIONS
        )) {
            expect(explanation.trim().length).toBeGreaterThan(0)
        }
    })
})

describe("describeCounterexample", () => {
    const assignment = {
        variables: { vA: true, vB: false, vC: null, vOrphan: true },
        operatorAssignments: {},
    }

    it("maps titles, skips untitled variables, and sorts by title", () => {
        expect(
            describeCounterexample(assignment, {
                vA: "Zebras are striped",
                vB: "Ants are large",
                vC: "Moths are nocturnal",
            })
        ).toEqual([
            { title: "Ants are large", value: "false" },
            { title: "Moths are nocturnal", value: "unknown" },
            { title: "Zebras are striped", value: "true" },
        ])
    })

    it("returns nothing when no variable has a title", () => {
        expect(describeCounterexample(assignment, {})).toEqual([])
    })
})
