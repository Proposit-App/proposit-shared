import { DeactivateAccountRequest } from "../../schemas/api/user/index.js"
import { AccountStates, UserSchema } from "../../schemas/model/users.js"
import { strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

// Deactivates the authenticated caller's own account and returns the updated
// user. `PATCH /api/v1/user/me`.
//
// Takes no argument: the route accepts exactly one state, so there is nothing
// for a caller to choose. Letting one pass a state would hand every
// authenticated client an admin's reach — banning is a moderator's action, and
// deletion has its own method. Coming back is a sign-in, not a call.
export async function deactivateAccountImpl(config: TApiClientConfig) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/user/me`,
        { method: "PATCH" },
        { accountState: AccountStates.DEACTIVATED },
        DeactivateAccountRequest,
        UserSchema,
        config.fetchImpl
    )
}
