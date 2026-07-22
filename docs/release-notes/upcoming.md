---
date: TBD
---

# Release notes — upcoming

- The arguments list request gains an explicit ordering pair. `orderBy`
  (`"popularity"`, `"createdOn"`, or `"title"`) and `orderDirection`
  (`"asc"` or `"desc"`) are optional fields on `GetAllArgumentsRequestSchema`
  and on the api-client's `getAllArguments` params, letting a client ask for a
  sort that is resolved server-side before pagination instead of sorting only
  the page it already loaded.
- `orderByPopularity` is unchanged and still honored on its own, so server and
  client can adopt the new pair independently. When both it and `orderBy`
  arrive, `orderBy` decides the ordering. A request carrying neither new field
  behaves exactly as before.
- No response change was needed: the list already returns
  `ArgumentWithMetadataSchema`, which carries the required `createdOn`
  timestamp.
