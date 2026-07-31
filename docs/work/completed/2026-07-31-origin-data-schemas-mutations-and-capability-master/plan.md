# Plan — Origin data schemas, mutations, and capability master

Nine tasks, ordered by dependency. Each is a separate commit. Test-first where
there is logic to break; the pure-declaration tasks (1, 4, 9) have no branch to
guard and are pinned by the tasks that consume them.

---

## Task 1 — App schemas over core's origin entities

**Files:** `src/schemas/model/origin.ts` (new),
`src/schemas/model/index.ts`

Intersect each core schema with its app fields, following
`src/schemas/model/citations.ts:5-11`:

- `OriginDocumentSchema` — core + `creatorId: UUID`, `createdOn: EncodableDate`,
  `reference: Type.Optional(…)` (IEEE, from the schemas re-exported by
  `src/schemas/model/references.ts`).
- `OriginLinkSchema` — core + `createdOn`.
- `OriginAnchorSchema` — core + `createdOn`.

Re-export `OriginStanceSchema` / `TOriginStance` and
`OriginAnchorTargetTypeSchema` / `TOriginAnchorTargetType` unchanged, plus
`OriginSegmentSchema`. Add the module to the model barrel.

**Done when:** `pnpm run typecheck` passes and each `Static<>` type carries the
core fields plus the app fields.

---

## Task 2 — `origin` on the reactive snapshot

**Files:** `src/engine/engine.ts`,
`src/engine/__tests__/` (new test file)

Test first: an engine built from `fromServerData` with three arguments exposes
`snapshot.origin === { document: undefined, link: undefined, anchors: {} }`; two
successive `getProjectSnapshot()` calls return the identical `origin` object.

Then implement, mirroring `citations` at every step:

- `TProjectOriginData` type + `origin: TProjectOriginData` on
  `TProjectReactiveSnapshot`.
- private `originDocument` / `originLink` / `originAnchors` fields, an
  `originDirty` flag, a `cachedOrigin` record, `getOriginRecord()`.
- accessors `getOrigin`, `setOriginDocument`, `setOriginLink`,
  `addOriginAnchor`, `removeOriginAnchor`, `clearOrigin` — each flipping the
  dirty flag and calling `notifySubscribers()`, exactly as `addCitation` does.
- `buildReactiveSnapshot` includes `origin` in both the cache short-circuit and
  the emitted object.
- `fromServerData` gains an **optional** fourth parameter
  `origin?: { document?; link?; anchors?: TOriginAnchor[] }`, loaded into the
  internal fields without notifications.

**Done when:** the new tests pass and every existing three-argument
`fromServerData` call still compiles.

---

## Task 3 — Enthymeme mutations (changeset-bearing)

**Files:** `src/engine/mutations/origin.ts` (new),
`src/engine/mutations/index.ts`,
`src/engine/mutations/__tests__/origin.test.ts` (new)

Test first, on an argument with **no** origin document:

- marking a premise and a claim expression sets `enthymeme: true` on both;
- unmarking leaves `"enthymeme" in entity === false` on both — the checksum
  invariant, asserted with `in`, not with `=== undefined`;
- each mutation's returned changeset carries the entity under
  `premises.modified` / `expressions.modified`;
- both survive a `fromServerData` round-trip.

Then implement `mutateMarkPremiseEnthymeme` (via `updateExtras`) and
`mutateMarkExpressionEnthymeme` (via `patchExpressionAppFields`, reading the
expression back with `engine.getExpression` and building the
`TCoreEntityChanges` shape by hand — `patchExpressionAppFields` returns `void`).

JSDoc on both names the persistence route: **changeset**, through
`persistChangeset`.

---

## Task 4 — Origin mutations (model-surface)

**Files:** `src/engine/mutations/origin.ts`, `src/engine/mutations/index.ts`,
same test file

`mutateAttachOriginDocument`, `mutateDetachOriginDocument`,
`mutateSetOriginStance`, `mutateAddOriginAnchor`, `mutateRemoveOriginAnchor`,
`mutateAttributeOriginDocument`. Each drives the engine accessors from task 2,
returns the mutated entity, and returns **no** `changes` key.

