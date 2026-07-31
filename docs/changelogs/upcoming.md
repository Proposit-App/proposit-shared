# Changelog — upcoming

## Added

- `src/schemas/model/origin.ts` — `OriginDocumentSchema` / `OriginLinkSchema` /
  `OriginAnchorSchema`, each core's entity intersected with the app fields the
  server needs (`creatorId` + `createdOn` on the document, `createdOn` on the
  other two, plus an optional IEEE/unparsed `reference` on the document). Core's
  `OriginStanceSchema`, `OriginAnchorTargetTypeSchema`, and
  `OriginSegmentSchema` are re-exported unchanged so consumers have one import
  path. Reachable at `@proposit/shared/schemas/model/origin` through the
  existing `"./schemas/*"` wildcard export.
- `TProjectOriginData` and `origin` on `TProjectReactiveSnapshot`
  (`src/engine/engine.ts`) — `{ document, link, anchors }`, with `anchors`
  keyed by the anchor's `targetId`. `document`/`link` are scalars because the
  product allows at most one source text per argument version. Backed by the
  same dirty-flag + cached-record machinery as `claims` / `citations`, so the
  slice participates in the snapshot's referential-equality short-circuit.
- Engine accessors `getOrigin`, `setOriginDocument`, `setOriginLink`,
  `getOriginAnchorsForTarget`, `addOriginAnchor`, `removeOriginAnchor`,
  `clearOrigin`.
- `src/engine/mutations/origin.ts` — two families with different persistence
  routes, named in each function's JSDoc. `mutateMarkPremiseEnthymeme` /
  `mutateMarkExpressionEnthymeme` return a `ProjectChangeset` (premises and
  expressions are changeset entities). `mutateAttachOriginDocument`,
  `mutateDetachOriginDocument`, `mutateSetOriginStance`,
  `mutateAddOriginAnchor`, `mutateRemoveOriginAnchor`, and
  `mutateAttributeOriginDocument` return no changeset — the origin library
  never enters a `TCoreChangeset` and persists through its own model surface,
  following the `claimCitations` precedent.
- `src/engine/origin-derivation.ts` — `deriveEnthymemeSuggestions` and
  `deriveEnthymemeContradictions`, pure over the reactive snapshot. Both return
  `[]` unless the link's stance is `representation`. Premise-bound variable
  expressions are excluded from suggestions, because core reports a mark on one
  as a `P-6` Presentable violation.
- `src/schemas/api/argument/origin.ts` — request/response bodies for
  `GET`/`POST`/`PATCH`/`DELETE …/origin`, `POST`/`DELETE …/origin/anchors`, and
  the two `PATCH …/enthymeme` routes. No new coded error envelope, so
  `parseResponse` is unchanged.
- `src/api-client/argument/origin.ts` and the matching `factory.ts`
  registrations — `getArgumentOrigin`, `attachArgumentOrigin`,
  `updateArgumentOrigin`, `detachArgumentOrigin`, `createOriginAnchor`,
  `deleteOriginAnchor`, `markPremiseEnthymeme`, `markExpressionEnthymeme`.

## Changed

- `UserTierLimitsSchema` (`src/schemas/model/users.ts`) and `UserTierLimits`
  (`src/consts/user-tiers.ts`) gain `maxSourceTextChars` and
  `maxStoredSourceTextChars`, measured on the **normalized** text. `UNVERIFIED`
  is `0`/`0`; `FREE` and `NO_ASSIST` `20_000`/`200_000`; `PREMIUM`
  `100_000`/`5_000_000`; `ENTERPRISE` `500_000`/`100_000_000`. This library owns
  the numbers; the server owns enforcement, on one write path both the import
  and manual-attach routes call.
- `PropositArgumentEngine.fromServerData` takes an **optional** fourth
  parameter carrying `{ document, link, anchors }`. Every existing
  three-argument call site is unaffected.
- `serializeArgumentToMarkdown` (`src/engine/render/markdown.ts`) renders origin
  anchors off `snapshot.origin`. An expression anchor becomes a nested bullet
  under its claim, a premise anchor a paragraph under the premise heading, and an
  argument anchor a line in the header blockquote — each reading
  `Based on origin text "…"`, with the source document's reference appended to
  the header line via `getInlineSourceLabel`. A document with a reference but no
  argument-level anchor still renders `> Based on origin text — …`. Anchor
  offsets are never rendered, and passages spanning lines are collapsed to one
  line. A snapshot with no origin data serializes byte-identically to before,
  including one rehydrated from wire data that predates the `origin` slice.

## Notes

- No `enthymeme` schema work was needed: shared's premise and expression
  schemas already intersect core's, so `Type.Optional(Type.Literal(true))` —
  and its refusal of both `null` and `false` — is inherited verbatim. Unmarking
  routes through core's `undefined`-deletes-the-key semantics
  (`patchExpressionAppFields` / `updateExtras`) so an unmarked entity's checksum
  is byte-identical to what it was before the mark, which is what keeps
  hierarchical checksums valid.
- No `package.json` `exports` entries were added — the existing
  `"./schemas/*"` and `"./engine/*"` wildcards cover the new modules and already
  declare `types`, `import`, and `default`.
