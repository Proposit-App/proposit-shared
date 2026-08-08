import { Type, type Static } from "typebox"
import { UUID, EncodableDate } from "./common.js"

// Kleene value (mirrors proposit-core's TCoreTrivalentValue). This is what a
// reader may assign, and it stays three-valued.
export const TrivalentValueSchema = Type.Union([Type.Boolean(), Type.Null()])
export type TTrivalentValue = Static<typeof TrivalentValueSchema>

/**
 * What evaluation may *produce* (mirrors proposit-core's
 * `TCoreQuadrivalentValue`): the three above plus `"contested"`, which a value
 * takes when the reader's inputs and the steps they granted force it both true
 * and false. Only evaluation reaches it, so it appears in the result mirror
 * below and never in an assignment a reader writes.
 */
export const QuadrivalentValueSchema = Type.Union([
    Type.Boolean(),
    Type.Null(),
    Type.Literal("contested"),
])
export type TQuadrivalentValue = Static<typeof QuadrivalentValueSchema>

// Claim → true (7 codes)
export const ClaimTrueReasonCodeSchema = Type.Union([
    Type.Literal("common-knowledge"),
    Type.Literal("well-supported-by-sources"),
    Type.Literal("definitionally-true"),
    Type.Literal("expert-consensus"),
    Type.Literal("empirically-verified"),
    Type.Literal("historically-established"),
    Type.Literal("logically-necessary"),
])
// Claim → false (8 codes)
export const ClaimFalseReasonCodeSchema = Type.Union([
    Type.Literal("factually-incorrect"),
    Type.Literal("contradicts-expert-consensus"),
    Type.Literal("hyperbole"),
    Type.Literal("proven-false-elsewhere"),
    Type.Literal("logical-contradiction"),
    Type.Literal("strawman"),
    Type.Literal("equivocation"),
    Type.Literal("category-error"),
])
// Claim → unknown (8 codes)
export const ClaimUnknownReasonCodeSchema = Type.Union([
    Type.Literal("insufficient-evidence"),
    Type.Literal("unknowable"),
    Type.Literal("speculation"),
    Type.Literal("matter-of-opinion"),
    Type.Literal("ambiguous-wording"),
    Type.Literal("too-vague"),
    Type.Literal("context-dependent"),
    Type.Literal("expert-dispute"),
])
// Operator → accepted (5 codes)
export const OperatorAcceptReasonCodeSchema = Type.Union([
    Type.Literal("entailment-holds"),
    Type.Literal("sound-causal-mechanism"),
    Type.Literal("strong-inductive-support"),
    Type.Literal("true-by-definition"),
    Type.Literal("well-established-inference"),
])
// Operator → rejected (7 codes)
export const OperatorRejectReasonCodeSchema = Type.Union([
    Type.Literal("non-sequitur"),
    Type.Literal("correlation-not-causation"),
    Type.Literal("hasty-generalization"),
    Type.Literal("counterexamples-exist"),
    Type.Literal("false-dichotomy"),
    Type.Literal("equivocation-across-link"),
    Type.Literal("circular-inference"),
])

export const ClaimReasonCodeSchema = Type.Union([
    ClaimTrueReasonCodeSchema,
    ClaimFalseReasonCodeSchema,
    ClaimUnknownReasonCodeSchema,
])
export const OperatorReasonCodeSchema = Type.Union([
    OperatorAcceptReasonCodeSchema,
    OperatorRejectReasonCodeSchema,
])
export type TClaimTrueReasonCode = Static<typeof ClaimTrueReasonCodeSchema>
export type TClaimFalseReasonCode = Static<typeof ClaimFalseReasonCodeSchema>
export type TClaimUnknownReasonCode = Static<
    typeof ClaimUnknownReasonCodeSchema
>
export type TOperatorAcceptReasonCode = Static<
    typeof OperatorAcceptReasonCodeSchema
>
export type TOperatorRejectReasonCode = Static<
    typeof OperatorRejectReasonCodeSchema
>
export type TClaimReasonCode = Static<typeof ClaimReasonCodeSchema>
export type TOperatorReasonCode = Static<typeof OperatorReasonCodeSchema>

