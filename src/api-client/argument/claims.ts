import type {
    TMutableClaimFields,
    TClaimUpdateFields,
    TAxiomKind,
} from "../../schemas/model/claims.js"
import { ClaimSchema, ClaimUpdateRequestSchema } from "../../schemas/model.js"
import {
    ClaimCreationRequestSchema,
    ClaimCreationResponseSchema,
    ClaimDeletionResponseSchema,
    ClaimCitationDeleteResponseSchema,
    CitationCreationSchema,
    AxiomAssignmentRequestSchema,
    AxiomAssignmentResponseSchema,
} from "../../schemas/api/argument/claims.js"
import {
    IEEEReferenceSchemaMap,
    type TIEEEReference,
} from "../../schemas/model/references.js"
import { Type } from "typebox"
import type { TReferenceType } from "@proposit/proposit-core/extensions/citations/ieee"
import {
    ReferenceImportRequestSchema,
    CitationImportResponseSchema,
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

export async function citationImportImpl(
    config: TApiClientConfig,
    url: string,
    referenceType: TReferenceType
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/citation/import`,
        { method: "POST" },
        { url, referenceType },
        ReferenceImportRequestSchema,
        // The route emits `Response.json(null)` when extraction fails; a plain
        // object schema would throw on `null` in parseResponse, so the response
        // schema must admit null. `value: null` → the caller degrades to manual.
        Type.Union([CitationImportResponseSchema, Type.Null()]),
        config.fetchImpl
    )
}

/**
 * Assigns an axiomatic claim as the antecedent of a normal claim's
 * derivation premise. The server mints a new axiomatic-claim row from the
 * `axiom` kind, wires it into the citing claim's derivation premise via
 * `populateDerivationFromAxiom`, persists the changeset, and returns the
 * new claim alongside its derivation-premise context.
 *
 * Args object shape (not positional). `claimId` is the **citing** claim's id
 * (the claim whose derivation premise gains the axiomatic backing), not the
 * freshly-minted axiomatic claim's id.
 */
export async function createClaimAxiomImpl(
    config: TApiClientConfig,
    args: {
        argumentId: string
        version: number
        claimId: string
        axiom: TAxiomKind
    }
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${args.argumentId}/${args.version}/claims/${args.claimId}/axiom`,
        { method: "POST" },
        { axiom: args.axiom },
        AxiomAssignmentRequestSchema,
        AxiomAssignmentResponseSchema,
        config.fetchImpl
    )
}
