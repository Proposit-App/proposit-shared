import {
    OperatorReactionCreateRequest,
    OperatorReactionCreateResponse,
    OperatorReactionDeleteResponse,
    OperatorReactionMapResponse,
    type TOperatorReactionCreateRequest,
} from "../../schemas/api/operator-reaction/index.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

/**
 * Premise (operator) reactions — how readers decided each premise on the
 * reading surface. The premise-level peer of `./claim-reactions.js`, and shaped
 * like it: a single-premise write pair plus a per-argument bulk read, so a
 * reading surface can seed every premise header in one request.
 *
 * These are reactions, not review-draft assignments. The two stores are
 * independent by design and neither writes to the other.
 */

export async function createOperatorReactionImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    premiseId: string,
    data: TOperatorReactionCreateRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/premise/${premiseId}/reactions`,
        { method: "POST" },
        data,
        OperatorReactionCreateRequest,
        OperatorReactionCreateResponse,
        config.fetchImpl
    )
}

/**
 * Retract the caller's own decision. Addressed by natural key — the reaction is
 * single-select per (argument version, premise, caller) — so no reaction id
 * travels in the path.
 */
export async function deleteOperatorReactionImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    premiseId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/premise/${premiseId}/reactions`,
            { method: "DELETE" }
        ),
        OperatorReactionDeleteResponse
    )
}

/**
 * Every decided premise's state for one argument version, keyed by premiseId.
 * A premise nobody has decided is absent from the map rather than present with
 * zeroed counts — the caller supplies its own empty default.
 */
export async function getOperatorReactionMapImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/premise-reactions`,
            { method: "GET" }
        ),
        OperatorReactionMapResponse
    )
}