`mutateDetachOriginDocument` clears link, document, and every anchor together —
replacing a document invalidates its anchors by design.

JSDoc on each names the persistence route: **model surface**, following the
`claimCitations` precedent, *not* the changeset.

Test: attach → snapshot reflects document and link; add two anchors → grouped by
`targetId`; detach → snapshot back to the empty shape.

---

## Task 5 — Tier limits

**Files:** `src/schemas/model/users.ts`, `src/consts/user-tiers.ts`,
`src/consts/__tests__/` (extend the existing suite if one covers tiers)

Add `maxSourceTextChars` and `maxStoredSourceTextChars` to
`UserTierLimitsSchema` and to all five `UserTierLimits` entries, at the values
in the spec's table. `UNVERIFIED` is `0` / `0`.

Test: every entry validates against `UserTierLimitsSchema`, and `UNVERIFIED` is
zero on both new fields.

---

## Task 6 — Suggestion and contradiction derivation

**Files:** `src/engine/origin-derivation.ts` (new),
`src/engine/__tests__/origin-derivation.test.ts` (new)

Test first, the full matrix from the spec's criterion 8, plus the
no-derivation-writes assertion: deep-clone the entity state, run both functions,
assert the state is unchanged.

Then implement `deriveEnthymemeSuggestions` and
`deriveEnthymemeContradictions`, both pure over `TProjectReactiveSnapshot`:

- return `[]` unless `snapshot.origin.link?.stance === "representation"`;
- suggestions cover unanchored, unmarked claim-bound variable expressions and
  premises — premise-bound variable expressions are excluded, because core's
  `P-6` reports a mark on one as a violation;
- contradictions cover content both anchored and marked.

---

## Task 7 — API body schemas

**Files:** `src/schemas/api/argument/origin.ts` (new),
`src/schemas/api/argument/index.ts`

Request and response bodies for attach / detach / patch (stance + reference) /
add-anchor / remove-anchor / mark-enthymeme, plus the `GET …/origin` response
carrying `{ document, link, anchors }` — the same triple the snapshot slice
holds, so the server's read route and the client's snapshot hydration agree by
construction.

No coded error envelope, therefore no `parseResponse` change.

---

## Task 8 — API client functions

**Files:** `src/api-client/argument/origin.ts` (new),
`src/api-client/factory.ts`

Follow `src/api-client/argument/participants.ts` verbatim: `resolveBaseUrl`,
then `strictFetch` with the request and response schemas from task 7. Register
each in the `impls` map.

Test: extend the existing api-client suite to assert each new method exists on a
client built by `createApiClient`.

---

## Task 9 — The capability master

Run the nine `tcw capabilities add … --status Missing` commands from the
request, then set `Planning doc` on each and `Feature=argument-browse` /
`Feature=argument-authoring` per namespace. Reword
`authoring/import-from-source`'s `description.md` for the retained source text,
the derived provenance, the auto-filled platform citation, and the `seed`
stance. Record the deltas in the item's `capabilities.yaml`
(`new:` all nine, `changed:` `authoring/import-from-source`), using the
`proposit-shared/…` path prefix the completion gate accepts.

Do **not** touch `arguments/copy-to-clipboard` — the sibling markdown-export
slice owns that rewording.

**Done when:** `tcw capabilities check` passes and `tcw capabilities show` on
each of the nine reads `Status: Missing` with both fields set.

---

## Task 10 — Documentation sync

`README.md` [Public-API] — the new module names under `schemas/model`,
`engine/`, and `api-client`. `docs/release-notes/upcoming.md` +
`docs/changelogs/upcoming.md`.

No `package.json` `exports` entries: the existing `"./schemas/*"` and
`"./engine/*"` wildcards already cover the new modules with all three
conditions.

---

## Verification

`pnpm run check` (typecheck → lint → test → build) and `tcw capabilities check`.
The build succeeding is what pins `lib: ["ES2022"]`.

## Out of scope

No version bump, no tag, no publish, no push. No work on the sibling
markdown-export slice.
