import { UUID } from "../../common.js"
import { Nullable } from "../../common.js"
import { AccountStates, UserPreferencesSchema } from "../../model/users.js"
import { Type, type Static } from "typebox"

export const UsernameSearchRequest = Type.Object({
    username: Type.String(),
})

export const UsernameSearchResponse = Type.Object({
    userId: UUID,
    username: Type.String(),
    imageURI: Nullable(Type.String()),
})

// Body for `PUT /api/v1/user/me`. All fields are optional — the request shape
// is "any one writable field" rather than always-username. Server validates
// that at least one writable field was provided (out-of-schema concern).
// `preferences` is a partial patch: a client sends only the keys it changes,
// and the server merges them onto the stored preferences object.
export const UserModifyRequest = Type.Object({
    username: Type.Optional(Type.String()),
    preferences: Type.Optional(Type.Partial(UserPreferencesSchema)),
})

// Body for `PATCH /api/v1/user/me`. A single literal rather than the
// `AccountStates` union, deliberately: deactivation is the only state a caller
// may set on themselves. Self-banning is meaningless, reactivation happens by
// signing in (a deactivated caller has no session to send this with), and
// deletion keeps the `DELETE` verb. The server rejects anything else with a
// 400; the literal makes it a compile error first.
export const DeactivateAccountRequest = Type.Object({
    accountState: Type.Literal(AccountStates.DEACTIVATED),
})

export type TUserModifyRequest = Static<typeof UserModifyRequest>
export type TDeactivateAccountRequest = Static<typeof DeactivateAccountRequest>
export type TUsernameSearchRequest = Static<typeof UsernameSearchRequest>
export type TUsernameSearchResponse = Static<typeof UsernameSearchResponse>
