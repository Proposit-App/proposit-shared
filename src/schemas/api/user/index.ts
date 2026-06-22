import { UUID } from "../../common.js"
import { Nullable } from "../../common.js"
import { UserPreferencesSchema } from "../../model/users.js"
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

export type TUserModifyRequest = Static<typeof UserModifyRequest>
export type TUsernameSearchRequest = Static<typeof UsernameSearchRequest>
export type TUsernameSearchResponse = Static<typeof UsernameSearchResponse>
