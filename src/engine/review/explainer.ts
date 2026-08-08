import type { TCoreExpressionAssignment } from "@proposit/proposit-core"
import {
    CONCLUSION_ASSERTED_STATEMENT,
    CONCLUSION_ONLY_ASSERTED_STATEMENT,
    CONCLUSION_REACHED_STATEMENT,
    type TArgumentAssessment,
    type TArgumentReason,
    type TConclusionValue,
} from "./assessment.js"

/**
 * The material that *explains* the vocabulary `./assessment.js` reports with:
 * a plain-words definition, a worked example in Proposit's own notation, and
 * further reading, per thing a reader can be looking at.
 *
 * It is data, never markup — this package has no React and compiles against
 * `lib: ["ES2022"]`, so each client draws these items with its own primitives.
 * Authoring them once here is what keeps web and mobile from teaching two
 * different meanings for the same chip.
 *
 * The rules the strings in `./assessment.js` hold to hold here too, plus:
 *
 * - **Nothing re-collapses the two axes.** A true conclusion beside an argument
 *   that didn't reach it is coherent, and is explained as coherent.
 * - **Nothing allocates fault.** A definition says what follows from the
 *   reader's decisions; it never says the reader erred or the author's argument
 *   is bad.
 */

/** A pill in a worked example. The `inferred-*` forms are values the example's argument worked out, not ones its reader supplied. */
export type TExampleValue =
    | true
    | false
    | null
    | "inferred-true"
    | "inferred-false"

/** One line of a worked example: a claim card, or the operator label between claims. `depth` is the nesting level, as in the text tree. */
export type TExampleItem =
    | {
          kind: "claim"
          depth: number
          title: string
          negated?: boolean
          isConclusion?: boolean
          value: TExampleValue
      }
    | {
          kind: "operator"
          depth: number
          label: string
          decision: "accepted" | "rejected"
      }

export interface TWorkedExample {
    /** One sentence of ordinary-life setup, read before the items. */
    scenario: string
    /** Flat, depth-tagged. The conclusion is the first item. */
    items: TExampleItem[]
    /** The assessment label this example comes out to. */
    result: string
}

/**
 * The chrome a {@link TWorkedExample} is presented in — not part of the example,
 * but not the client's to word either.
 *
 * An example is drawn with the same primitives as the argument under review, so
 * the only thing separating the two is what is said around it. A reader who
 * takes an illustration for their own argument has been told something false
 * about their review, and a result line labelled "Result:" reads as *their*
 * result — that is a correctness problem, not a styling one, and a correctness
 * problem cannot be a per-client string. These three sit beside the definitions
 * for the same reason the definitions are here: neither client can say
 * something the other cannot.
 */
export const WORKED_EXAMPLE_HEADING = "Worked example"
export const WORKED_EXAMPLE_DISCLAIMER =
    "A made-up argument, shown here to illustrate the term. It is not part of the argument you reviewed, and nothing in it is yours."
export const WORKED_EXAMPLE_RESULT_LABEL = "Result of this example:"

export interface TReference {
    label: string
    url: string
}

export interface TExplainer {
    definition: string
    example: TWorkedExample
    furtherReading: TReference[]
}

/** For notes too small to earn a worked example. */
export interface TReferenceOnlyExplainer {
    definition: string
    furtherReading: TReference[]
}

const TRUTH_VALUE_REFERENCE: TReference = {
    label: "Truth value — Wikipedia",
    url: "https://en.wikipedia.org/wiki/Truth_value",
}
const LOGICAL_CONSEQUENCE_REFERENCE: TReference = {
    label: "Logical Consequence (SEP)",
    url: "https://plato.stanford.edu/entries/logical-consequence/",
}
const DEDUCTIVE_INDUCTIVE_REFERENCE: TReference = {
    label: "Deductive and Inductive Arguments (IEP)",
    url: "https://iep.utm.edu/ded-ind/",
}
const THREE_VALUED_LOGIC_REFERENCE: TReference = {
    label: "Three-Valued Logic — Wikipedia",
    url: "https://en.wikipedia.org/wiki/Three-valued_logic",
}
const MANY_VALUED_LOGIC_REFERENCE: TReference = {
    label: "Many-Valued Logic (SEP)",
    url: "https://plato.stanford.edu/entries/logic-manyvalued/",
}
const VALIDITY_SOUNDNESS_REFERENCE: TReference = {
    label: "Validity and Soundness (IEP)",
    url: "https://iep.utm.edu/val-snd/",
}

