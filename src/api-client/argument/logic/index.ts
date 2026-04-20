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

const DeletedResponseSchema = Type.Object({ deleted: Type.Boolean() })

function logicUrl(
    argumentId: string,
    argumentVersion: number,
    urlPrefix: string
) {
    return `${urlPrefix}/api/v1/argument/${argumentId}/${argumentVersion}/logic`
}

// ── Combined logic data ─────────────────────────────────────────────────────

export async function getLogicData(
    argumentId: string,
    argumentVersion: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        logicUrl(argumentId, argumentVersion, urlPrefix),
        { method: "GET" },
        undefined,
        undefined,
        ArgumentEngineSnapshotSchema,
        fetchFn
    )
}

// ── Premise operations ──────────────────────────────────────────────────────

export async function getPremises(
    argumentId: string,
    argumentVersion: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/premises`,
            {
                method: "GET",
            }
        ),
        Type.Array(PropositionalPremiseSchema)
    )
}

export async function createPremise(
    argumentId: string,
    argumentVersion: number,
    data: TPremiseCreation,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, urlPrefix)}/premises`,
        { method: "POST" },
        data,
        PremiseCreationSchema,
        CreatePremiseResponseSchema,
        fetchFn
    )
}

export async function updatePremise(
    argumentId: string,
    argumentVersion: number,
    premiseId: string,
    data: TPremiseUpdate,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, urlPrefix)}/premises/${premiseId}`,
        { method: "PUT" },
        data,
        PremiseUpdateSchema,
        PropositionalPremiseSchema,
        fetchFn
    )
}

export async function deletePremise(
    argumentId: string,
    argumentVersion: number,
    premiseId: string,
    checksum: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/premises/${premiseId}?checksum=${encodeURIComponent(checksum)}`,
            { method: "DELETE" }
        ),
        DeletedResponseSchema
    )
}

export async function getPremise(
    argumentId: string,
    argumentVersion: number,
    premiseId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/premises/${premiseId}`,
            { method: "GET" }
        ),
        PropositionalPremiseSchema
    )
}

// ── Expression operations ───────────────────────────────────────────────────

export async function getExpressions(
    argumentId: string,
    argumentVersion: number,
    premiseId?: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    const url = new URL(
        `${logicUrl(argumentId, argumentVersion, urlPrefix)}/expressions`,
        "http://localhost"
    )
    if (premiseId) url.searchParams.set("premiseId", premiseId)
    return await parseResponse(
        await fetchFn(url.pathname + url.search, { method: "GET" }),
        Type.Array(PropositionalExpressionSchema)
    )
}

export async function createExpression(
    argumentId: string,
    argumentVersion: number,
    data: TExpressionCreation,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, urlPrefix)}/expressions`,
        { method: "POST" },
        data,
        ExpressionCreationSchema,
        CreateExpressionResponseSchema,
        fetchFn
    )
}

export async function updateExpression(
    argumentId: string,
    argumentVersion: number,
    expressionId: string,
    data: TExpressionUpdate,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, urlPrefix)}/expressions/${expressionId}`,
        { method: "PUT" },
        data,
        ExpressionUpdateSchema,
        PropositionalExpressionSchema,
        fetchFn
    )
}

export async function deleteExpression(
    argumentId: string,
    argumentVersion: number,
    expressionId: string,
    checksum: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/expressions/${expressionId}?checksum=${encodeURIComponent(checksum)}`,
            { method: "DELETE" }
        ),
        DeletedResponseSchema
    )
}

export async function getExpression(
    argumentId: string,
    argumentVersion: number,
    expressionId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/expressions/${expressionId}`,
            { method: "GET" }
        ),
        PropositionalExpressionSchema
    )
}

export async function toggleNegation(
    argumentId: string,
    argumentVersion: number,
    expressionId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/expressions/${expressionId}/toggle-negation`,
            { method: "POST" }
        ),
        ArgumentEngineSnapshotSchema
    )
}

// ── Variable operations ─────────────────────────────────────────────────────

export async function getVariables(
    argumentId: string,
    argumentVersion: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/variables`,
            {
                method: "GET",
            }
        ),
        Type.Array(PropositionalVariableSchema)
    )
}

export async function createVariable(
    argumentId: string,
    argumentVersion: number,
    data: TVariableCreation,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, urlPrefix)}/variables`,
        { method: "POST" },
        data,
        VariableCreationSchema,
        PropositionalVariableSchema,
        fetchFn
    )
}

export async function updateVariable(
    argumentId: string,
    argumentVersion: number,
    variableId: string,
    data: TVariableUpdate,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${logicUrl(argumentId, argumentVersion, urlPrefix)}/variables/${variableId}`,
        { method: "PUT" },
        data,
        VariableUpdateSchema,
        PropositionalVariableSchema,
        fetchFn
    )
}

export async function deleteVariable(
    argumentId: string,
    argumentVersion: number,
    variableId: string,
    checksum: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/variables/${variableId}?checksum=${encodeURIComponent(checksum)}`,
            { method: "DELETE" }
        ),
        DeletedResponseSchema
    )
}

export async function getVariable(
    argumentId: string,
    argumentVersion: number,
    variableId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${logicUrl(argumentId, argumentVersion, urlPrefix)}/variables/${variableId}`,
            { method: "GET" }
        ),
        PropositionalVariableSchema
    )
}

export { repairArgument } from "./repair.js"
