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
