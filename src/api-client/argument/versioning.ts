import type { JsonObject } from "../../schemas/common.js"
import {
    ClaimLatestVersionResponseSchema,
    AdvanceClaimReferenceRequestSchema,
    AdvanceClaimReferenceResponseSchema,
} from "../../schemas/api/argument/versioning.js"
import { ClaimSchema } from "../../schemas/model/claims.js"
import { strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

/**
 * `GET /api/v1/claim/[claimId]/latest`
 *
 * Returns the full claim object at its highest published version. The response
 * IS a claim, so it is validated against `ClaimSchema` on the way out.
 */
export async function getLatestClaimImpl(
    config: TApiClientConfig,
    claimId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/claim/${claimId}/latest`,
        { method: "GET" },
        undefined,
        undefined,
        ClaimSchema,
        config.fetchImpl
    )
}

/**
 * `GET /api/v1/claim/[claimId]/latest-version?pinned=<number>`
 *
 * Reports the claim trunk's latest published version and whether it is newer
 * than the `pinned` version the caller currently references. Omit `pinned` to
 * just learn the latest published head (`hasNewer` is then `false`).
 */
export async function getLatestClaimVersionImpl(
    config: TApiClientConfig,
    claimId: string,
    pinned?: number
) {
    const baseUrl = resolveBaseUrl(config)
    let uri = `${baseUrl}/api/v1/claim/${claimId}/latest-version`
    if (pinned !== undefined) {
        const params = new URLSearchParams({ pinned: String(pinned) })
        uri = `${uri}?${params.toString()}`
    }
    return await strictFetch(
        uri,
        { method: "GET" },
        undefined,
        undefined,
        ClaimLatestVersionResponseSchema,
        config.fetchImpl
    )
}

/**
 * `POST /api/v1/argument/[argumentId]/[version]/claim/[claimId]/advance`
 *
 * Repins the draft argument's variable(s) referencing the claim to a newer
 * published version. Omit `toVersion` to advance to the claim's latest
 * published head; supply it to repin to an explicit target version.
 */
export async function advanceClaimReferenceImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    claimId: string,
    toVersion?: number
) {
    const baseUrl = resolveBaseUrl(config)
    const payload: JsonObject = {}
    if (toVersion !== undefined) payload.toVersion = toVersion
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/claim/${claimId}/advance`,
        { method: "POST" },
        payload,
        AdvanceClaimReferenceRequestSchema,
        AdvanceClaimReferenceResponseSchema,
        config.fetchImpl
    )
}
