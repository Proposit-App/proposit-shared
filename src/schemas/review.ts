import { Type, type Static } from "typebox"
import { UUID, EncodableDate } from "./common.js"

// Kleene value (mirrors proposit-core's TCoreTrivalentValue)
export const TrivalentValueSchema = Type.Union([Type.Boolean(), Type.Null()])
export type TTrivalentValue = Static<typeof TrivalentValueSchema>

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

export const ReviewPhaseSchema = Type.Union([
    Type.Literal("claims"),
    Type.Literal("operators"),
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
// Snapshot-tested against a real core evaluation result in Task G1.

// TCoreValidationCode enum (17 literals)
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
    antecedentTrue: TrivalentValueSchema,
    consequentTrue: TrivalentValueSchema,
    implicationValue: TrivalentValueSchema,
    isVacuouslyTrue: TrivalentValueSchema,
    fired: TrivalentValueSchema,
})

export const TCorePremiseInferenceDiagnosticSchema = Type.Union([
    Type.Object({
        kind: Type.Literal("implies"),
        premiseId: Type.String(),
        rootExpressionId: Type.String(),
        leftValue: TrivalentValueSchema,
        rightValue: TrivalentValueSchema,
        rootValue: TrivalentValueSchema,
        antecedentTrue: TrivalentValueSchema,
        consequentTrue: TrivalentValueSchema,
        isVacuouslyTrue: TrivalentValueSchema,
        fired: TrivalentValueSchema,
        firedAndHeld: TrivalentValueSchema,
    }),
    Type.Object({
        kind: Type.Literal("iff"),
        premiseId: Type.String(),
        rootExpressionId: Type.String(),
        leftValue: TrivalentValueSchema,
        rightValue: TrivalentValueSchema,
        rootValue: TrivalentValueSchema,
        leftToRight: TCoreDirectionalVacuitySchema,
        rightToLeft: TCoreDirectionalVacuitySchema,
        bothSidesTrue: TrivalentValueSchema,
        bothSidesFalse: TrivalentValueSchema,
    }),
])

export const TCorePremiseEvaluationResultSchema = Type.Object({
    premiseId: Type.String(),
    premiseType: Type.Union([
        Type.Literal("inference"),
        Type.Literal("constraint"),
    ]),
    rootExpressionId: Type.Optional(Type.String()),
    rootValue: Type.Optional(TrivalentValueSchema),
    expressionValues: Type.Record(Type.String(), TrivalentValueSchema),
    variableValues: Type.Record(Type.String(), TrivalentValueSchema),
    inferenceDiagnostic: Type.Optional(TCorePremiseInferenceDiagnosticSchema),
})

export const TCoreExpressionAssignmentSchema = Type.Object({
    variables: Type.Record(Type.String(), TrivalentValueSchema),
    operatorAssignments: Type.Record(
        Type.String(),
        Type.Union([Type.Literal("accepted"), Type.Literal("rejected")])
    ),
})

export const TCoreArgumentEvaluationResultSchema = Type.Object({
    ok: Type.Boolean(),
    validation: Type.Optional(TCoreValidationResultSchema),
    assignment: Type.Optional(TCoreExpressionAssignmentSchema),
    referencedVariableIds: Type.Optional(Type.Array(Type.String())),
    conclusion: Type.Optional(TCorePremiseEvaluationResultSchema),
    supportingPremises: Type.Optional(
        Type.Array(TCorePremiseEvaluationResultSchema)
    ),
    constraintPremises: Type.Optional(
        Type.Array(TCorePremiseEvaluationResultSchema)
    ),
    isAdmissibleAssignment: Type.Optional(TrivalentValueSchema),
    allSupportingPremisesTrue: Type.Optional(TrivalentValueSchema),
    conclusionTrue: Type.Optional(TrivalentValueSchema),
    isCounterexample: Type.Optional(TrivalentValueSchema),
    preservesTruthUnderAssignment: Type.Optional(TrivalentValueSchema),
    // Argument-wide propagated-variable map (proposit-core 0.9.0+).
    // Populated when evaluateArgument is called with includeDiagnostics: true.
    // Key set = referencedVariableIds (claim-bound and externally-bound).
    propagatedVariableValues: Type.Optional(
        Type.Record(Type.String(), TrivalentValueSchema)
    ),
})

export const TCoreCounterexampleSchema = Type.Object({
    assignment: TCoreExpressionAssignmentSchema,
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
