import { describe, it, expect } from "vitest"
import {
    gradeEvaluation,
    type TCoreArgumentEvaluationResult,
    type TCoreEvaluationGrade,
    type TCoreTrivalentValue,
} from "@proposit/proposit-core"
import { verdictOf } from "../overlay.js"
import type { TConclusionVerdict } from "../types.js"
import type { TReviewResult } from "../../../schemas/review.js"

type TOptionalTrivalent = TCoreTrivalentValue | undefined

const TRIVALENT_VALUES: readonly TOptionalTrivalent[] = [
    true,
    false,
    null,
    undefined,
]

function buildEvaluation(params: {
    allSupportingPremisesTrue: TOptionalTrivalent
    conclusionTrue: TOptionalTrivalent
    isCounterexample: TOptionalTrivalent
    vacuous: boolean
}): TCoreArgumentEvaluationResult {
    return {
        ok: true,
        isAdmissibleAssignment: true,
        allSupportingPremisesTrue: params.allSupportingPremisesTrue,
        conclusionTrue: params.conclusionTrue,
        isCounterexample: params.isCounterexample,
        conclusion: {
            premiseId: "conclusion",
            premiseType: "inference",
            expressionValues: {},
            variableValues: {},
            inferenceDiagnostic: {
                kind: "implies",
                premiseId: "conclusion",
                rootExpressionId: "conclusionRoot",
                leftValue: params.vacuous ? false : true,
                rightValue: params.conclusionTrue ?? null,
                rootValue: params.conclusionTrue ?? null,
                antecedentTrue: params.vacuous ? false : true,
                consequentTrue: params.conclusionTrue ?? null,
                isVacuouslyTrue: params.vacuous,
                fired: params.vacuous ? false : true,
                firedAndHeld: params.vacuous
                    ? false
                    : (params.conclusionTrue ?? null),
            },
        },
    }
}

function buildResult(evaluation: TCoreArgumentEvaluationResult): TReviewResult {
    const now = new Date()
    return {
        schemaVersion: 1,
        createdAt: now,
        evaluatedAt: now,
        evaluatedFingerprint: "fp",
        evaluation,
    }
}

/**
 * Expected verdict, written from the soundness rule rather than from
 * `verdictOf`'s code: a counterexample outranks everything, a false conclusion
 * fails, and neither "Valid and Sound" nor "Vacuous" may be awarded unless the
 * supporting premises are known true.
 */
function expectedVerdict(params: {
    allSupportingPremisesTrue: TOptionalTrivalent
    conclusionTrue: TOptionalTrivalent
    isCounterexample: TOptionalTrivalent
    vacuous: boolean
}): TConclusionVerdict {
    if (params.isCounterexample === true) return "Logically Invalid"
    if (params.conclusionTrue === false) return "Failing"
    if (params.allSupportingPremisesTrue !== true) return "Indeterminate"
    if (params.conclusionTrue !== true) return "Indeterminate"
    return params.vacuous ? "Vacuous" : "Valid and Sound"
}

/**
 * The verdict that corresponds to a core grade. The two vocabularies are not
 * one-to-one: core distinguishes `unsound` / `inadmissible` / `indeterminate`,
 * all of which the verdict collapses onto "Failing" (false conclusion) or
 * "Indeterminate".
 */
function verdictForGrade(
    grade: TCoreEvaluationGrade,
    conclusionTrue: TOptionalTrivalent
): TConclusionVerdict {
    if (grade === "counterexample") return "Logically Invalid"
    if (grade === "vacuously-true") return "Vacuous"
    if (grade === "sound") return "Valid and Sound"
    return conclusionTrue === false ? "Failing" : "Indeterminate"
}

/**
 * `isCounterexample` is defined as "constraints satisfied, all supporting
 * premises true, conclusion false", so only those inputs are coherent. The
 * incoherent ones are still exercised against `verdictOf`, but they cannot be
 * compared to the core grade — the two functions order the counterexample and
 * premise checks differently, and the disagreement is unreachable in practice.
 */
function isCoherent(params: {
    allSupportingPremisesTrue: TOptionalTrivalent
    conclusionTrue: TOptionalTrivalent
    isCounterexample: TOptionalTrivalent
}): boolean {
    if (params.isCounterexample !== true) return true
    return (
        params.allSupportingPremisesTrue === true &&
        params.conclusionTrue === false
    )
}

const CASES = TRIVALENT_VALUES.flatMap((allSupportingPremisesTrue) =>
    TRIVALENT_VALUES.flatMap((conclusionTrue) =>
        TRIVALENT_VALUES.flatMap((isCounterexample) =>
            [false, true].map((vacuous) => ({
                allSupportingPremisesTrue,
                conclusionTrue,
                isCounterexample,
                vacuous,
            }))
        )
    )
)

const label = (v: TOptionalTrivalent): string =>
    v === undefined ? "undefined" : String(v)

describe("verdictOf", () => {
    it.each(
        CASES.map(
            (c) =>
                [
                    `premises=${label(c.allSupportingPremisesTrue)} conclusion=${label(c.conclusionTrue)} counterexample=${label(c.isCounterexample)} vacuous=${c.vacuous}`,
                    c,
                ] as const
        )
    )("%s", (_name, c) => {
        expect(verdictOf(buildResult(buildEvaluation(c)))).toBe(
            expectedVerdict(c)
        )
    })

    it("agrees with the core grade across the whole table", () => {
        const disagreements = CASES.filter(isCoherent).map((c) => {
            const evaluation = buildEvaluation(c)
            const grade = gradeEvaluation(evaluation).grade
            return {
                case: c,
                grade,
                verdict: verdictOf(buildResult(evaluation)),
                expected: verdictForGrade(grade, c.conclusionTrue),
            }
        })
        expect(
            disagreements.filter((d) => d.verdict !== d.expected)
        ).toStrictEqual([])
    })

    it("returns undefined without a result", () => {
        expect(verdictOf(undefined)).toBeUndefined()
    })

    it("does not award soundness when a supporting premise is unknown", () => {
        const verdict = verdictOf(
            buildResult(
                buildEvaluation({
                    allSupportingPremisesTrue: null,
                    conclusionTrue: true,
                    isCounterexample: false,
                    vacuous: false,
                })
            )
        )
        expect(verdict).toBe("Indeterminate")
    })

    it("treats an absent allSupportingPremisesTrue as unknown", () => {
        const verdict = verdictOf(
            buildResult(
                buildEvaluation({
                    allSupportingPremisesTrue: undefined,
                    conclusionTrue: true,
                    isCounterexample: false,
                    vacuous: false,
                })
            )
        )
        expect(verdict).toBe("Indeterminate")
    })

    it("does not award a vacuous verdict when the premises are unknown", () => {
        const verdict = verdictOf(
            buildResult(
                buildEvaluation({
                    allSupportingPremisesTrue: null,
                    conclusionTrue: true,
                    isCounterexample: false,
                    vacuous: true,
                })
            )
        )
        expect(verdict).toBe("Indeterminate")
    })

    it("still awards soundness when every supporting premise is true", () => {
        const verdict = verdictOf(
            buildResult(
                buildEvaluation({
                    allSupportingPremisesTrue: true,
                    conclusionTrue: true,
                    isCounterexample: false,
                    vacuous: false,
                })
            )
        )
        expect(verdict).toBe("Valid and Sound")
    })
})
