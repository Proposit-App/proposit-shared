import type {
    TMutableClaimFields,
    TClaimUpdateFields,
} from "../../schemas/model/claims.js"
import { ClaimSchema, ClaimUpdateRequestSchema } from "../../schemas/model.js"
import {
    ClaimCreationRequestSchema,
    ClaimCreationResponseSchema,
    ClaimDeletionResponseSchema,
    ClaimSourceDeleteResponseSchema,
    SourceCreationSchema,
} from "../../schemas/api/argument/claims.js"
import {
    IEEEReferenceSchemaMap,
    type TIEEEReference,
} from "../../schemas/model/references.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"

export async function createClaim(
    argumentId: string,
    version: number,
    claimData: TMutableClaimFields,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/claims`,
        { method: "POST" },
        { claimData },
        ClaimCreationRequestSchema,
        ClaimCreationResponseSchema,
        fetchFn
    )
}

export async function deleteClaim(
    argumentId: string,
    version: number,
    claimId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/claims/${claimId}`,
            { method: "DELETE" }
        ),
        ClaimDeletionResponseSchema
    )
}

export async function updateClaim(
    argumentId: string,
    version: number,
    claimId: string,
    data: TClaimUpdateFields,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/claims/${claimId}`,
        { method: "PUT" },
        { ...data },
        ClaimUpdateRequestSchema,
        ClaimSchema,
        fetchFn
    )
}

export async function createClaimSource(
    argumentId: string,
    version: number,
    claimId: string,
    citation: TIEEEReference,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/claims/${claimId}/source`,
        { method: "POST" },
        citation,
        IEEEReferenceSchemaMap[citation.type],
        SourceCreationSchema,
        fetchFn
    )
}

export async function deleteClaimSource(
    argumentId: string,
    version: number,
    claimId: string,
    sourceId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/claims/${claimId}/source/${sourceId}`,
            { method: "DELETE" }
        ),
        ClaimSourceDeleteResponseSchema
    )
}
