import { Type } from "typebox"
import {
    AttachOriginDocumentRequestSchema,
    CreateOriginAnchorRequestSchema,
    GetOriginResponseSchema,
    MarkEnthymemeRequestSchema,
    UpdateOriginRequestSchema,
    type TAttachOriginDocumentRequest,
    type TCreateOriginAnchorRequest,
    type TMarkEnthymemeRequest,
    type TUpdateOriginRequest,
} from "../../schemas/api/argument/index.js"
import {
    OriginAnchorSchema,
    OriginDocumentSchema,
    OriginLinkSchema,
} from "../../schemas/model/origin.js"
import {
    PropositionalExpressionSchema,
    PropositionalPremiseSchema,
} from "../../schemas/logic.js"
import { strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

const AttachOriginResponseSchema = Type.Object({
    document: OriginDocumentSchema,
    link: OriginLinkSchema,
})

// Reads an argument version's source text, its stance-bearing link, and every
// anchor into it. `document` and `link` are `null` when nothing is attached.
// `GET /api/v1/argument/{argumentId}/{version}/origin`.
export async function getArgumentOriginImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/origin`,
        { method: "GET" },
        undefined,
        undefined,
        GetOriginResponseSchema,
        config.fetchImpl
    )
}

// Attaches a source text to an argument version. The server normalizes the
// text, digests the result, and enforces the tier's source-text limits on the
// normalized form.
// `POST /api/v1/argument/{argumentId}/{version}/origin`.
export async function attachArgumentOriginImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    body: TAttachOriginDocumentRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/origin`,
        { method: "POST" },
        body,
        AttachOriginDocumentRequestSchema,
        AttachOriginResponseSchema,
        config.fetchImpl
    )
}

// Updates the stance and/or the attribution on the attached source text. An
// omitted key leaves that field untouched; `reference: null` clears it.
// `PATCH /api/v1/argument/{argumentId}/{version}/origin`.
export async function updateArgumentOriginImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    body: TUpdateOriginRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/origin`,
        { method: "PATCH" },
        body,
        UpdateOriginRequestSchema,
        AttachOriginResponseSchema,
        config.fetchImpl
    )
}

// Detaches the source text, dropping its link and every anchor into it —
// anchors are offsets into one exact text and do not survive it. No response
// body.
// `DELETE /api/v1/argument/{argumentId}/{version}/origin`.
export async function detachArgumentOriginImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    await config.fetchImpl(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/origin`,
        { method: "DELETE" }
    )
}

// Records the span of the source text one argument part derives from. The
// caller supplies code-point offsets; the server derives the quote by slicing
// the stored document at them.
// `POST /api/v1/argument/{argumentId}/{version}/origin/anchors`.
export async function createOriginAnchorImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    body: TCreateOriginAnchorRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/origin/anchors`,
        { method: "POST" },
        body,
        CreateOriginAnchorRequestSchema,
        OriginAnchorSchema,
        config.fetchImpl
    )
}

// Removes one anchor. No response body.
// `DELETE /api/v1/argument/{argumentId}/{version}/origin/anchors/{anchorId}`.
export async function deleteOriginAnchorImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    anchorId: string
) {
    const baseUrl = resolveBaseUrl(config)
    await config.fetchImpl(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/origin/anchors/${anchorId}`,
        { method: "DELETE" }
    )
}

// Declares a premise spoken or unspoken in the natural-language original.
// `marked: false` deletes the field rather than storing a falsy value.
// `PATCH /api/v1/argument/{argumentId}/{version}/premise/{premiseId}/enthymeme`.
export async function markPremiseEnthymemeImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    premiseId: string,
    body: TMarkEnthymemeRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/premise/${premiseId}/enthymeme`,
        { method: "PATCH" },
        body,
        MarkEnthymemeRequestSchema,
        PropositionalPremiseSchema,
        config.fetchImpl
    )
}

// Declares a claim expression spoken or unspoken in the natural-language
// original. `marked: false` deletes the field rather than storing a falsy
// value.
// `PATCH /api/v1/argument/{argumentId}/{version}/expression/{expressionId}/enthymeme`.
export async function markExpressionEnthymemeImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    expressionId: string,
    body: TMarkEnthymemeRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/expression/${expressionId}/enthymeme`,
        { method: "PATCH" },
        body,
        MarkEnthymemeRequestSchema,
        PropositionalExpressionSchema,
        config.fetchImpl
    )
}
