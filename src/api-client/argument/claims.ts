import type {
    TMutableClaimFields,
    TClaimUpdateFields,
} from "../../schemas/model/claims.js"
import { ClaimSchema, ClaimUpdateRequestSchema } from "../../schemas/model.js"
import {
    ClaimCreationRequestSchema,
    ClaimCreationResponseSchema,
    ClaimDeletionResponseSchema,
    ClaimCitationDeleteResponseSchema,
    CitationCreationSchema,
} from "../../schemas/api/argument/claims.js"
import {
    IEEEReferenceSchemaMap,
    type TIEEEReference,
} from "../../schemas/model/references.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function createClaimImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    claimData: TMutableClaimFields
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/claims`,
        { method: "POST" },
        { claimData },
        ClaimCreationRequestSchema,
        ClaimCreationResponseSchema,
        config.fetchImpl
    )
}

export async function deleteClaimImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    claimId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/claims/${claimId}`,
            { method: "DELETE" }
        ),
        ClaimDeletionResponseSchema
    )
}

export async function updateClaimImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    claimId: string,
    data: TClaimUpdateFields
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/claims/${claimId}`,
        { method: "PUT" },
        { ...data },
        ClaimUpdateRequestSchema,
        ClaimSchema,
        config.fetchImpl
    )
}

export async function createClaimCitationImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    citingClaimId: string,
    citation: TIEEEReference
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/claims/${citingClaimId}/citation`,
        { method: "POST" },
        citation,
        IEEEReferenceSchemaMap[citation.type],
        CitationCreationSchema,
        config.fetchImpl
    )
}

export async function deleteClaimCitationImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    edgeId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/citations/${edgeId}`,
            { method: "DELETE" }
        ),
        ClaimCitationDeleteResponseSchema
    )
}
