# Outcome — Origin data schemas, mutations, and capability master

Branch `origin-data-schemas`, off `main`. Ten commits, one per task. No version
bump, no tag, no publish, no push — the shared release is deliberately deferred
and bundled with the sibling markdown-export slice.

## What shipped

| Commit    | Task                                                                |
| --------- | ------------------------------------------------------------------- |
| `c79917e` | adopt the item (inbox doc → tracked item)                            |
| `409ac16` | `spec.md`                                                            |
| (plan)    | `plan.md`                                                            |
| `28bac02` | Task 1 — app schemas over core's origin entities                     |
| `fcde132` | Task 2 — `origin` on the reactive snapshot                           |
| `ddbde3c` | Tasks 3+4 — enthymeme and origin-library mutations                   |
| `07bd8c9` | Task 5 — the two source-text tier limits                             |
| `2d06c03` | Task 6 — suggestion and contradiction derivation                     |
| `2d83290` | Task 7 — API body schemas                                            |
| `8336bc1` | Task 8 — api-client functions + factory registration                 |
| `e9a49f5` | Task 9 — the nine capability entries + the reworded import entry     |
| `8957bc0` | Task 10 — README, release notes, changelog                           |

## The surface the consumer slices plan against

**Snapshot** — `TProjectReactiveSnapshot.origin: TProjectOriginData`, exported
from `@proposit/shared/engine/engine`:

```ts
{
    document: TOriginDocument | undefined
    link: TOriginLink | undefined
    anchors: Record<string, TOriginAnchor[]>   // keyed by anchor.targetId
}
```

`document` and `link` are scalars because the product allows at most one source
text per argument version. `anchors` is keyed by `targetId` — an expression id,
a premise id, or the argument id.

**Engine accessors** — `getOrigin`, `setOriginDocument`, `setOriginLink`,
`getOriginAnchorsForTarget`, `addOriginAnchor`, `removeOriginAnchor`,
`clearOrigin`. `fromServerData` takes an optional fourth argument
`{ document?, link?, anchors? }`; every existing three-argument call site is
untouched.

**Mutations** (`@proposit/shared/engine/mutations`), split by persistence route:

- Changeset — persist through `persistChangeset`:
  `mutateMarkPremiseEnthymeme`, `mutateMarkExpressionEnthymeme`.
- Model surface — the `claimCitations` precedent, **not** the changeset:
  `mutateAttachOriginDocument`, `mutateDetachOriginDocument`,
  `mutateSetOriginStance`, `mutateAddOriginAnchor`, `mutateRemoveOriginAnchor`,
  `mutateAttributeOriginDocument`.

**Derivation** (`@proposit/shared/engine/origin-derivation`) —
`deriveEnthymemeSuggestions(snapshot)` and
`deriveEnthymemeContradictions(snapshot)`, pure and mutation-free.

**Schemas** — `@proposit/shared/schemas/model/origin` and the origin bodies on
`@proposit/shared/schemas/api/argument`.

**Client** — `getArgumentOrigin`, `attachArgumentOrigin`,
`updateArgumentOrigin`, `detachArgumentOrigin`, `createOriginAnchor`,
`deleteOriginAnchor`, `markPremiseEnthymeme`, `markExpressionEnthymeme`.

## Verification

`pnpm run check` — exit 0. Typecheck clean, prettier clean, eslint clean,
**115 test files / 1086 tests passed**, build wrote `dist/`.

`tcw capabilities check` — `capabilities OK`, exit 0, with all nine entries
reading `Status: Missing`, the right `Feature`, and the `Planning doc`
back-pointer.

`lib: ["ES2022"]` — the build succeeding is the enforcement point; a grep over
the five new `dist/` modules plus `dist/engine/engine.js` and
`dist/consts/user-tiers.js` for `window` / `document.` / `process.` / `Buffer` /
`require(` returns nothing.

