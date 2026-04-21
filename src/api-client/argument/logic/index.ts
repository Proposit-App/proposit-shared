import type {
    TExpressionCreation,
    TExpressionUpdate,
    TPremiseCreation,
    TPremiseUpdate,
    TVariableCreation,
    TVariableUpdate,
} from "../../../schemas/api/argument/logic.js"
import {
    CreateExpressionResponseSchema,
    CreatePremiseResponseSchema,
    ExpressionCreationSchema,
    ExpressionUpdateSchema,
    PremiseCreationSchema,
    PremiseUpdateSchema,
    VariableCreationSchema,
    VariableUpdateSchema,
} from "../../../schemas/api/argument/logic.js"
import {
    PropositionalExpressionSchema,
    PropositionalPremiseSchema,
    PropositionalVariableSchema,
} from "../../../schemas/logic.js"
import { ArgumentEngineSnapshotSchema } from "../../../schemas/snapshot.js"
import { parseResponse, strictFetch } from "../../../utils/utils.js"
import { Type } from "typebox"
import type { TApiClientConfig } from "../../config.js"
import { resolveBaseUrl } from "../../internal.js"

const DeletedResponseSchema = Type.Object({ deleted: Type.Boolean() })

function logicUrl(
    argumentId: string,
    argumentVersion: number,
    baseUrl: string
) {
    return `${baseUrl}/api/v1/argument/${argumentId}/${argumentVersion}/logic`
}

// ── Combined logic data ─────────────────────────────────────────────────────

export async function getLogicDataImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        logicUrl(argumentId, argumentVersion, baseUrl),
        { method: "GET" },
        undefined,
        undefined,
        ArgumentEngineSnapshotSchema,
        config.fetchImpl
    )
}

// ── Premise operations ──────────────────────────────────────────────────────

export async function getPremisesImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/premises`,
            {
                method: "GET",
            }
        ),
        Type.Array(PropositionalPremiseSchema)
    )
}

export async function createPremiseImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    data: TPremiseCreation
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, baseUrl)}/premises`,
        { method: "POST" },
        data,
        PremiseCreationSchema,
        CreatePremiseResponseSchema,
        config.fetchImpl
    )
}

export async function updatePremiseImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    premiseId: string,
    data: TPremiseUpdate
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, baseUrl)}/premises/${premiseId}`,
        { method: "PUT" },
        data,
        PremiseUpdateSchema,
        PropositionalPremiseSchema,
        config.fetchImpl
    )
}

export async function deletePremiseImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    premiseId: string,
    checksum: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/premises/${premiseId}?checksum=${encodeURIComponent(checksum)}`,
            { method: "DELETE" }
        ),
        DeletedResponseSchema
    )
}

export async function getPremiseImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    premiseId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/premises/${premiseId}`,
            { method: "GET" }
        ),
        PropositionalPremiseSchema
    )
}

// ── Expression operations ───────────────────────────────────────────────────

export async function getExpressionsImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    premiseId?: string
) {
    const baseUrl = resolveBaseUrl(config)
    const url = new URL(
        `${logicUrl(argumentId, argumentVersion, baseUrl)}/expressions`,
        "http://localhost"
    )
    if (premiseId) url.searchParams.set("premiseId", premiseId)
    return await parseResponse(
        await config.fetchImpl(url.pathname + url.search, { method: "GET" }),
        Type.Array(PropositionalExpressionSchema)
    )
}

export async function createExpressionImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    data: TExpressionCreation
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, baseUrl)}/expressions`,
        { method: "POST" },
        data,
        ExpressionCreationSchema,
        CreateExpressionResponseSchema,
        config.fetchImpl
    )
}

export async function updateExpressionImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    expressionId: string,
    data: TExpressionUpdate
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, baseUrl)}/expressions/${expressionId}`,
        { method: "PUT" },
        data,
        ExpressionUpdateSchema,
        PropositionalExpressionSchema,
        config.fetchImpl
    )
}

export async function deleteExpressionImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    expressionId: string,
    checksum: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/expressions/${expressionId}?checksum=${encodeURIComponent(checksum)}`,
            { method: "DELETE" }
        ),
        DeletedResponseSchema
    )
}

export async function getExpressionImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    expressionId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/expressions/${expressionId}`,
            { method: "GET" }
        ),
        PropositionalExpressionSchema
    )
}

export async function toggleNegationImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    expressionId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/expressions/${expressionId}/toggle-negation`,
            { method: "POST" }
        ),
        ArgumentEngineSnapshotSchema
    )
}

// ── Variable operations ─────────────────────────────────────────────────────

export async function getVariablesImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/variables`,
            {
                method: "GET",
            }
        ),
        Type.Array(PropositionalVariableSchema)
    )
}

export async function createVariableImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    data: TVariableCreation
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, baseUrl)}/variables`,
        { method: "POST" },
        data,
        VariableCreationSchema,
        PropositionalVariableSchema,
        config.fetchImpl
    )
}

export async function updateVariableImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    variableId: string,
    data: TVariableUpdate
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, baseUrl)}/variables/${variableId}`,
        { method: "PUT" },
        data,
        VariableUpdateSchema,
        PropositionalVariableSchema,
        config.fetchImpl
    )
}

export async function deleteVariableImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    variableId: string,
    checksum: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/variables/${variableId}?checksum=${encodeURIComponent(checksum)}`,
            { method: "DELETE" }
        ),
        DeletedResponseSchema
    )
}

export async function getVariableImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    variableId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${logicUrl(argumentId, argumentVersion, baseUrl)}/variables/${variableId}`,
            { method: "GET" }
        ),
        PropositionalVariableSchema
    )
}

export { repairArgumentImpl } from "./repair.js"
