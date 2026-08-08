import {
    isContested,
    type TCorePremiseEvaluationResult,
    type TCoreArgumentEvaluationResult,
    type TCoreDerivationStep,
    type TCoreQuadrivalentValue,
    type TCoreValueOrigin,
} from "@proposit/proposit-core"
import { CONCLUSION_VALUE_LABELS, conclusionValueFor } from "./assessment.js"
import type { PropositArgumentEngine } from "../engine.js"
import type { TReviewDraft } from "../../schemas/review.js"
import { outermostDecidableOperator } from "./decision-target.js"

/**
 * Contradiction detection, localization and prose.
 *
 * The signature is **an accepted premise that evaluates false under the
 * reader's own values** — a disagreement between two things already computed,
 * so detection costs nothing beyond a scan.
 *
 * **Detection is one-sided, and that is load-bearing.** A reader who *rejects*
 * `P → Q` while holding both `P` and `Q` true has made the material
 * conditional true while denying the relationship — the normal, expected state
 * of a rejection. A two-sided "the premise's value disagrees with its verdict"
 * check would flag every rejection in the system. Only granted premises are
 * examined, and a struck one is never examined at all.
 *
 * Only `true` and `false` collide. An explicit *unknown* is a decision but not
 * an assertion of a value, and an inference the reader granted overriding it is
 * the review teaching them something rather than a collision. Nothing extra
 * enforces that: an unknown propagates as `null`, so a premise carrying one
 * cannot come out `false`. A value the reader's inputs and granted steps force
 * *both* ways is the collision in its purest form, and counts here too.
 *
 * Everything here is a pure function of the latest evaluation, so "re-check
 * after each change" is simply the caller re-evaluating — there is no cached
 * list that can go stale, and resolving one collision surfaces whatever it was
 * hiding downstream.
 */

/** Whether the premise carries an inference the reader grants, or a constraint. */
export type TPremiseKind = "inference" | "restriction"

/** One value the colliding premise reads, named the way the reader will recognize it. */
export interface TContradictionValue {
    variableId: string
    claimId?: string
    /** The claim's title. Falls back to the variable's symbol only when there is no claim behind it. */
    title: string
    value: TCoreQuadrivalentValue
    origin: TCoreValueOrigin
}

/**
 * A way out. Both are always offered: the reader may have meant a
 * case-level objection the encoding cannot hold, or may simply not have
 * noticed what accepting the premise committed them to.
 */
export interface TContradictionExit {
    kind: "reject-premise" | "change-assignment"
    label: string
    detail: string
    premiseId?: string
    /**
     * The reason code the rejection would record. Present for an inference
     * premise, where rejecting with *counterexamples exist* is the honest
     * expression of "the step generally holds, but not here".
     */
    reasonCode?: "counterexamples-exist"
    claimId?: string
    variableId?: string
}

export interface TContradiction {
    premiseId: string
    premiseTitle: string | null
    premiseKind: TPremiseKind
    /** The premise's root operator — what granting it commits the reader to. */
    operator: string
    /** The operator a decision is recorded against, for a client that offers the rejection inline. */
    decisionExpressionId?: string
    /** One sentence, chosen by operator: each one commits the reader to something different. */
    commitment: string
    values: TContradictionValue[]
    /**
     * Where each derived value came from, one sentence per derived value.
     * Without this the alert asks the reader to fix a value they never set —
     * and may push them to reject a step whose input, not whose reasoning, is
     * what they actually disagree with.
     */
    provenance: string[]
    /**
     * The premise's own operator over its operands' values, e.g. `True → False`.
     * Derivation is deliberately *not* drawn as a second arrow — two arrow
     * glyphs read as nested implication at any realistic size — so "became" is
     * stated in {@link provenance} instead.
     */
    notation: string
    exits: TContradictionExit[]
}

const OPERATOR_SYMBOLS: Record<string, string> = {
    implies: "→",
    iff: "↔",
    and: "∧",
    or: "∨",
    not: "¬",
}

const GRANTED_COMMITMENTS: Record<string, string> = {
    implies:
        "By accepting this premise you are saying there is no circumstance where {left} is true and {right} is false, however you have assigned values that contradict this.",
    iff: "By accepting this premise you are saying {left} and {right} hold exactly together, however you have assigned values where one holds without the other.",
    and: "By granting this premise you are saying every part of it holds, however you have assigned values that make at least one part false.",
    or: "By granting this premise you are saying at least one part of it holds, however you have assigned values that make every part false.",
    not: "By granting this premise you are saying the situation it rules out does not arise, however you have assigned values that produce it.",
}

const FALLBACK_COMMITMENT =
    "By granting this premise you are committing to it holding, however you have assigned values that make it false."

