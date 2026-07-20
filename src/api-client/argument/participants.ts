import {
    ParticipantSchema,
    ParticipantWithUserSchema,
} from "../../schemas/model.js"
import {
    AddParticipantRequestSchema,
    type TAddParticipantRequest,
} from "../../schemas/api/argument/index.js"
import { strictFetch } from "../../utils/utils.js"
import { Type } from "typebox"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

// Lists every participant (owner + editors) on an argument version, each joined
// with the participant's public user fields.
// `GET /api/v1/argument/{argumentId}/{version}/participants`.
export async function getArgumentParticipantsImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/participants`,
        { method: "GET" },
        undefined,
        undefined,
        Type.Array(ParticipantWithUserSchema),
        config.fetchImpl
    )
}

// Grants the editor role on an argument version to another user (owner-only
// server-side), returning the created participant row.
// `POST /api/v1/argument/{argumentId}/{version}/participants`.
export async function addArgumentEditorImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    body: TAddParticipantRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/participants`,
        { method: "POST" },
        body,
        AddParticipantRequestSchema,
        ParticipantSchema,
        config.fetchImpl
    )
}

// Removes a participant from an argument version — the owner removing an editor,
// or a user removing themselves (step down). No response body.
// `DELETE /api/v1/argument/{argumentId}/{version}/participants/{userId}`.
export async function removeArgumentParticipantImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    userId: string
) {
    const baseUrl = resolveBaseUrl(config)
    await config.fetchImpl(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/participants/${userId}`,
        { method: "DELETE" }
    )
}
