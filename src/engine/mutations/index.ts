export { mergeChangesets } from "./types.js"
export type {
    ProjectEngine,
    ProjectChangeset,
    ProjectMutationResult,
} from "./types.js"

export {
    mutateCreatePremise,
    mutateUpdatePremiseRole,
    mutateUpdatePremiseExtras,
    mutateDeletePremise,
    mutateCreateDerivationPremise,
    clearDerivationAntecedent,
    populateDerivationFromCitations,
    populateDerivationFromAxiom,
} from "./premises.js"

export {
    mutateCreateExpression,
    mutateUpdateExpression,
    mutateDeleteExpression,
    mutateToggleNegation,
    mutateChangeOperator,
    mutateAddSiblingExpression,
    mutateWrapExpression,
    mutateCreateExpressionWithOperator,
} from "./expressions.js"

export {
    mutateCreateVariable,
    mutateUpdateVariable,
    mutateDeleteVariable,
} from "./variables.js"

export {
    mutateSetClaim,
    mutateUpdateClaim,
    mutateRemoveClaimWithCascade,
} from "./claims.js"
