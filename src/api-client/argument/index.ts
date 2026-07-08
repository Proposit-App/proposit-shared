// Inherited from proposit-server. The legacy type name GetAllArgumentsParams
// predates the brain-style T-prefix convention; renaming cascades through
// every server consumer. Tracked as tech debt for a dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import {
    ArgumentSchema,
    ArgumentDiffSchema,
    ArgumentWithMetadataSchema,
} from "../../schemas/model.js"
import {
    FullArgumentSchema,
    GetForksOfArgumentResponseSchema,
    UpdateArgumentRequestSchema,
    type TUpdateArgumentRequest,
    CreateArgumentSchema,
    type TCreateArgument,
    PublishResponseSchema,
    SetArgumentHiddenResponseSchema,
    PurgeArgumentResponseSchema,
} from "../../schemas/api/argument/index.js"
import { ArgumentCreateTask } from "../../schemas/tasks.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"
import { Type } from "typebox"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function getArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    const resp = await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}`,
        {
            method: "GET",
        },
        undefined,
        undefined,
        ArgumentSchema,
        config.fetchImpl
    )

    return resp
}

export async function publishArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/publish`,
            { method: "POST" }
        ),
        PublishResponseSchema
    )
}

export async function resetArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/reset`,
            { method: "POST" }
        ),
        ArgumentSchema
    )
}

export async function hideArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/hide`,
            { method: "POST" }
        ),
        SetArgumentHiddenResponseSchema
    )
}

export async function unhideArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/unhide`,
            { method: "POST" }
        ),
        SetArgumentHiddenResponseSchema
    )
}

export async function forkArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/fork`,
            { method: "POST" }
        ),
        ArgumentSchema
    )
}

export async function getArgumentDiffImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    otherArgId: string,
    otherArgVersion: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/diff/${otherArgId}/${otherArgVersion}`,
        { method: "GET" },
        undefined,
        undefined,
        ArgumentDiffSchema,
        config.fetchImpl
    )
}

export async function getArgumentForksImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/forks`,
            { method: "GET" }
        ),
        GetForksOfArgumentResponseSchema
    )
}

export async function claimUnownedArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    await config.fetchImpl(
        `${baseUrl}/api/v1/argument/unowned/${argumentId}/${version}/take`,
        { method: "POST" }
    )
}

export type GetAllArgumentsParams = {
    owned?: boolean
    limit?: number
    offset?: number
    titlePattern?: string
    orderByPopularity?: boolean
}

export async function getAllArgumentsImpl(
    config: TApiClientConfig,
    params: GetAllArgumentsParams = {}
) {
    const baseUrl = resolveBaseUrl(config)
    const url = new URL(`${baseUrl}/api/v1/argument`)
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value))
        }
    }
    return await parseResponse(
        await config.fetchImpl(url.toString(), { method: "GET" }),
        Type.Array(ArgumentWithMetadataSchema)
    )
}

export async function createArgumentImpl(
    config: TApiClientConfig,
    data: TCreateArgument
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument`,
        { method: "POST" },
        data,
        CreateArgumentSchema,
        ArgumentSchema,
        config.fetchImpl
    )
}

export async function importArgumentImpl(
    config: TApiClientConfig,
    data: TCreateArgument
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/import/${data.origin}`,
        { method: "POST" },
        data,
        CreateArgumentSchema,
        ArgumentCreateTask,
        config.fetchImpl
    )
}

export async function getLatestArgumentImpl(
    config: TApiClientConfig,
    argumentId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}`,
        { method: "GET" },
        undefined,
        undefined,
        ArgumentSchema,
        config.fetchImpl
    )
}

export async function updateArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    data: TUpdateArgumentRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}`,
        { method: "PUT" },
        data,
        UpdateArgumentRequestSchema,
        ArgumentSchema,
        config.fetchImpl
    )
}

export async function archiveArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}`,
            {
                method: "DELETE",
            }
        ),
        Type.Boolean()
    )
}

export async function deleteArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}?delete=true`,
            { method: "DELETE" }
        ),
        Type.Boolean()
    )
}

// Moderation hard-delete: removes the whole argument (all versions) AND every
// transitive fork. Distinct from `deleteArgument` (single version); separately
// permissioned server-side (requires `argument:delete` / `admin:full-access`).
export async function purgeArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}?purge=true`,
            { method: "DELETE" }
        ),
        PurgeArgumentResponseSchema
    )
}

export async function getEntireArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/entire`,
        { method: "GET" },
        undefined,
        undefined,
        FullArgumentSchema,
        config.fetchImpl
    )
}
