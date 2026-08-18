import { Type, type Static } from "typebox"
import { EncodableDate, UUID } from "../../common.js"
import { ArgumentWithMetadataSchema } from "../../model/arguments.js"

// A user's personal collection of published arguments — their own or anyone
// else's. Saving is a bookmark, not an opinion: it says "find this again
// later", which is why it lives apart from `argumentReactions` rather than
// being another value on it.
//
// The saved record names an argument id and nothing more. There is deliberately
// no version: the list always resolves to the argument's current published
// version, because "find it again later" means the argument as it stands, not
// the revision that happened to be current when the reader saved it.

// Save and unsave both address the argument through the route path, so neither
// carries a request body. `savedAt` is the only thing the write returns that
// the caller did not already know.
export const SaveArgumentResponseSchema = Type.Object({
    argumentId: UUID,
    savedAt: EncodableDate,
})
export type TSaveArgumentResponse = Static<typeof SaveArgumentResponseSchema>

// Unsaving answers what the collection now holds rather than what was removed.
// `saved: false` is the state after the call, and it is the same answer whether
// a row was deleted or there was never one to delete — unsaving is idempotent,
// so a repeat call is a no-op, not a 404.
export const UnsaveArgumentResponseSchema = Type.Object({
    argumentId: UUID,
    saved: Type.Literal(false),
})
export type TUnsaveArgumentResponse = Static<
    typeof UnsaveArgumentResponseSchema
>

// One entry in the caller's saved list: the argument in the same shape the feed
// already consumes, plus when it was saved. Carrying the argument whole means
// the existing list and card components render a saved entry unchanged.
export const SavedArgumentSchema = Type.Intersect([
    ArgumentWithMetadataSchema,
    Type.Object({
        savedAt: EncodableDate,
    }),
])
export type TSavedArgument = Static<typeof SavedArgumentSchema>

export const GetSavedArgumentsResponseSchema = Type.Array(SavedArgumentSchema)
export type TGetSavedArgumentsResponse = Static<
    typeof GetSavedArgumentsResponseSchema
>

// Paging over the caller's own collection. There is no `userId` — a saved list
// is private to the person who made it, so the caller is always the session.
export type TGetSavedArgumentsParams = {
    limit?: number
    offset?: number
    /** Case-insensitive substring match on the argument title. */
    titlePattern?: string
}
