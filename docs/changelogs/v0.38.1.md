# Changelog — upcoming

<!-- Add changelog entries here -->

## Added

- `AI_QUOTA_ABORT_CODE` exported from `@proposit/shared/consts`: the single
  source of truth for the AI-budget breaker abort code (`"AI_QUOTA_EXHAUSTED"`),
  carried in a run/stage/task `errorData.code`. Replaces the string being
  duplicated in each consumer.
- `getAllArguments` catalog list params gained an optional `status` filter
  (`"unpublished" | "published" | "archived"`), serialized into the request
  query string. Fully back-compatible: omitting it preserves current behavior.
- `EntitySearchResponseSchema` gains an optional `searchMode`
  (`Type.Union([Type.Literal("embedding"), Type.Literal("string")])`) so the
  server can signal when results came from the SQL literal-match fallback
  (`"string"`) versus the embedding path (`"embedding"`). Additive/back-compat:
  omitting it is unchanged, and an older field-less server (or a client reading
  one) still validates. `ClaimSearchResponseSchema` /
  `CitationSearchResponseSchema` are untouched.

## Changed

- `ClaimReactionSelectionSchema.reasonCode` (the read schema) loosened to
  `Type.Union([ClaimReasonCodeSchema, Type.String()])` so a stored `reasonCode`
  that has fallen out of the closed union is carried through as a raw string
  instead of 500'ing or being dropped. The write path
  (`ClaimReactionCreateRequest`) stays the closed union. Consumer-visible: the
  read `reasonCode` static type widens to `string`.
- `toEvaluationContext` (`src/engine/review/evaluation.ts`) now imports
  `isNakedQDerivationPremise` from `@proposit/proposit-core` instead of carrying
  a local re-implementation. Core exports the predicate publicly as of 2.4.3;
  the dropped local copy was behaviorally identical (derivation-type guard plus
  naked-Q tree-shape check). Internal refactor, no behavior change.
