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
- `TProjectOriginData` and an **optional** `origin` on
  `TProjectReactiveSnapshot` (`src/engine/engine.ts`) — `{ document, link,
anchors }`, with `anchors` keyed by the anchor's `targetId`.
  `document`/`link` are scalars because the product allows at most one source
  text per argument version. Backed by the same dirty-flag + cached-record
  machinery as `claims` / `citations`, so the slice participates in the
  snapshot's referential-equality short-circuit. Optional rather than
  required so a hand-built snapshot — a test fixture, an optimistic overlay, a
  mock — still compiles, and so the type matches the runtime fact that a
  snapshot rehydrated from pre-origin wire data omits the slice. **Every
  reader must optional-chain it.**
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

- **`TProjectReactiveSnapshot` gained a field.** `origin` is optional, so no
  existing hand-built snapshot breaks — but code that spreads a snapshot into a
  narrower type, or exhaustively destructures one, will see it. Readers of
  `snapshot.origin` must optional-chain.
- `UserTierLimitsSchema` (`src/schemas/model/users.ts`) and `UserTierLimits`
  (`src/consts/user-tiers.ts`) gain `maxSourceTextChars` and
  `maxStoredSourceTextChars`, measured on the **normalized** text. `UNVERIFIED`
  is `0`/`0`; `FREE` and `NO_ASSIST` `20_000`/`200_000`; `PREMIUM`
  `100_000`/`5_000_000`; `ENTERPRISE` `500_000`/`100_000_000`. This library owns
  the numbers; the server owns enforcement, on one write path both the import
  and manual-attach routes call. **Both fields are `Type.Optional` in this
  release and become required in a later one.** Client-side response parsing is
  a hard `Value.Assert` with no defaulting, so shipping them required would
  mean a client carrying this version could not parse `GET /user/me` from a
  server that has not deployed yet — and the mobile app ships through
  app-store review on its own schedule, so it cannot be sequenced behind a
  server deploy. `UserTierLimits` always supplies both.
- `PropositArgumentEngine.fromServerData` takes an **optional** fourth
  parameter carrying `{ document, link, anchors }`. Every existing
  three-argument call site is unaffected. `document` and `link` accept `null`
  as well as absence, so the body of `GET …/origin` feeds straight in: JSON
  cannot carry `undefined`, the wire says `null`, and the engine normalizes.
- `setOriginDocument` **clears every anchor when the document id changes.** An
  anchor is a pair of code-point offsets into one exact text; swapping the text
  invalidates them, which is the rule detach already stated and the replace
  path silently broke. Re-writing the same document (how attribution is
  applied) keeps them.
- `addOriginAnchor` rejects an anchor whose `documentId` is not the attached
  document's, and `fromServerData` routes its anchors through the same guard —
  so a `GET …/origin` body carrying `document: null` alongside anchors is
  refused at load rather than producing an engine whose markdown export quotes
  an unattached source. This engine keeps a parallel origin store rather than embedding
  core's `OriginLibrary`, so it inherits none of that library's span/quote
  checks — the id check is the one it can make, and the JSDoc now says so.
- `mutateAttachOriginDocument` rejects a `link.documentId` that does not match
  the document being attached.
- **Deleting a premise, expression, or variable does NOT reap its origin
  anchors — the persistence layer must.** They become unreachable from every
  in-memory reader (derivation and the markdown export both walk live content
  and look anchors up by target id), so nothing renders wrong, but they ride
  the snapshot and, once persisted, become rows nothing collects. A consumer
  deleting an argument entity deletes its anchors in the same transaction.
- `mutateMarkExpressionEnthymeme` refuses an operator or formula expression,
  and a premise-bound variable expression — **on the mark only.** Unmarking is
  never guarded, because an invalid mark is reachable without this library
  (core reports P-6 without throwing) and guarding the unmark would leave the
  argument unpublishable with no way to repair it. A dangling variable
  reference is reported as its own Structural problem rather than as a
  premise-bound one, matching how core classifies it. Core reports either as a `P-6`
  Presentable violation but does not throw, so an unguarded mutation let an
  author discover the violation at publish time. Its returned changeset now
  holds a **copy** of the expression rather than the engine's own object, so a
  queued changeset does not silently re-write itself on the next mutation.
- `deriveEnthymemeSuggestions` / `deriveEnthymemeContradictions` require an
  attached **document**, not just a `representation` stance. A link outliving
  its document previously made the derivation suggest that every premise in the
  argument goes unspoken.
- `DELETE …/origin` and `DELETE …/origin/anchors/[anchorId]` return a body and
  route through `parseResponse`. They previously called `fetchImpl` directly
  and returned `void`, so a 401/403/409 was indistinguishable from success —
  the failure mode for a UI that removed a highlight optimistically.
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
- `CreateOriginAnchorRequestSchema` enforces `endCodePoint > startCodePoint`
  through `Type.Refine`. The predicate runs under `Value.Check`,
  `Value.Assert`, and `Value.Parse` alike, so a zero-length or backwards span
  is refused on the client too — inside `strictFetch`'s pre-send
  `Value.Assert` — and not only at the server. The real limitation is
  serialization: `~refine` holds functions, so `JSON.stringify` of the schema
  drops it and a check against the round-tripped copy accepts a backwards
  span. Anything emitting these schemas as OpenAPI or as an LLM
  structured-output contract must validate against the live schema object. The
  span-within-document rule stays a server obligation, stated in the schema's
  JSDoc — the document is not in the request, so nothing there can see its
  length.
- No `package.json` `exports` entries were added — the existing
  `"./schemas/*"` and `"./engine/*"` wildcards cover the new modules and already
  declare `types`, `import`, and `default`.
