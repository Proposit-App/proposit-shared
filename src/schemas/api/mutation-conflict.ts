// Machine-readable 409-equivalent envelope returned by server mutations that
// reject a request because the target argument is in a state that conflicts
// with the operation. Emitted by the publish + archive lifecycle mutations so
// clients can branch on the specific conflict rather than parsing a message.
//
// `error` is the stable string discriminator ("MUTATION_CONFLICT") that lets a
// client switch on response type without sniffing status codes or messages.
// `code` names the specific conflict condition (see the union below). `message`
// carries the server's human-readable text for direct display.
//
// The conditions are drawn from the current publish/archive throw sites:
//   - ALREADY_PUBLISHED — publish requested on an already-published version.
//   - PUBLISHED_VERSION_NOT_ARCHIVABLE — archive requested on a published
//     version (a published version cannot be archived).
//   - PUBLISH_VERSION_CONFLICT — the version being published was superseded by
//     a concurrent write (lost update); the client should reload and retry.

import { Type, type Static } from "typebox"

export const MutationConflictCodeSchema = Type.Union([
    Type.Literal("ALREADY_PUBLISHED"),
    Type.Literal("PUBLISHED_VERSION_NOT_ARCHIVABLE"),
    Type.Literal("PUBLISH_VERSION_CONFLICT"),
])

export const MutationConflictResponseSchema = Type.Object({
    error: Type.Literal("MUTATION_CONFLICT"),
    code: MutationConflictCodeSchema,
    message: Type.String(),
})

export type TMutationConflictCode = Static<typeof MutationConflictCodeSchema>
export type TMutationConflictResponse = Static<
    typeof MutationConflictResponseSchema
>
