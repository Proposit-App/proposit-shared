import { describe, expect, it } from "vitest"
import { CONTESTED } from "@proposit/proposit-core"
import {
    ARGUMENT_OUTCOME_LABELS,
    ARGUMENT_REASON_TEXT,
    CONCLUSION_ASSERTED_STATEMENT,
    CONCLUSION_ONLY_ASSERTED_STATEMENT,
    CONCLUSION_REACHED_STATEMENT,
    CONCLUSION_VALUE_LABELS,
    type TArgumentAssessment,
    type TArgumentOutcome,
    type TArgumentReason,
    type TConclusionValue,
} from "../assessment.js"
import {
    ARGUMENT_EXPLAINERS,
    CONCLUSION_ATTRIBUTION_EXPLANATIONS,
    CONCLUSION_EXPLAINERS,
    WORKED_EXAMPLE_DISCLAIMER,
    WORKED_EXAMPLE_HEADING,
    WORKED_EXAMPLE_RESULT_LABEL,
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

describe("CONCLUSION_EXPLAINERS", () => {
    it("explains every value the conclusion axis can report", () => {
        for (const value of Object.keys(
            CONCLUSION_VALUE_LABELS
        ) as TConclusionValue[]) {
            expect(CONCLUSION_EXPLAINERS[value]).toBeDefined()
        }
    })

    it("separates a value settled both ways from one nobody settled", () => {
        const { definition, example } = CONCLUSION_EXPLAINERS.contested
        // The distinction the value exists for: not a shade of unknown.
        expect(definition).toMatch(/opposite of Unknown/i)
        expect(definition).toMatch(/nobody settled/i)
        expect(definition).toMatch(/settled it twice/i)
        // It arises from the reader's own inputs, so they can always undo it.
        expect(definition).toMatch(/you can always resolve/i)
        expect(definition).toMatch(/withdraw one of the steps you accepted/i)
        expect(example.items[0]).toMatchObject({ value: "contested" })
    })

    it("points a curious reader at the formalism behind the fourth value", () => {
        const urls = CONCLUSION_EXPLAINERS.contested.furtherReading.map(
            (reference) => reference.url
        )
        expect(urls).toContain(
            "https://en.wikipedia.org/wiki/Four-valued_logic"
        )
        expect(urls).toContain(
            "https://plato.stanford.edu/entries/logic-paraconsistent/"
        )
        expect(urls).toContain("https://en.wikipedia.org/wiki/Bilattice")
    })

    it("does not blame the reader or the author for the collision", () => {
        expect(CONCLUSION_EXPLAINERS.contested.definition).not.toMatch(
            /\b(mistake|error|wrong|you erred|bad argument|fault)\b/i
        )
    })
})

describe("ARGUMENT_EXPLAINERS content", () => {
    it("keeps the premises-hold entry's example off the collision shape", () => {
        // An accepted step between a true premise and a false conclusion is
        // the contested collision, not this outcome. Drawn that way the
        // example teaches the reader to recognise the wrong thing — and it is
        // structurally identical to the contested entry's own example.
        const entry =
            ARGUMENT_EXPLAINERS[
                "does-not-reach:premises-hold-conclusion-does-not-follow"
            ]
        expect(
            entry.example.items.some(
                (item) =>
                    item.kind === "operator" && item.decision === "accepted"
            )
        ).toBe(false)
        const contested = CONCLUSION_EXPLAINERS.contested.example.items
        expect(entry.example.items).not.toEqual(contested)
    })

    it("does not turn a reader-relative gap into a verdict on entailment", () => {
        // `premisesHoldConclusionFalse` is one assignment's gap, not a
        // countermodel — the stronger claim is what the validity check answers.
        const entry =
            ARGUMENT_EXPLAINERS[
                "does-not-reach:premises-hold-conclusion-does-not-follow"
            ]
        expect(entry.definition).not.toMatch(
            /counterexample|the argument's form|form does not carry/i
        )
        expect(entry.definition).toMatch(
            /under (the |your )?values you|your values/i
        )
    })

    it("keeps an operator-free example well-formed for a renderer", () => {
        // One entry deliberately has no operator item, so a client cannot
        // assume claims alternate with operators or that any claim has a
        // neighbour to connect to. Every item still stands on its own.
        const items =
            ARGUMENT_EXPLAINERS[
                "does-not-reach:premises-hold-conclusion-does-not-follow"
            ].example.items
        expect(items.every((item) => item.kind === "claim")).toBe(true)
        for (const item of items) {
            expect(item.depth).toBeGreaterThanOrEqual(0)
            if (item.kind === "claim") {
                expect(item.title.trim().length).toBeGreaterThan(0)
            }
        }
    })

    it("does not accuse an argument of asserting its conclusion", () => {
        const entry =
            ARGUMENT_EXPLAINERS["does-not-reach:conclusion-came-from-you"]
        expect(entry.definition).not.toMatch(
            /asserts its conclusion|rather than supporting it/i
        )
    })
})

describe("worked-example framing", () => {
    it.each([
        ["heading", WORKED_EXAMPLE_HEADING],
        ["disclaimer", WORKED_EXAMPLE_DISCLAIMER],
        ["result label", WORKED_EXAMPLE_RESULT_LABEL],
    ])("%s is non-empty", (_, text) => {
        expect(text.trim().length).toBeGreaterThan(0)
    })

    it("says plainly that the example is not the reader's own work", () => {
        expect(WORKED_EXAMPLE_DISCLAIMER).toContain(
            "not part of the argument you reviewed"
        )
        expect(WORKED_EXAMPLE_DISCLAIMER).toContain("nothing in it is yours")
    })

    it("labels the result as the example's, not the reader's", () => {
        expect(WORKED_EXAMPLE_RESULT_LABEL).toContain("this example")
    })
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

    it("reports a value settled both ways as itself, not as true", () => {
        expect(
            describeCounterexample(
                {
                    variables: { vA: CONTESTED },
                    operatorAssignments: {},
                },
                { vA: "Zebras are striped" }
            )
        ).toEqual([{ title: "Zebras are striped", value: "contested" }])
    })

    it("returns nothing when no variable has a title", () => {
        expect(describeCounterexample(assignment, {})).toEqual([])
    })
})