Derivation matrix, all four cases, in
`src/engine/__tests__/origin-derivation.test.ts`: no document → `[]`; `seed` +
unanchored → `[]`; `representation` + unanchored → one suggestion per unanchored
claim-bound variable expression and premise; `representation` +
anchored-and-marked → a contradiction. Plus a dedicated test that running both
derivations leaves the serialized snapshot byte-identical and every entity
without an `enthymeme` key.

The `null`-versus-absent checksum invariant is pinned by two tests asserting
`"enthymeme" in entity === false` after mark-then-unmark, on both a premise and
an expression.

## What the request got wrong, and what changed as a result

1. **No new `package.json` `exports` subpaths were needed.** The request's
   *Documentation Sync* section predicted them and warned about the `default`
   condition. The existing `"./schemas/*"` and `"./engine/*"` wildcards match
   across path separators, so `@proposit/shared/schemas/model/origin` and
   `@proposit/shared/engine/origin-derivation` already resolve, and both
   wildcards already declare `types`, `import`, **and** `default`. Nothing to
   add and nothing to break.

2. **No `enthymeme` schema work was needed.** The request's §1 implied
   app-extension across the board. Shared's premise and expression schemas
   already intersect core's, so `Type.Optional(Type.Literal(true))` is inherited
   verbatim, including its refusal of `null` and `false`.

3. **No new Vocabulary entries were needed.** The epic spec's Notes assign
   vocabulary registration to slices A and C. Core's slice A already registered
   `origin-data`, `origin-document`, `origin-link`, `origin-stance`,
   `origin-anchor`, and `enthymeme`, and this node federates from
   `proposit-core` — `tcw taxonomy list` shows all six as `(proposit-core)`.

4. **`patchExpressionAppFields` returns `void`, not a changeset.** The request
   said the enthymeme mutations "return a `ProjectChangeset`". The premise route
   (`updateExtras`) does; the expression route does not, so
   `mutateMarkExpressionEnthymeme` reads the patched expression back off the
   engine and assembles the `TCoreEntityChanges` shape itself. The mutation's
   external contract is unchanged; the mechanism is not what the request assumed.

5. **A pre-existing fixture needed updating.** Adding the two tier fields broke
   `src/api-client/user/__tests__/get-current-user.test.ts`, whose inline
   `limits` object no longer satisfied `UserTierLimitsSchema`. Fixed in the docs
   commit's run; caught by `pnpm run check`, not predicted.

## Deliberately not done

- **`arguments/copy-to-clipboard` (`cap-778431`) is untouched.** The request
  assigns its rewording to the sibling markdown-export slice.
- **`import-origin` was not linked to `origin-document`.** The epic spec's Notes
  suggest linking the two adjacent Vocabulary terms. `tcw taxonomy` has no `set`
  subcommand, so this would be a hand-edit of a `relatesTo` field that is
  single-valued today and would have to hold a cross-project reference. No
  acceptance criterion depends on it. Left for whoever wants it, deliberately
  rather than by omission.
- **No coded error envelope was introduced**, so `parseResponse` at the root
  normalizer is unchanged. If the server slice finds it needs one for the
  tier-limit refusals, that is a change request back to this node — a schema
  plus a type guard without a `parseResponse` branch leaves the guard
  unreachable.

## Open question for the reviewer

The two tier-limit values (`maxSourceTextChars`, `maxStoredSourceTextChars`)
were chosen without usage data — the epic's *Open questions* §3 names this slice
as their owner but supplies no numbers. `UNVERIFIED` is `0`/`0`; `FREE` and
`NO_ASSIST` `20_000`/`200_000`; `PREMIUM` `100_000`/`5_000_000`; `ENTERPRISE`
`500_000`/`100_000_000`. They are constants in a published library, so revising
them is a version bump rather than a migration, but they should be looked at
before the release goes out.

---

# Rework — dual-review findings

Nine findings. Seven fixed as described, two pushed back on with evidence
(finding 5's second half; finding 9b's mechanism). Commits `8b19681` (code +
tests) and `7bc96e3` (docs).

## Fixed

