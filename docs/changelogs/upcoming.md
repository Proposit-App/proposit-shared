# Changelog — upcoming

- Add `buildArgumentVersionHistory` + `TArgumentVersionRow` in
  `src/schemas/api/argument/version-history.ts`, re-exported from the
  `argument` schema subpath. Pure projection over `TFullArgument`'s `argument`,
  `argumentHistory`, and `originalArgument` fields: de-duplicates by
  id + version, orders the current lineage newest-first, appends the immediate
  fork source flagged `isForkSource`, and marks the viewed version `isActive`.
  No schema, REST-contract, or api-client change.
