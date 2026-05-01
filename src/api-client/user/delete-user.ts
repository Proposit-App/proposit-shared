import { UserSchema } from "../../schemas/model/users.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function deleteUserImpl(config: TApiClientConfig) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(`${baseUrl}/api/v1/user/me`, {
            method: "DELETE",
        }),
        UserSchema
    )
}