**1 — replacing a source text kept the old document's anchors.** Real, and the
worst of the nine: the export would quote a passage absent from the attached
document and attribute it to that document. Fixed at the root rather than in
the mutation the report named — `setOriginDocument` now clears anchors whenever
the document **id** changes, so every caller is covered, while re-writing the
same document (how `mutateAttributeOriginDocument` applies a reference) keeps
them. Added a second guard in `addOriginAnchor` rejecting an anchor whose
`documentId` is not the attached document's, and a mismatch check in
`mutateAttachOriginDocument` for `link.documentId`. The parallel-origin-store
asymmetry against core's `OriginLibrary` is now stated in `addOriginAnchor`'s
JSDoc. Four tests: replace-drops-anchors, attribute-keeps-anchors,
stray-link-refused, foreign-anchor-refused.

**2 — the expression mark had no P-6 guard.** Fixed: `type !== "variable"` and
non-claim-bound both throw, matching the not-found throw style. Two tests, one
per half. This needed an operator expression in the shared fixture, which is
now built by wrapping the claim-bound expression rather than creating a
childless operator (core collapses those).

**3 — the derivation gate ignored `document`.** Fixed:
`snapshot.origin?.document !== undefined && …stance === "representation"`. Two
tests — a link outliving its document, and a snapshot with no origin slice at
all. The release note that reads "and one with no source at all — reports none"
was aspirational before this fix and is now true, so it stands as written.

**4 — `null` on the wire vs `undefined` in the snapshot.** Fixed by widening
`fromServerData` rather than changing the response schema, so the wire keeps
the explicit-`null` style the rest of this codebase uses (`Nullable(...)`
appears throughout `schemas/api`) and `undefined` never has to survive a JSON
round-trip it cannot. Two tests write the exact consumer line the report
predicted — `fromServerData(snap, [], [], read.value)` — one populated, one
nulled, asserting `createdOn` decodes to a real `Date` and that `null` becomes
`undefined` rather than being stored.

**5 (first half) — the changeset aliased live engine state.** Real. Fixed with
`modified: [{ ...expression }]`, plus a test that captures a changeset, mutates
again, and asserts the captured entity still reads `true`.

**6 — the two deletes swallowed every error.** Fixed: both now return a body
and route through `parseResponse`, following the `deleteClaim` /
`deleteClaimCitation` precedent rather than the `removeArgumentParticipant`
wart. Added `DetachOriginResponseSchema` (naming the anchors that went with the
document, which a rollback needs) and `DeleteOriginAnchorResponseSchema`. Test:
a 403 yields `ok: false`.

**7 — `origin` was required.** Fixed: optional, with the `?.` at every reader
including the derivation. The self-contradiction the report identified is gone
— `render/markdown.ts`'s defensive optional-chaining is now load-bearing rather
than dead. The breaking-change line is in the changelog's *Changed* section.

**8 — new required tier fields.** Fixed: both `Type.Optional`, with the reason
and the "required in a later release" commitment in the schema comment, the
changelog, and the release notes. Test: a `/me` limits body lacking both fields
parses. The invariant test is kept, with presence assertions ahead of the
comparison.

**9a — anchor reaping.** Not implemented; documented as the persistence
layer's job on `getOriginAnchorsForTarget`, which the report offers as an
acceptable resolution. Hooking every delete path is real code for something
inert in memory — derivation and the export both walk live content — and the
server has to delete the rows in the same transaction regardless.

**9c — invalid golden anchor.** Real: `"Therefore\nSocrates is mortal."` is
absent from `ORIGIN_DOCUMENT_TEXT`, so `indexOf` returned `-1`. Changed to
`"Socrates is a man.\nTherefore Socrates is mortal."`, which genuinely spans
the newline, and updated the inline golden. Added a test asserting **every**
golden anchor slices back out to its own `exact` via core's
`sliceByCodePoints` — the invariant core's library enforces — so this cannot
drift again.

**9d — the populated read was untested.** Covered by the two finding-4 tests
above.

## Pushed back on