// ---- Assignments ----
// Absence of a claimId key in claimAssignments = never touched.
// Presence with skipped: true = deferred. Presence with a concrete value = decided.
export const ClaimAssignmentSchema = Type.Object({
    assignmentId: UUID,
    claimId: UUID,
    value: TrivalentValueSchema,
    reasonCode: Type.Optional(ClaimReasonCodeSchema),
    skipped: Type.Boolean(),
    decidedAt: EncodableDate,
})
export type TClaimAssignment = Static<typeof ClaimAssignmentSchema>

export const OperatorAssignmentSchema = Type.Object({
    assignmentId: UUID,
    premiseId: UUID,
    expressionId: Type.Optional(UUID),
    scope: Type.Union([Type.Literal("premise"), Type.Literal("expression")]),
    decision: Type.Union([Type.Literal("accepted"), Type.Literal("rejected")]),
    reasonCode: Type.Optional(OperatorReasonCodeSchema),
    decidedAt: EncodableDate,
})
export type TOperatorAssignment = Static<typeof OperatorAssignmentSchema>

/**
 * `blocked` is the results step acting as the coherence gate: the reader
 * reached it and the review contains a contradiction they have a resolution
 * for. It is a state of the *review*, never a value in the assessment
 * vocabulary — a blocked review simply has no assessment yet, exactly like an
 * in-progress one, so no consumer has to interpret a reviewer's bookkeeping and
 * an incoherent review can never masquerade as a legitimate negative verdict.
 *
 * `done` remains the persisted completion signal, so a blocked review can never
 * be counted as finished.
 */
export const ReviewPhaseSchema = Type.Union([
    Type.Literal("claims"),
    Type.Literal("operators"),
    Type.Literal("blocked"),
    Type.Literal("done"),
])
export type TReviewPhase = Static<typeof ReviewPhaseSchema>

export const ReviewDraftSchema = Type.Object({
    schemaVersion: Type.Literal(1),
    reviewId: UUID,
    argumentId: UUID,
    argumentVersion: Type.Number(),
    userId: Type.Optional(UUID),
    createdAt: EncodableDate,
    updatedAt: EncodableDate,
    phase: ReviewPhaseSchema,
    currentStepIndex: Type.Integer({ minimum: 0 }),
    claimAssignments: Type.Record(UUID, ClaimAssignmentSchema),
    operatorAssignments: Type.Array(OperatorAssignmentSchema),
})
export type TReviewDraft = Static<typeof ReviewDraftSchema>

// ---- Core evaluation result mirror (full) ----
// Mirrors @proposit/proposit-core dist/lib/types/evaluation.d.ts.
// Snapshot-tested against a real core evaluation result.

// TCoreValidationCode enum (18 literals — mirrors core@1.0.0).
//
// Core 1.0 deleted `DERIVATION_STRUCTURE_INVALID_AT_EVALUATION`
// (the pre-1.0 evaluation-time throw on naked-Q derivation premises);
// naked-Q is now an evaluation no-op per spec §4.2, and broken-tree
// derivation premises continue to surface as the unchanged
// `DERIVATION_STRUCTURE_INVALID` code. This schema must match core's
// runtime emitter exactly — keep the literal list synchronized when
// bumping `@proposit/proposit-core`.
export const TCoreValidationCodeSchema = Type.Union([
    Type.Literal("ARGUMENT_NO_CONCLUSION"),
    Type.Literal("ARGUMENT_CONCLUSION_NOT_FOUND"),
    Type.Literal("ARGUMENT_VARIABLE_ID_SYMBOL_MISMATCH"),
    Type.Literal("ARGUMENT_VARIABLE_SYMBOL_AMBIGUOUS"),
    Type.Literal("PREMISE_EMPTY"),
    Type.Literal("PREMISE_ROOT_MISSING"),
    Type.Literal("PREMISE_ROOT_MISMATCH"),
    Type.Literal("EXPR_CHILD_COUNT_INVALID"),
    Type.Literal("EXPR_BINARY_POSITIONS_INVALID"),
    Type.Literal("EXPR_VARIABLE_UNDECLARED"),
    Type.Literal("ASSIGNMENT_MISSING_VARIABLE"),
    Type.Literal("ASSIGNMENT_UNKNOWN_VARIABLE"),
    Type.Literal("SOURCE_VARIABLE_ASSOCIATION_INVALID_VARIABLE"),
    Type.Literal("SOURCE_EXPRESSION_ASSOCIATION_INVALID_PREMISE"),
    Type.Literal("SOURCE_EXPRESSION_ASSOCIATION_INVALID_EXPRESSION"),
    Type.Literal("SOURCE_ORPHANED"),
    Type.Literal("EXPR_BOUND_PREMISE_EMPTY"),
    Type.Literal("DERIVATION_STRUCTURE_INVALID"),
])

