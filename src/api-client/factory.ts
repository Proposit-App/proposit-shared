import type { TApiClientConfig } from "./config.js"

import {
    getArgumentImpl,
    publishArgumentImpl,
    resetArgumentImpl,
    hideArgumentImpl,
    unhideArgumentImpl,
    forkArgumentImpl,
    getArgumentDiffImpl,
    getArgumentForksImpl,
    getUnownedArgumentsImpl,
    getUnownedArgumentImpl,
    claimUnownedArgumentImpl,
    getAllArgumentsImpl,
    createArgumentImpl,
    importArgumentImpl,
    buildArgumentImpl,
    getLatestArgumentImpl,
    updateArgumentImpl,
    archiveArgumentImpl,
    deleteArgumentImpl,
    purgeArgumentImpl,
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
    citationImportImpl,
} from "./argument/claims.js"
import {
    getLatestClaimImpl,
    getLatestClaimVersionImpl,
    advanceClaimReferenceImpl,
} from "./argument/versioning.js"
import {
    createReactionImpl,
    getReactionImpl,
    deleteReactionImpl,
} from "./argument/reactions.js"
import {
    getArgumentOriginImpl,
    attachArgumentOriginImpl,
    updateArgumentOriginImpl,
    detachArgumentOriginImpl,
    createOriginAnchorImpl,
    deleteOriginAnchorImpl,
    markPremiseEnthymemeImpl,
    markExpressionEnthymemeImpl,
} from "./argument/origin.js"
import {
    getArgumentParticipantsImpl,
    addArgumentEditorImpl,
    removeArgumentParticipantImpl,
} from "./argument/participants.js"
import {
    createClaimReactionImpl,
    deleteClaimReactionImpl,
    getClaimReactionImpl,
    getClaimReactionMapImpl,
} from "./argument/claim-reactions.js"
import {
    createOperatorReactionImpl,
    deleteOperatorReactionImpl,
    getOperatorReactionMapImpl,
} from "./argument/operator-reactions.js"
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
import { deactivateAccountImpl } from "./user/deactivate-account.js"
import { deleteUserImpl } from "./user/delete-user.js"
import { getCurrentUserImpl } from "./user/get-current-user.js"
import { getUserCitationsImpl } from "./user/citations.js"
import { modifyCurrentUserImpl } from "./user/modify-current-user.js"
import { searchUsernameImpl } from "./user/search-username.js"
import { activateRegistrationInviteImpl } from "./user/activate-registration-invite.js"
import { issueInvitationImpl } from "./user/issue-invitation.js"
import {
    getTaskPipelineImpl,
    getTaskPipelineStagePayloadsImpl,
} from "./tasks/pipeline-status.js"
import { retryTaskImpl, retryStageImpl } from "./tasks/task-retry.js"
import { cancelTaskImpl } from "./tasks/task-cancel.js"
import { listTasksImpl } from "./tasks/task-list.js"
import {
    reportContentImpl,
    blockUserImpl,
    unblockUserImpl,
    getMyBlocksImpl,
} from "./moderation/index.js"

/**
 * Registry of all *Impl functions, keyed by the public method name.
 * `as const` keeps literal keys — crucial for the mapped-type derivation.
 */
const impls = {
    getArgument: getArgumentImpl,
    publishArgument: publishArgumentImpl,
    resetArgument: resetArgumentImpl,
    hideArgument: hideArgumentImpl,
    unhideArgument: unhideArgumentImpl,
    forkArgument: forkArgumentImpl,
    getArgumentDiff: getArgumentDiffImpl,
    getArgumentForks: getArgumentForksImpl,
    getUnownedArguments: getUnownedArgumentsImpl,
    getUnownedArgument: getUnownedArgumentImpl,
    claimUnownedArgument: claimUnownedArgumentImpl,
    getArgumentParticipants: getArgumentParticipantsImpl,
    addArgumentEditor: addArgumentEditorImpl,
    removeArgumentParticipant: removeArgumentParticipantImpl,
    getArgumentOrigin: getArgumentOriginImpl,
    attachArgumentOrigin: attachArgumentOriginImpl,
    updateArgumentOrigin: updateArgumentOriginImpl,
    detachArgumentOrigin: detachArgumentOriginImpl,
    createOriginAnchor: createOriginAnchorImpl,
    deleteOriginAnchor: deleteOriginAnchorImpl,
    markPremiseEnthymeme: markPremiseEnthymemeImpl,
    markExpressionEnthymeme: markExpressionEnthymemeImpl,
    getAllArguments: getAllArgumentsImpl,
    createArgument: createArgumentImpl,
    importArgument: importArgumentImpl,
    build: buildArgumentImpl,
    getLatestArgument: getLatestArgumentImpl,
    updateArgument: updateArgumentImpl,
    archiveArgument: archiveArgumentImpl,
    deleteArgument: deleteArgumentImpl,
    purgeArgument: purgeArgumentImpl,
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
    citationImport: citationImportImpl,
    getLatestClaim: getLatestClaimImpl,
    getLatestClaimVersion: getLatestClaimVersionImpl,
    advanceClaimReference: advanceClaimReferenceImpl,
    createReaction: createReactionImpl,
    getReaction: getReactionImpl,
    deleteReaction: deleteReactionImpl,
    createClaimReaction: createClaimReactionImpl,
    deleteClaimReaction: deleteClaimReactionImpl,
    getClaimReaction: getClaimReactionImpl,
    getClaimReactionMap: getClaimReactionMapImpl,
    createOperatorReaction: createOperatorReactionImpl,
    deleteOperatorReaction: deleteOperatorReactionImpl,
    getOperatorReactionMap: getOperatorReactionMapImpl,
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
    getCurrentUser: getCurrentUserImpl,
    modifyCurrentUser: modifyCurrentUserImpl,
    searchUsername: searchUsernameImpl,
    activateRegistrationInvite: activateRegistrationInviteImpl,
    issueInvitation: issueInvitationImpl,
    deactivateAccount: deactivateAccountImpl,
    deleteUser: deleteUserImpl,
    getTaskPipeline: getTaskPipelineImpl,
    getTaskPipelineStagePayloads: getTaskPipelineStagePayloadsImpl,
    retryTask: retryTaskImpl,
    retryStage: retryStageImpl,
    cancelTask: cancelTaskImpl,
    listTasks: listTasksImpl,
    reportContent: reportContentImpl,
    blockUser: blockUserImpl,
    unblockUser: unblockUserImpl,
    getMyBlocks: getMyBlocksImpl,
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