/** The explanatory material for the conclusion axis, keyed by the value itself. */
export const CONCLUSION_EXPLAINERS: Record<TConclusionValue, TExplainer> = {
    true: {
        definition:
            "Under the values you supplied, the conclusion comes out true. That is a statement about the proposition, not a mark for the argument — the two are reported separately, and this one can read true even when the argument beside it did nothing to get there. The statements next to the value tell you which you are looking at: whether you assigned it yourself, and whether the argument reaches it without leaning on anything you assigned.",
        example: {
            scenario:
                "You said the bridge is closed, and accepted that a closed bridge leaves the detour as the only way through.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "The detour is the only way through",
                    value: "inferred-true",
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "The bridge is closed",
                    value: true,
                },
            ],
            result: "True",
        },
        furtherReading: [TRUTH_VALUE_REFERENCE, LOGICAL_CONSEQUENCE_REFERENCE],
    },
    false: {
        definition:
            "Under the values you supplied, the conclusion comes out false. Something you settled rules it out, either directly or through a step you accepted. This is not a finding that the author reasoned badly: a well-built argument reaches a false conclusion whenever its reader disagrees with what it starts from. What the author's work achieved is reported separately, beside this.",
        example: {
            scenario:
                "Arguing that today is Friday, when you have already said today is Tuesday.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "Today is Friday",
                    value: false,
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "Today is Tuesday",
                    value: true,
                },
            ],
            result: "False",
        },
        furtherReading: [TRUTH_VALUE_REFERENCE, DEDUCTIVE_INDUCTIVE_REFERENCE],
    },
    unknown: {
        definition:
            "Not enough was settled for the conclusion to come out either way. Unknown is a gap, not a defeat — it says the outcome still turns on something left open: a claim you marked unknown, or one that nothing in the argument settles. Filling that gap in either direction can move it. Nothing about the argument's quality follows from an unknown.",
        example: {
            scenario:
                "Arguing that a locked box is empty, while refusing to say whether anything was ever put in it.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "The box is empty",
                    value: null,
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "Nothing was ever put in the box",
                    value: null,
                },
            ],
            result: "Unknown",
        },
        furtherReading: [
            THREE_VALUED_LOGIC_REFERENCE,
            MANY_VALUED_LOGIC_REFERENCE,
        ],
    },
}

/**
 * The argument axis has one key per outcome, except that `does-not-reach`
 * composes with its reason — the bare outcome says almost nothing without it.
 */
export type TArgumentExplainerKey =
    | "reaches-conclusion"
    | "premises-contradict"
    | `does-not-reach:${TArgumentReason}`

