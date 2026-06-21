## Optional `description` on the argument-update contract

`MutableArgumentFieldsSchema` (`schemas/model/arguments.ts`) — the shape behind
`UpdateArgumentRequestSchema.newData` — gains an optional
`description: Type.Optional(Type.String())`. Additive: title-only update bodies
stay valid, and the field now survives the schema boundary (`Value.Clean` no
longer strips it), so an edited argument description reaches the server instead
of being dropped. `title` stays required; absence of `description` means "no
change".

A companion `ARGUMENT_DESCRIPTION_MAX_LEN` (`500`) const is exported from
`consts/argument.ts` alongside `ARGUMENT_TITLE_MAX_LEN` so consumers can
length-validate descriptions consistently. The schema itself stays loose (no
`maxLength`), matching how `title` is modeled.