export const TCoreValidationIssueSchema = Type.Object({
    code: TCoreValidationCodeSchema,
    severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]),
    message: Type.String(),
    premiseId: Type.Optional(Type.String()),
    expressionId: Type.Optional(Type.String()),
    variableId: Type.Optional(Type.String()),
})
export const TCoreValidationResultSchema = Type.Object({
    ok: Type.Boolean(),
    issues: Type.Array(TCoreValidationIssueSchema),
})

export const TCoreDirectionalVacuitySchema = Type.Object({
    antecedentTrue: QuadrivalentValueSchema,
    consequentTrue: QuadrivalentValueSchema,
    implicationValue: QuadrivalentValueSchema,
    isVacuouslyTrue: QuadrivalentValueSchema,
    fired: QuadrivalentValueSchema,
})

export const TCorePremiseInferenceDiagnosticSchema = Type.Union([
    Type.Object({
        kind: Type.Literal("implies"),
        premiseId: Type.String(),
        rootExpressionId: Type.String(),
        leftValue: QuadrivalentValueSchema,
        rightValue: QuadrivalentValueSchema,
        rootValue: QuadrivalentValueSchema,
        antecedentTrue: QuadrivalentValueSchema,
        consequentTrue: QuadrivalentValueSchema,
        isVacuouslyTrue: QuadrivalentValueSchema,
        fired: QuadrivalentValueSchema,
        firedAndHeld: QuadrivalentValueSchema,
    }),
    Type.Object({
        kind: Type.Literal("iff"),
        premiseId: Type.String(),
        rootExpressionId: Type.String(),
        leftValue: QuadrivalentValueSchema,
        rightValue: QuadrivalentValueSchema,
        rootValue: QuadrivalentValueSchema,
        leftToRight: TCoreDirectionalVacuitySchema,
        rightToLeft: TCoreDirectionalVacuitySchema,
        bothSidesTrue: QuadrivalentValueSchema,
        bothSidesFalse: QuadrivalentValueSchema,
    }),
])

export const TCorePremiseEvaluationResultSchema = Type.Object({
    premiseId: Type.String(),
    premiseType: Type.Union([
        Type.Literal("inference"),
        Type.Literal("constraint"),
    ]),
    rootExpressionId: Type.Optional(Type.String()),
    rootValue: Type.Optional(QuadrivalentValueSchema),
    expressionValues: Type.Record(Type.String(), QuadrivalentValueSchema),
    variableValues: Type.Record(Type.String(), QuadrivalentValueSchema),
    inferenceDiagnostic: Type.Optional(TCorePremiseInferenceDiagnosticSchema),
})

/** An assignment as a reader writes it: three-valued throughout. */
export const TCoreExpressionAssignmentSchema = Type.Object({
    variables: Type.Record(Type.String(), TrivalentValueSchema),
    operatorAssignments: Type.Record(
        Type.String(),
        Type.Union([Type.Literal("accepted"), Type.Literal("rejected")])
    ),
})

/**
 * An assignment as evaluation hands it back, with closure applied — the same
 * shape with four-valued variables. Every assignment a reader writes is a valid
 * one of these; the reverse does not hold.
 */
export const TCoreResolvedAssignmentSchema = Type.Object({
    variables: Type.Record(Type.String(), QuadrivalentValueSchema),
    operatorAssignments: Type.Record(
        Type.String(),
        Type.Union([Type.Literal("accepted"), Type.Literal("rejected")])
    ),
})

/** Was a value supplied by the reader, and does it hold once that is withheld. */
export const ValueAttributionSchema = Type.Object({
    assertedByReader: Type.Boolean(),
    reachedWithoutAssertion: Type.Boolean(),
})

export const ValueOriginSchema = Type.Union([
    Type.Literal("asserted"),
    Type.Literal("derived"),
    Type.Literal("contested"),
    Type.Literal("unassigned"),
])

export const DerivationStepSchema = Type.Object({
    expressionId: Type.String(),
    premiseId: Type.String(),
    fromVariableIds: Type.Array(Type.String()),
})