export const ARGUMENT_EXPLAINERS: Record<TArgumentExplainerKey, TExplainer> = {
    "reaches-conclusion": {
        definition:
            "From the premises you accepted, and without leaning on any value you gave the conclusion itself, the argument gets there. That is the strongest thing this assessment says. It does not say the conclusion is true — that is the other assessment's job, and the two are allowed to disagree — and it does not put the argument beyond question: you may have granted a step for good practical reasons rather than because it holds without exception.",
        example: {
            scenario:
                "All humans are mortal, and Brian is a human — therefore Brian is mortal.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "Brian is mortal",
                    value: "inferred-true",
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "All humans are mortal",
                    value: true,
                },
                {
                    kind: "operator",
                    depth: 1,
                    label: "and",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "Brian is a human",
                    value: true,
                },
            ],
            result: "Reaches its conclusion",
        },
        furtherReading: [
            VALIDITY_SOUNDNESS_REFERENCE,
            LOGICAL_CONSEQUENCE_REFERENCE,
            {
                label: "Soundness — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Soundness",
            },
        ],
    },
    "premises-contradict": {
        definition:
            "This argument's premises cannot all hold at once — not because of anything you assigned, but because of how they are written. No assignment of values satisfies them together. Nothing can be worked out from a set like that: from a contradiction anything at all follows, which makes reaching a conclusion worth nothing. You are told this at the start of a review rather than at the end, so you are never asked to spend a walkthrough on values that could not have come out consistent.",
        example: {
            scenario:
                "An argument that rests on the meeting being on Monday and, elsewhere, on its not being on Monday.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "The plan is settled",
                    value: null,
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "The meeting is on Monday",
                    value: true,
                },
                {
                    kind: "operator",
                    depth: 1,
                    label: "and",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "The meeting is on Monday",
                    negated: true,
                    value: true,
                },
            ],
            result: "Its premises contradict each other",
        },
        furtherReading: [
            {
                label: "Contradiction — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Contradiction",
            },
            {
                label: "Principle of Explosion — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Principle_of_explosion",
            },
            {
                label: "Satisfiability — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Satisfiability",
            },
        ],
    },
    "does-not-reach:conclusion-came-from-you": {
        definition:
            "The conclusion holds, but only because you assigned it. Withhold that one input and nothing in the argument gets there — so as written, the argument asserts its conclusion rather than supporting it. This is worth knowing precisely when you agree with the conclusion, because agreement is the easiest way to miss that no work was done.",
        example: {
            scenario:
                "You already believed the new policy is fair. The argument offers one reason — that an independent panel drew it up — and you left that unsettled.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "The new policy is fair",
                    value: true,
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "An independent panel drew it up",
                    value: null,
                },
            ],
            result: "Doesn't reach its conclusion",
        },
        furtherReading: [
            {
                label: "Argument — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Argument",
            },
            DEDUCTIVE_INDUCTIVE_REFERENCE,
        ],
    },
    "does-not-reach:reasoning-rejected": {
        definition:
            "You rejected a step the argument needed, so it is out of the set the conclusion was worked out from. Rejecting a step says its reasoning does not carry; it says nothing about whether what that step concludes is true, and nothing here treats it as though you had called it false. The claim is simply no longer supported from here. Rejecting one step often leaves an argument short of its conclusion without settling anything against it.",
        example: {
            scenario:
                "A step from 'the ground is wet' to 'it rained', rejected because a sprinkler would do just as well.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "It rained",
                    value: null,
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "rejected",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "The ground is wet",
                    value: true,
                },
            ],
            result: "Doesn't reach its conclusion",
        },
        furtherReading: [
            {
                label: "Premise — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Premise",
            },
            VALIDITY_SOUNDNESS_REFERENCE,
        ],
    },
    "does-not-reach:not-enough-settled": {
        definition:
            "Every step the argument needs is still standing and you have ruled nothing out — there is simply not enough settled yet for the conclusion to follow. This is the most common way a review ends short, and it is not a criticism of the argument. Going back and settling one of the claims you left unknown may be all it takes.",
        example: {
            scenario:
                "An argument that the tickets will sell out, resting on a claim about demand you have not formed a view on.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "The tickets will sell out",
                    value: null,
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "Demand is higher than last year",
                    value: null,
                },
            ],
            result: "Doesn't reach its conclusion",
        },
        furtherReading: [
            THREE_VALUED_LOGIC_REFERENCE,
            MANY_VALUED_LOGIC_REFERENCE,
        ],
    },
    "does-not-reach:premises-hold-conclusion-does-not-follow": {
        definition:
            "Every premise still standing holds under your values, and the conclusion still comes out false. That is the sharpest negative result a review produces, because it does not depend on anything you left open — it is a case where the argument's form does not carry its content. This is what a counterexample looks like from the inside.",
        example: {
            scenario:
                "'The ground is wet, so it must have rained' — but the sprinkler was on, and you have already said it did not rain.",
            items: [
                {
                    kind: "claim",
                    depth: 0,
                    isConclusion: true,
                    title: "It rained",
                    value: false,
                },
                {
                    kind: "operator",
                    depth: 0,
                    label: "is true if",
                    decision: "accepted",
                },
                {
                    kind: "claim",
                    depth: 1,
                    title: "The ground is wet",
                    value: true,
                },
            ],
            result: "Doesn't reach its conclusion",
        },
        furtherReading: [
            {
                label: "Formal Fallacy — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Formal_fallacy",
            },
            {
                label: "Affirming the Consequent — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Affirming_the_consequent",
            },
            {
                label: "Counterexample — Wikipedia",
                url: "https://en.wikipedia.org/wiki/Counterexample",
            },
        ],
    },
}

