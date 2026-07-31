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

---

# Rework round 2 — second-review findings

All eight fixed. No pushbacks: I re-tested the one claim I had defended and it
was wrong. Commits `cf87a91` (code + tests) and `3889942` (docs).

## 1 — my `Type.Refine` pushback was wrong. Retracted.

The reviewer is right and I was not. My round-1 probe called
`Type.Refine(type, check, "a string")`; the third argument is an **error
callback**, not a message. Re-run with `() => "…"`:

| | round-1 probe (string error) | correct call |
|---|---|---|
| `Value.Check(bad)` | `true` | `false` |
| `Value.Assert(bad)` | did not throw | threw |
| `Value.Parse(bad)` | did not throw | threw |

So the refinement enforces under all three, and my "it runs nowhere"
conclusion was an artifact of my own call shape. I had published that claim in
two places and it is now removed from both.

`CreateOriginAnchorRequestSchema` is wrapped in `Type.Refine` enforcing
`endCodePoint > startCodePoint`. Three tests: a zero-length span, a backwards
span, and — the reviewer's point about both sides of the wire —
`client.createOriginAnchor(...)` rejecting a backwards span before it reaches
the network, via `strictFetch`'s pre-send `Value.Assert`. That test's
`fetchImpl` throws if called, so it fails loudly if the assertion ever stops
running.

**The real caveat, verified before publishing it this time.** `~refine` holds
functions, so it does not survive serialization:

```
Object.keys(JSON.parse(JSON.stringify(schema))) → ["type", "required", "properties"]
"~refine" in the live schema  → true
"~refine" in the round-tripped copy → false
Value.Check(roundTripped, {a: 40, b: 5}) → true      // accepts the bad value
```

That is recorded in the JSDoc and the changelog: validate against the live
schema object, never a serialized one — which matters to anything emitting
these as OpenAPI or as an LLM structured-output contract. The
span-within-document rule stays a stated server obligation, since the document
is not in the request.

**Process note on myself.** I pushed back on a mechanism after one probe and
did not re-read the signature I was calling. The evidence I offered was real
output from a wrong call. Verifying the call shape before disputing a mechanism
is the lesson, and it is the reason this round has no pushbacks: I re-checked
each finding against the code before writing anything.

## 2 — the P-6 guard ran on unmark

Correct and consequential: the repair action threw on exactly the expressions
needing repair, and an invalid mark *is* reachable (core reports P-6 without
throwing, so the server route and the pipeline can persist one). The guard is
now inside `if (marked)`. Two tests: an operator expression marked directly
through `patchExpressionAppFields` then cleared through the mutation, and the
same for a premise-bound expression. My round-1 test unmarked a claim-bound
expression and never reached the guard, as the report said.

## 3 — `fromServerData` bypassed the anchor guard

Correct. Fixed the way the report suggested — one rule, one place: the guard
and the map insert moved into a private `insertOriginAnchor`, which
`addOriginAnchor` calls before notifying and the load path calls without
notifying, preserving `fromServerData`'s no-notifications contract. Two tests:
anchors with `document: null`, and anchors into a document other than the
attached one.

## 4 — `result.expression` still aliased

Correct, and the same defect one field over. One `{ ...patched }` now feeds
both `expression` and `changes.expressions.modified[0]`. Test: stash
`result.expression`, toggle the mark again, assert the stashed object still
reads `true`.

## 5 — optional tier limits leaked into every consumer

Correct. `UserTierLimits` is typed `Record<UserTierValues,
Required<TUserTierLimits>>`, which makes the JSDoc true and drops the `!` from
the invariant test — the casualty the report predicted. The absent-vs-zero
contract is now stated in the schema JSDoc and the release notes: **absent**
means the server predates the feature, so hide the attach surface; **zero**
means the tier genuinely allows none, so show the upgrade prompt. Different
screens, and they were about to be guessed.

## 6 — the reaping obligation was documented where nobody would look

Correct — it sat on a read accessor. Now a bullet in the changelog's *Changed*
section, naming the leak, why in-memory readers do not see it, and the required
behavior (delete anchors in the same transaction as the entity). The JSDoc
stays where it is as well.

## 7 — the `!variable` branch misreported the cause

Correct. Split, with its own message naming the missing variable, matching how
core classifies it (Structural, not P-6 — `presentable.js` skips an undefined
variable rather than reporting it). **No dedicated test**, deliberately: a
dangling `variableId` is not reachable through this engine's public API —
`addVariable`/`bindVariableToPremise` validate the reference and
`removeVariable` cascades its expressions — which is precisely why core treats
it as an invariant violation rather than a grammar one. Testing it would mean
corrupting engine state to assert a message string. With finding 2 fixed, the
second half of the report's concern is gone anyway: this branch no longer runs
on unmark, so it can no longer strand anything.

## 8 — the operator fixture's shape was unpinned

Correct. The test now asserts `getExpression(operatorExpressionId).type ===
"operator"` before exercising the guard, and matches the narrower
`/is operator, not a claim/` rather than the message `formula` shares.

## Consumed surface — one change, and it is a tightening

`CreateOriginAnchorRequestSchema` now **rejects** `endCodePoint <=
startCodePoint`, client-side as well as server-side. A consumer sending a
zero-length or backwards span gets a thrown `Value.Assert` from
`createOriginAnchor` where it previously got a network round-trip. Nothing
that was sending valid spans is affected, and the TypeScript type
`TCreateOriginAnchorRequest` is unchanged.

Everything else is unchanged since the previous report: the snapshot shape and
its optionality, all eight mutation signatures and the persistence split, all
eight client signatures and their return shapes, every other request and
response schema. `UserTierLimits`' annotation went from `TUserTierLimits` to
`Required<TUserTierLimits>`, which is a widening for readers — the two fields
stop being `number | undefined` — and breaks nothing.

Newly enforced preconditions, added this round: `fromServerData` throws on an
anchor that does not belong to the document it is given (previously only the
mutation path checked). A server slice loading an argument whose document was
deleted without cascading its anchors will now see that at load rather than in
the export.