/** One vocabulary for values, shared with the assessment the reader sees beside this. */
function valueLabel(value: TCoreQuadrivalentValue): string {
    return CONCLUSION_VALUE_LABELS[conclusionValueFor(value)]
}

function titleForVariable(
    argEngine: PropositArgumentEngine,
    variableId: string
): string {
    const variable = argEngine.getVariable(variableId)
    if (!variable) return variableId
    const claimId = "claimId" in variable ? variable.claimId : undefined
    const title = claimId
        ? argEngine.getProjectClaim(claimId)?.title
        : undefined
    return title ?? variable.symbol
}

function claimIdForVariable(
    argEngine: PropositArgumentEngine,
    variableId: string
): string | undefined {
    const variable = argEngine.getVariable(variableId)
    return variable && "claimId" in variable ? variable.claimId : undefined
}

/** The operand labels a binary commitment sentence names, in position order. */
function operandTitles(
    argEngine: PropositArgumentEngine,
    premiseId: string,
    rootExpressionId: string | undefined
): string[] {
    const premise = argEngine.getPremise(premiseId)
    if (!premise || !rootExpressionId) return []
    return premise.getChildExpressions(rootExpressionId).map((child) => {
        if (child.type === "variable" && child.variableId) {
            return titleForVariable(argEngine, child.variableId)
        }
        // A compound operand is named by its own shape rather than a title.
        return child.operator
            ? `the ${child.operator} below it`
            : "the part below it"
    })
}

function buildNotation(
    argEngine: PropositArgumentEngine,
    premiseResult: TCorePremiseEvaluationResult,
    rootOperator: string
): string {
    const premise = argEngine.getPremise(premiseResult.premiseId)
    const rootId = premiseResult.rootExpressionId
    if (!premise || !rootId) return valueLabel(premiseResult.rootValue ?? null)
    const symbol = OPERATOR_SYMBOLS[rootOperator] ?? rootOperator
    const childLabels = premise
        .getChildExpressions(rootId)
        .map((child) =>
            valueLabel(premiseResult.expressionValues[child.id] ?? null)
        )
    if (childLabels.length === 0)
        return valueLabel(premiseResult.rootValue ?? null)
    if (childLabels.length === 1) return `${symbol}${childLabels[0]}`
    return childLabels.join(` ${symbol} `)
}

/**
 * Whether the reader supplied this variable's value themselves.
 *
 * Read from `claimAttribution` rather than from `assignment.variables`: the
 * assignment on a result is the one closure produced, so a value the reader set
 * and a granted step then contested reads back as `contested` there, losing the
 * very fact this asks about.
 */
function assertedByReader(
    evaluation: TCoreArgumentEvaluationResult,
    variableId: string
): boolean {
    return evaluation.claimAttribution?.[variableId]?.assertedByReader === true
}

/**
 * Walk a derived value back to the reader's own assertions, so the exits offer
 * the values they can actually change rather than the ones they merely see.
 */
function assertedSources(
    evaluation: TCoreArgumentEvaluationResult,
    variableId: string,
    seen = new Set<string>()
): string[] {
    if (seen.has(variableId)) return []
    seen.add(variableId)
    const provenance = evaluation.variableProvenance?.[variableId]
    if (!provenance) return []
    if (provenance.origin === "asserted") return [variableId]
    // A value held both ways has no single producing step, so walk every step
    // that contributed one of its components. The reader's own assignment is
    // not a step and never appears among them, so add it back when they made
    // one — it is the half of the collision they can change most directly.
    const contested = provenance.origin === "contested"
    const steps: TCoreDerivationStep[] = contested
        ? (provenance.contestedBy ?? [])
        : provenance.derivedBy
          ? [provenance.derivedBy]
          : []
    const readerAssigned = contested && assertedByReader(evaluation, variableId)
    return [
        ...(readerAssigned ? [variableId] : []),
        ...steps
            .flatMap((step) => step.fromVariableIds)
            .flatMap((from) => assertedSources(evaluation, from, seen)),
    ]
}

/**
 * Why a value came out both ways, in the reader's own terms: the steps that
 * contributed a component, and their own assignment when it is the other one.
 * Without this the alert states a collision and names nothing to change.
 */