/**
 * Which entry explains a given argument assessment.
 *
 * `composeArgument` always supplies a reason with `does-not-reach`, so the
 * fallback is defensive only: `not-enough-settled` is the reading that claims
 * least about why.
 */
export function argumentExplainerKey(
    argument: TArgumentAssessment
): TArgumentExplainerKey {
    if (argument.outcome !== "does-not-reach") return argument.outcome
    return `does-not-reach:${argument.reason ?? "not-enough-settled"}`
}

/**
 * What each attribution statement means. Keyed by the statement constants
 * themselves so the two cannot drift apart.
 */
export const CONCLUSION_ATTRIBUTION_EXPLANATIONS: Record<string, string> = {
    [CONCLUSION_ASSERTED_STATEMENT]:
        "This value is yours — set during the walkthrough, or by reacting to the claim. It is recorded separately so you can tell your own input from what the argument worked out.",
    [CONCLUSION_REACHED_STATEMENT]:
        "Withhold your own assignment of the conclusion and it still comes out this way, from the premises you accepted. The argument does not depend on your having granted it.",
    [CONCLUSION_ONLY_ASSERTED_STATEMENT]:
        "Withhold your own assignment and the value goes away: the argument as it stands does not get there without you. That is a fact about this argument, not about whether the conclusion is true.",
}

/** Shown against a step that is satisfied but passes nothing on. */
export const VACUOUS_INFERENCE_EXPLANATION: TReferenceOnlyExplainer = {
    definition:
        "This step is satisfied, but it passed nothing on. It is an 'if … then …' whose 'if' side doesn't hold, and such a step counts as satisfied whatever its 'then' side says — so it supports the conclusion no more than it denies it. Nothing follows from it here.",
    furtherReading: [
        {
            label: "Vacuous Truth — Wikipedia",
            url: "https://en.wikipedia.org/wiki/Vacuous_truth",
        },
        {
            label: "Material Conditional — Wikipedia",
            url: "https://en.wikipedia.org/wiki/Material_conditional",
        },
    ],
}

/** One line of a failing case, in the argument's own words. */
export interface TCounterexampleRow {
    title: string
    value: TConclusionValue
}

/**
 * State a failing case from the exhaustive check as claim titles and values,
 * never as serialized ids. A variable with no title is dropped rather than
 * shown as an id — an id tells the reader nothing. Sorted by title so two runs
 * of the same check read the same way.
 */
export function describeCounterexample(
    assignment: TCoreExpressionAssignment,
    titleByVariableId: Record<string, string>
): TCounterexampleRow[] {
    return Object.entries(assignment.variables)
        .flatMap<TCounterexampleRow>(([variableId, value]) => {
            const title = titleByVariableId[variableId]
            if (!title) return []
            const rowValue: TConclusionValue =
                value === null ? "unknown" : value ? "true" : "false"
            return [{ title, value: rowValue }]
        })
        .sort((a, b) => a.title.localeCompare(b.title))
}
