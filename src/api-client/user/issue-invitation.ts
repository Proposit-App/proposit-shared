import {
    RegistrationInvitationCreateSchema,
    RegistrationInvitationSchema,
} from "../../schemas/model/users.js"
import type { TRegistrationInvitationCreate } from "../../schemas/model/users.js"
import { strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

// Mints a single-use registration invitation for another user (subject to the
// caller's own permissions server-side) and returns it. `POST /api/v1/user/invite`.
export async function issueInvitationImpl(
    config: TApiClientConfig,
    body: TRegistrationInvitationCreate
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/user/invite`,
        { method: "POST" },
        body,
        RegistrationInvitationCreateSchema,
        RegistrationInvitationSchema,
        config.fetchImpl
    )
}
