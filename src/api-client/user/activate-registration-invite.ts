import {
    RegistrationInviteActivationRequestSchema,
    RegistrationInvitationSchema,
} from "../../schemas/model/users.js"
import type { TRegistrationInviteActivationRequest } from "../../schemas/model/users.js"
import { strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

// Activates a registration invitation or promo code for the authenticated
// caller, returning the redeemed invitation. `POST /api/v1/user/register`.
export async function activateRegistrationInviteImpl(
    config: TApiClientConfig,
    body: TRegistrationInviteActivationRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/user/register`,
        { method: "POST" },
        body,
        RegistrationInviteActivationRequestSchema,
        RegistrationInvitationSchema,
        config.fetchImpl
    )
}
