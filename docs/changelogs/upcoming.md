# Changelog — upcoming

## Added

- `apiClient.hideArgument(argumentId, version)` and `apiClient.unhideArgument(argumentId, version)`
  on the api-client factory — POST the existing `/api/v1/argument/[id]/[version]/hide` and
  `/unhide` moderation routes and return the parsed `{ hidden: boolean }` flag.
- `SetArgumentHiddenResponseSchema` (+ `TSetArgumentHiddenResponse`) exported from
  `@proposit/shared/schemas/api/argument`.
