import { UserModifyRequest } from "../../schemas/api/user/index.js"
import type { TUserModifyRequest } from "../../schemas/api/user/index.js"
import { UserSchema } from "../../schemas/model/users.js"
import { strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

// Updates the authenticated caller's own record (username and/or a partial
// preferences patch) and returns the updated user. `PUT /api/v1/user/me`.
export async function modifyCurrentUserImpl(
    config: TApiClientConfig,
    body: TUserModifyRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/user/me`,
        { method: "PUT" },
        body,
        UserModifyRequest,
        UserSchema,
        config.fetchImpl
    )
}