export const VariableProvenanceSchema = Type.Object({
    value: QuadrivalentValueSchema,
    origin: ValueOriginSchema,
    /** Present iff `origin === "derived"` — one step cannot be named once two disagree. */
    derivedBy: Type.Optional(DerivationStepSchema),
    /** Present iff `origin === "contested"`: every granted step that contributed a truth component. */
    contestedBy: Type.Optional(Type.Array(DerivationStepSchema)),
})

export const TCoreArgumentEvaluationResultSchema = Type.Object({
    ok: Type.Boolean(),
    validation: Type.Optional(TCoreValidationResultSchema),
    assignment: Type.Optional(TCoreResolvedAssignmentSchema),
    referencedVariableIds: Type.Optional(Type.Array(Type.String())),
    conclusion: Type.Optional(TCorePremiseEvaluationResultSchema),
    supportingPremises: Type.Optional(
        Type.Array(TCorePremiseEvaluationResultSchema)
    ),
    constraintPremises: Type.Optional(
        Type.Array(TCorePremiseEvaluationResultSchema)
    ),
    isAdmissibleAssignment: Type.Optional(QuadrivalentValueSchema),
    // Premises the reader struck by rejecting an operator inside them. They
    // stay in `supportingPremises` / `constraintPremises` so a consumer can
    // render them crossed out; they are excluded from every aggregate.
    struckPremiseIds: Type.Optional(Type.Array(Type.String())),
    survivingSupportingPremiseCount: Type.Optional(Type.Number()),
    // Vacuously true when every supporting premise is struck — read together
    // with `survivingSupportingPremiseCount`, never as "the argument worked".
    survivingSupportingPremisesTrue: Type.Optional(QuadrivalentValueSchema),
    conclusionTrue: Type.Optional(QuadrivalentValueSchema),
    premisesHoldConclusionFalse: Type.Optional(QuadrivalentValueSchema),
    conclusionAttribution: Type.Optional(ValueAttributionSchema),
    claimAttribution: Type.Optional(
        Type.Record(Type.String(), ValueAttributionSchema)
    ),
    // `null` means "not determined" — more free variables than the search
    // ceiling. `false` means the surviving premises contradict each other and
    // nothing is derived.
    premiseSetSatisfiable: Type.Optional(TrivalentValueSchema),
    // Argument-wide propagated-variable map (proposit-core 0.9.0+).
    // Populated when evaluateArgument is called with includeDiagnostics: true.
    // Key set = referencedVariableIds (claim-bound and externally-bound).
    propagatedVariableValues: Type.Optional(
        Type.Record(Type.String(), QuadrivalentValueSchema)
    ),
    variableProvenance: Type.Optional(
        Type.Record(Type.String(), VariableProvenanceSchema)
    ),
})

export const TCoreCounterexampleSchema = Type.Object({
    assignment: TCoreResolvedAssignmentSchema,
    result: TCoreArgumentEvaluationResultSchema,
})
export const TCoreValidityCheckResultSchema = Type.Object({
    ok: Type.Boolean(),
    validation: Type.Optional(TCoreValidationResultSchema),
    isValid: Type.Optional(Type.Boolean()),
    checkedVariableIds: Type.Optional(Type.Array(Type.String())),
    numAssignmentsChecked: Type.Optional(Type.Number()),
    numAdmissibleAssignments: Type.Optional(Type.Number()),
    counterexamples: Type.Optional(Type.Array(TCoreCounterexampleSchema)),
    truncated: Type.Optional(Type.Boolean()),
})

// ---- Review result (fingerprint used by stale-banner logic) ----
export const ReviewResultSchema = Type.Object({
    schemaVersion: Type.Literal(1),
    createdAt: EncodableDate,
    evaluatedAt: EncodableDate,
    evaluatedFingerprint: Type.String(),
    evaluation: TCoreArgumentEvaluationResultSchema,
    validityCheck: Type.Optional(TCoreValidityCheckResultSchema),
})
export type TReviewResult = Static<typeof ReviewResultSchema>

export const ReviewStateSchema = Type.Object({
    draft: ReviewDraftSchema,
    lastResult: Type.Optional(ReviewResultSchema),
})
export type TReviewState = Static<typeof ReviewStateSchema>