function contestedSentence(
    argEngine: PropositArgumentEngine,
    evaluation: TCoreArgumentEvaluationResult,
    value: TContradictionValue
): string {
    const titles = [
        ...new Set(
            (
                evaluation.variableProvenance?.[value.variableId]
                    ?.contestedBy ?? []
            )
                .map(
                    (step) =>
                        argEngine.getPremise(step.premiseId)?.toPremiseData()
                            .title
                )
                .filter((title): title is string => (title ?? "").length > 0)
        ),
    ]
    const steps =
        titles.length > 0
            ? titles.map((title) => `“${title}”`).join(" and ")
            : "a premise you accepted"
    const halves = assertedByReader(evaluation, value.variableId)
        ? `You assigned it one way, and ${steps}, which you accepted, settles it the other.`
        : `Both values come from steps you accepted: ${steps}.`
    return `“${value.title}” comes out both true and false. ${halves} Changing either side resolves it.`
}

function provenanceSentences(
    argEngine: PropositArgumentEngine,
    evaluation: TCoreArgumentEvaluationResult,
    values: TContradictionValue[]
): string[] {
    const out: string[] = []
    for (const value of values) {
        if (isContested(value.value)) {
            out.push(contestedSentence(argEngine, evaluation, value))
            continue
        }
        if (value.origin !== "derived") continue
        const step =
            evaluation.variableProvenance?.[value.variableId]?.derivedBy
        if (!step) continue
        const producingTitle =
            argEngine.getPremise(step.premiseId)?.toPremiseData().title ??
            "a premise you accepted"
        const consumed = step.fromVariableIds
            .map((id) => titleForVariable(argEngine, id))
            .filter((title) => title.length > 0)
        const from =
            consumed.length > 0 ? ` from ${consumed.join(" and ")}` : ""
        out.push(
            `“${value.title}” became ${valueLabel(value.value)} when you accepted “${producingTitle}”${from}. You did not assign it.`
        )
    }
    return out
}

function buildExits(
    argEngine: PropositArgumentEngine,
    evaluation: TCoreArgumentEvaluationResult,
    premiseId: string,
    premiseKind: TPremiseKind,
    values: TContradictionValue[]
): TContradictionExit[] {
    const exits: TContradictionExit[] =
        premiseKind === "restriction"
            ? [
                  {
                      kind: "reject-premise",
                      premiseId,
                      label: "Decline this constraint",
                      detail: "Withholds the constraint for this review. Nothing is claimed false, so the values you assigned stay exactly as they are.",
                  },
              ]
            : [
                  {
                      kind: "reject-premise",
                      premiseId,
                      reasonCode: "counterexamples-exist",
                      label: "Reject this premise — counterexamples exist",
                      detail: "Use this when the step generally holds but not in this case. It records your case-level judgment and takes the premise out of the reckoning, without claiming anything is false.",
                  },
              ]

    // Only the reader's own assertions are directly changeable. A derived value
    // is changed by changing what produced it, so offer those instead of the
    // value the reader is looking at.
    const changeable = new Set<string>()
    for (const value of values) {
        if (value.origin === "asserted") {
            changeable.add(value.variableId)
            continue
        }
        for (const source of assertedSources(evaluation, value.variableId)) {
            changeable.add(source)
        }
    }
    for (const variableId of changeable) {
        const title = titleForVariable(argEngine, variableId)
        const value = evaluation.propagatedVariableValues?.[variableId] ?? null
        exits.push({
            kind: "change-assignment",
            label: `Change your answer for “${title}”`,
            // A value that came out both ways has no single label to report
            // back: naming one of the two as "what you assigned" would be
            // false half the time.
            detail: isContested(value)
                ? "Your answer here is one of the two values in collision."
                : `You assigned ${valueLabel(value)}.`,
            claimId: claimIdForVariable(argEngine, variableId),
            variableId,
        })
    }
    return exits
}

function buildContradiction(
    argEngine: PropositArgumentEngine,
    evaluation: TCoreArgumentEvaluationResult,
    premiseResult: TCorePremiseEvaluationResult
): TContradiction | undefined {
    const premise = argEngine.getPremise(premiseResult.premiseId)
    if (!premise) return undefined
    const rootOperator = premise.getRootExpression()?.operator ?? ""
    const premiseKind: TPremiseKind =
        premiseResult.premiseType === "constraint" ? "restriction" : "inference"

    const values: TContradictionValue[] = Object.keys(
        premiseResult.variableValues
    ).map((variableId) => ({
        variableId,
        claimId: claimIdForVariable(argEngine, variableId),
        title: titleForVariable(argEngine, variableId),
        value: premiseResult.variableValues[variableId],
        origin:
            evaluation.variableProvenance?.[variableId]?.origin ?? "unassigned",
    }))

    const [left, right] = operandTitles(
        argEngine,
        premiseResult.premiseId,
        premiseResult.rootExpressionId
    )
    const commitment = (
        GRANTED_COMMITMENTS[rootOperator] ?? FALLBACK_COMMITMENT
    )
        .replace("{left}", left ?? "the first part")
        .replace("{right}", right ?? "the second part")

    return {
        premiseId: premiseResult.premiseId,
        premiseTitle: premise.toPremiseData().title ?? null,
        premiseKind,
        operator: rootOperator,
        decisionExpressionId: outermostDecidableOperator(premise)?.id,
        commitment,
        values,
        provenance: provenanceSentences(argEngine, evaluation, values),
        notation: buildNotation(argEngine, premiseResult, rootOperator),
        exits: buildExits(
            argEngine,
            evaluation,
            premiseResult.premiseId,
            premiseKind,
            values
        ),
    }
}

