# Changelog — upcoming

## Added

- Enriched four-state `ArgumentDiffSchema` / `TArgumentDiff`
  (`src/schemas/model/arguments.ts`): mirrors core's diff shape on the app-level
  entity schemas. Drops the `propositionalLogic` wrapper and the lossy
  three-bucket `updated`; every entity family is now a uniform `entitySetDiff`
  with `added` / `removed` / `modified`, each `modified` record carrying `state`
  (`modified-own` | `modified-within`) and field-level `changes`. Adds nested
  `premises.modified[].expressions` and `roles.conclusion.{before,after}`. New
  exported primitives: `DiffStateSchema` / `TDiffState`, `FieldChangeSchema`,
  `entityFieldDiff`, `entitySetDiff`.
- `composeArgumentDiff` (`src/engine/diff.ts`, `@proposit/shared/engine/diff`):
  folds app-level claim + citation four-state onto core's structural diff.
  Claims — a digest change is `modified-own`; a claim whose citations changed, or
  whose cited claim was itself edited, is `modified-within`. Citations — identity
  is the endpoint pair `(claimId, supportingClaimId)`; a matched edge whose
  `supportingClaimVersion` or `checksum` moved is `modified-within` (the
  citing-side `claimVersion` is deliberately not compared, so a citing claim's
  own head-bump does not flip its edges). Re-attaches premise `role` from
  caller-supplied `premisesBefore` / `premisesAfter`, and throws if a
  core-referenced premise is absent from them rather than emitting a
  schema-invalid premise. Filters engine-synthesized derivation premises and
  their expressions.
- `buildDiffRenderMaps` (`src/engine/diff-render.ts`,
  `@proposit/shared/engine/diff-render`): builds per-entity render-cue maps from
  a `TArgumentDiff`. `TDiffCue` = `added | removed | origin | touched`, where
  `origin` marks the single `modified-own` change site and `touched` marks each
  `modified-within` container/referrer. Returns node/premise/edge/citation cue
  maps plus removed-entity lookups.

## Changed

- `@proposit/proposit-core` peerDependency `^2.3.0` → `^2.5.0`, devDependency
  `^2.3.1` → `^2.5.0` (four-state diff types).

Breaking wire change: the `TArgumentDiff` shape changed; server and mobile adopt
it on their own slices. Commit range `8adea7d..95109c8`.
