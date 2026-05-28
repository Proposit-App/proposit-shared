import type { TApiClientConfig } from "./config.js"

import {
    getArgumentImpl,
    publishArgumentImpl,
    resetArgumentImpl,
    forkArgumentImpl,
    getArgumentDiffImpl,
    getArgumentForksImpl,
    claimUnownedArgumentImpl,
    getAllArgumentsImpl,
    createArgumentImpl,
    getLatestArgumentImpl,
    updateArgumentImpl,
    archiveArgumentImpl,
    deleteArgumentImpl,
    getEntireArgumentImpl,
} from "./argument/index.js"
import {
    provisionArgumentImpl,
    createExpressionWithOperatorImpl,
    changeEdgeOperatorImpl,
} from "./argument/batch.js"
import {
    createClaimImpl,
    deleteClaimImpl,
    updateClaimImpl,
    createClaimCitationImpl,
    deleteClaimCitationImpl,
    createClaimAxiomImpl,
} from "./argument/claims.js"
import { createReactionImpl, deleteReactionImpl } from "./argument/reactions.js"
import {
    getMyReviewImpl,
    createReviewRemoteImpl,
    getReviewByIdRemoteImpl,
    patchReviewRemoteImpl,
    deleteReviewRemoteImpl,
    setReviewVisibilityImpl,
} from "./argument/reviews.js"
import {
    getLogicDataImpl,
    getPremisesImpl,
    createPremiseImpl,
    updatePremiseImpl,
    deletePremiseImpl,
    getPremiseImpl,
    getExpressionsImpl,
    createExpressionImpl,
    updateExpressionImpl,
    deleteExpressionImpl,
    getExpressionImpl,
    toggleNegationImpl,
    getVariablesImpl,
    createVariableImpl,
    updateVariableImpl,
    deleteVariableImpl,
    getVariableImpl,
} from "./argument/logic/index.js"
import { repairArgumentImpl } from "./argument/logic/repair.js"
import {
    searchUserClaimsImpl,
    searchUserCitationsImpl,
    searchUserEntitiesImpl,
} from "./search.js"
import { getUserClaimsImpl } from "./user/claims.js"
import { deleteUserImpl } from "./user/delete-user.js"
import { getUserCitationsImpl } from "./user/citations.js"
import {
    getTaskPipelineImpl,
    getTaskPipelineStagePayloadsImpl,
} from "./tasks/pipeline-status.js"
import { retryTaskImpl, retryStageImpl } from "./tasks/task-retry.js"

/**
 * Registry of all *Impl functions, keyed by the public method name.
 * `as const` keeps literal keys — crucial for the mapped-type derivation.
 */
const impls = {
    getArgument: getArgumentImpl,
    publishArgument: publishArgumentImpl,
    resetArgument: resetArgumentImpl,
    forkArgument: forkArgumentImpl,
    getArgumentDiff: getArgumentDiffImpl,
    getArgumentForks: getArgumentForksImpl,
    claimUnownedArgument: claimUnownedArgumentImpl,
    getAllArguments: getAllArgumentsImpl,
    createArgument: createArgumentImpl,
    getLatestArgument: getLatestArgumentImpl,
    updateArgument: updateArgumentImpl,
    archiveArgument: archiveArgumentImpl,
    deleteArgument: deleteArgumentImpl,
    getEntireArgument: getEntireArgumentImpl,
    provisionArgument: provisionArgumentImpl,
    createExpressionWithOperator: createExpressionWithOperatorImpl,
    changeEdgeOperator: changeEdgeOperatorImpl,
    createClaim: createClaimImpl,
    deleteClaim: deleteClaimImpl,
    updateClaim: updateClaimImpl,
    createClaimCitation: createClaimCitationImpl,
    deleteClaimCitation: deleteClaimCitationImpl,
    createClaimAxiom: createClaimAxiomImpl,
    createReaction: createReactionImpl,
    deleteReaction: deleteReactionImpl,
    getMyReview: getMyReviewImpl,
    createReviewRemote: createReviewRemoteImpl,
    getReviewByIdRemote: getReviewByIdRemoteImpl,
    patchReviewRemote: patchReviewRemoteImpl,
    deleteReviewRemote: deleteReviewRemoteImpl,
    setReviewVisibility: setReviewVisibilityImpl,
    getLogicData: getLogicDataImpl,
    getPremises: getPremisesImpl,
    createPremise: createPremiseImpl,
    updatePremise: updatePremiseImpl,
    deletePremise: deletePremiseImpl,
    getPremise: getPremiseImpl,
    getExpressions: getExpressionsImpl,
    createExpression: createExpressionImpl,
    updateExpression: updateExpressionImpl,
    deleteExpression: deleteExpressionImpl,
    getExpression: getExpressionImpl,
    toggleNegation: toggleNegationImpl,
    getVariables: getVariablesImpl,
    createVariable: createVariableImpl,
    updateVariable: updateVariableImpl,
    deleteVariable: deleteVariableImpl,
    getVariable: getVariableImpl,
    repairArgument: repairArgumentImpl,
    searchUserClaims: searchUserClaimsImpl,
    searchUserCitations: searchUserCitationsImpl,
    searchUserEntities: searchUserEntitiesImpl,
    getUserClaims: getUserClaimsImpl,
    getUserCitations: getUserCitationsImpl,
    deleteUser: deleteUserImpl,
    getTaskPipeline: getTaskPipelineImpl,
    getTaskPipelineStagePayloads: getTaskPipelineStagePayloadsImpl,
    retryTask: retryTaskImpl,
    retryStage: retryStageImpl,
} as const

/**
 * Strips the leading `config: TApiClientConfig` argument from a function type.
 */
type TStripConfig<F> = F extends (
    config: TApiClientConfig,
    ...rest: infer Rest
) => infer Ret
    ? (...rest: Rest) => Ret
    : never

export type TApiClient = {
    [K in keyof typeof impls]: TStripConfig<(typeof impls)[K]>
}

export function createApiClient(config: TApiClientConfig): TApiClient {
    // Rebind fetchImpl to globalThis so browser `fetch` doesn't throw
    // "Illegal invocation" when called as `config.fetchImpl(...)` — the DOM
    // fetch checks `this === window`. Harmless for arrow-wrapped fetches
    // (their lexical `this` can't be rebound) and for Node fetch.
    const boundConfig: TApiClientConfig = {
        ...config,
        fetchImpl: config.fetchImpl.bind(globalThis),
    }
    const client = {} as Record<string, unknown>
    for (const [name, impl] of Object.entries(impls)) {
        client[name] = (...args: unknown[]): unknown =>
            (impl as (...a: unknown[]) => unknown)(boundConfig, ...args)
    }
    return client as TApiClient
}