**5, second half — the checksum comment is correct as written; do not weaken
it.** The report states that under this app's `CHECKSUM_CONFIG`,
`expressionFields` is an allowlist of `premiseId`/`createdOn`/`creatorId` and
that marking changes no checksum. Both halves are false. `createChecksumConfig`
**unions** the app's extra fields onto core's per-entity defaults rather than
replacing them, and core 3.4.0 added `enthymeme` to those defaults. Measured:

- effective `expressionFields` = `type, parentId, position, argumentId,
  argumentVersion, premiseId, variableId, operator, enthymeme, createdOn,
  creatorId`
- expression checksum `17b44ed7` → `64d8cfc3` on mark
- premise checksum `5d3924b3` → `4c2eb3ef` on mark

Rewriting the comment to say the mark is checksum-neutral would have removed
the only in-code statement of the epic's highest-severity risk, and invited a
future reader to persist `enthymeme: null` believing it harmless. The comment
is instead **strengthened** to name the union behavior explicitly, and pinned
by two new tests: one asserting `enthymeme` is in the effective config, one
asserting a mark changes both checksums and an unmark restores them *exactly*.
That second test is the epic's acceptance criterion 6 for this node.

**9b — the span constraint cannot go in the schema, and `Type.Refine` would
have been worse than nothing.** `Type.Refine` exists in typebox 1.3.8, but its
`~refine` predicate is ignored by `Value.Check`, `Value.Parse`, **and**
`Value.Assert` — verified in-process, before any package boundary is involved:
a schema refining `b > a` accepts `{a: 40, b: 5}` under all three. Shipping it
would have put a constraint in the contract that runs nowhere, which is the
same failure shape as a coded error envelope with no `parseResponse` branch.
What shipped instead: `endCodePoint` gets `minimum: 1` (real, and a schema can
say it), and the JSDoc states both the cross-field rule and the
span-within-document rule as server obligations — the latter being one the
schema could never carry, since the document length is not in the request.

## Surface change since the previous report

**Yes — three changes the consumer briefs must absorb.**

1. `TProjectReactiveSnapshot.origin` is now **optional**. Readers must write
   `snapshot.origin?.document` / `snapshot.origin?.anchors[id]`.
2. `fromServerData`'s fourth parameter accepts `null` on `document` and `link`,
   so `client.getArgumentOrigin(...)`'s `.value` feeds in directly. This is a
   widening — nothing that compiled before stops compiling.
3. `detachArgumentOrigin` and `deleteOriginAnchor` now return
   `parseResponse`-shaped results (`{ ok, value }` / `{ ok, error }`) instead
   of `void`. **This one breaks a caller written against the previous report.**

Everything else is unchanged: the snapshot's inner shape, all eight mutation
signatures and their persistence split, the other six client signatures, and
every request schema. Two response schemas were added
(`DetachOriginResponseSchema`, `DeleteOriginAnchorResponseSchema`); none
changed.

Newly enforced preconditions the server slice must satisfy — these throw rather
than degrading: an attach's `link.documentId` must equal `document.id`; an
anchor's `documentId` must equal the attached document's; only a claim-bound
variable expression may be marked.

## Recorded, not implemented — the tier-limit error envelope

There is no coded error envelope for a tier-limit rejection, and none was
added. The gap is real: the attach route exists partly to enforce
`maxSourceTextChars`, so the server will return the generic `ErrorResponse` and
a client wanting to say "that text is too long — the limit is N characters"
must string-match `errorMessage`, which is not a contract.

**Recommendation: add one, at the epic level rather than here.** The right
shape is the existing optional `errorCode` discriminant on `ErrorResponseSchema`
(`src/schemas/common.ts:92`) carrying something like
`SOURCE_TEXT_LIMIT_EXCEEDED`, plus the limit and the measured length as fields,
so a client can render the number without parsing prose. That is a smaller
change than a new envelope type and needs no `parseResponse` branch, because
`errorCode` already rides the error path that `parseResponse` parses today.

If a genuinely new coded envelope is chosen instead, it needs a **detection
branch in `parseResponse` at the root normalizer** — a schema plus a type guard
alone leaves the guard unreachable. Whoever takes that decision should make it
once for the epic, since the same shape will serve the ingestion budget refusals
already in flight.