export function detectContradictions(params: {
    evaluation: TCoreArgumentEvaluationResult | undefined
    argEngine: PropositArgumentEngine
    draft: TReviewDraft
}): TContradiction[] {
    const { evaluation, argEngine, draft } = params
    if (!evaluation?.ok) return []
    const struck = new Set(evaluation.struckPremiseIds ?? [])
    const accepted = new Set(
        draft.operatorAssignments
            .filter((o) => o.decision === "accepted")
            .map((o) => o.premiseId)
    )
    // The conclusion premise is a candidate like any other: `buildOperatorQueue`
    // offers it whenever it carries a decidable operator, so the reader can be
    // invited to accept the very step that collides with their own values. It
    // lives on its own field rather than in either list.
    const candidates = [
        ...(evaluation.conclusion ? [evaluation.conclusion] : []),
        ...(evaluation.supportingPremises ?? []),
        ...(evaluation.constraintPremises ?? []),
    ]
    const out: TContradiction[] = []
    for (const premiseResult of candidates) {
        if (struck.has(premiseResult.premiseId)) continue
        if (!accepted.has(premiseResult.premiseId)) continue
        // "Evaluates false" means *carries a false component*, which a
        // contested value does. Testing `=== false` alone would drop the
        // collision the moment closure starts recording both sides of it
        // instead of keeping whichever side it reached first.
        const rootValue = premiseResult.rootValue
        if (rootValue !== false && !isContested(rootValue)) continue
        const contradiction = buildContradiction(
            argEngine,
            evaluation,
            premiseResult
        )
        if (contradiction) out.push(contradiction)
    }
    return out
}

/**
 * Whether the review can be completed, and why not.
 *
 * The gate is premise-set satisfiability, which decides **whether a resolution
 * exists** — not whose fault the conflict is. A satisfiable set may have models
 * only where the reader holds things they consider factually wrong; blocking
 * them is still right, telling them they erred is not. No string here allocates
 * fault, and none may.
 */
export type TReviewCoherenceState =
    | "coherent"
    | "reader-resolvable"
    | "premises-contradict"

export interface TReviewCoherence {
    state: TReviewCoherenceState
    /** Only a conflict the reader has a resolution for stops them finishing. */
    blocksCompletion: boolean
    contradictions: TContradiction[]
    /**
     * Every variable the reader's values and granted steps force both ways,
     * straight off the evaluation. Not derivable from {@link contradictions}:
     * the forward rule transfers only the told-true component, so a contested
     * variable can yield an uncontested `true` downstream and leave every
     * aggregate — conclusion, admissibility, satisfiability, struck premises —
     * reading clean, with no contested premise root for any premise-level test
     * to find. Non-empty means show the conflict whatever else the result says.
     */
    contestedVariableIds: string[]
    /** Shown at the start of the review when the premises cannot all hold. */
    notice?: string
}

export const CONTRADICTORY_PREMISE_SET_NOTICE =
    "These premises cannot all hold at once, so nothing can be worked out from them. Your answers are still recorded, and you can finish the review."

export function reviewCoherence(params: {
    evaluation: TCoreArgumentEvaluationResult | undefined
    argEngine: PropositArgumentEngine
    draft: TReviewDraft
}): TReviewCoherence {
    const contradictions = detectContradictions(params)
    const contestedVariableIds = params.evaluation?.contestedVariableIds ?? []
    if (params.evaluation?.premiseSetSatisfiable === false) {
        // Nothing the reader assigns can satisfy this set, so they are told and
        // never blocked. Core has already switched derivation off.
        return {
            state: "premises-contradict",
            blocksCompletion: false,
            contradictions,
            contestedVariableIds,
            notice: CONTRADICTORY_PREMISE_SET_NOTICE,
        }
    }
    if (contradictions.length > 0 || contestedVariableIds.length > 0) {
        return {
            state: "reader-resolvable",
            blocksCompletion: true,
            contradictions,
            contestedVariableIds,
        }
    }
    return {
        state: "coherent",
        blocksCompletion: false,
        contradictions,
        contestedVariableIds,
    }
}
