# Changelog — upcoming

## Added

- `@proposit/shared/schemas/api/argument`: `ArgumentOrderBy`
  (`"popularity" | "createdOn" | "title"`) and `ArgumentOrderDirection`
  (`"asc" | "desc"`) TypeBox unions, with `TArgumentOrderBy` /
  `TArgumentOrderDirection` static types.
- `GetAllArgumentsRequestSchema`: optional `orderBy: ArgumentOrderBy` and
  `orderDirection: ArgumentOrderDirection`.
- `@proposit/shared/api-client`: `GetAllArgumentsParams.orderBy` and
  `.orderDirection`, serialized into the `GET /api/v1/argument` query string by
  the existing param loop.

## Changed

- `GetAllArgumentsRequestSchema.orderByPopularity` is retained with unchanged
  semantics; its JSDoc now records that `orderBy` takes precedence when both are
  present (the server enforces the precedence). Requests carrying neither new
  field validate and serialize exactly as before.

## Notes

- No response-shape change: the list response is
  `Type.Array(ArgumentWithMetadataSchema)`, which already requires `createdOn`
  via `ArgumentSchema`.
