import { UUID } from "../../common.js"
import { Nullable } from "../../common.js"
import { Type, type Static } from "typebox"

export const UsernameSearchRequest = Type.Object({
    username: Type.String(),
})

export const UsernameSearchResponse = Type.Object({
    userId: UUID,
    username: Type.String(),
    imageURI: Nullable(Type.String()),
})

export const UserModifyRequest = Type.Object({
    username: Type.String(),
})

export type TUserModifyRequest = Static<typeof UserModifyRequest>
export type TUsernameSearchRequest = Static<typeof UsernameSearchRequest>
export type TUsernameSearchResponse = Static<typeof UsernameSearchResponse>
