---
from: proposit-server
initiative: typebox-1-3-type-base-removal
---

# proposit-shared: typebox 1.3.x removes Type.Base — migrate or tighten the range

Route to the `proposit-shared` node. A sibling escalation with the same
initiative slug goes to `proposit-core`; the two must land on **one** agreed
resolution, not two independent ones.

**Do not close this as covered by the core escalation.** Shared defines its own
`TDateType` subclass, independently of core's. A core-only fix leaves shared
broken against the same hoisted typebox copy.

## Problem

`@proposit/shared` fails to load at runtime whenever `typebox` resolves to
1.3.x, for the same reason `@proposit/proposit-core` does:
`Class extends value undefined is not a constructor or null`, thrown at
module-evaluation time before any consumer code runs.

## Root cause

`Type.Base` was removed in typebox 1.3.x. Tarball evidence recorded in the
consumer investigation: `build/type/types/base.mjs` is **absent** at 1.3.8, and
`build/typebox.d.mts` no longer re-exports `Base`/`IsBase` (it does at 1.1.14,
line 37).

Shared's own copy of the pattern, at
`node_modules/@proposit/shared/dist/schemas/common.js:12-15`:

```js
// Custom TypeBox types (TDateType extends Type.Base) must be defined locally
// because TypeBox's Value.Check/Parse uses instanceof checks that fail across
// separate pnpm copies of the same package.
export class TDateType extends Type.Base {
```

That comment is the reason a core-only fix is insufficient: the local definition
is deliberate, and it inherits the removal independently.

`@proposit/shared` declares `typebox: "^1.1.14"`, which admits 1.3.x.
`proposit-server` resolves one hoisted copy of typebox for core and shared
together, so a single in-range bump breaks both.

## Proposed fix — one of two, decided jointly with `proposit-core`

1. **Migrate off `Type.Base`.** `Type.Refine`
   (`build/type/types/_refine.d.mts`) covers the `Check`/`Errors` surface;
   `Type.Codec` / `Decode` / `Encode` (`build/type/types/_codec.d.mts`) covers
   the string↔`Date` conversion.
2. **Tighten the range** to `>=1.1.14 <1.3.0` and stay on `Type.Base`.

Whichever is chosen must match core's choice. The two packages share one
resolved typebox in this consumer; a split decision leaves whichever guessed
wrong broken, intermittently and confusingly.

**Worth checking as part of option 1:** if the replacement primitive removes the
`instanceof`-across-copies hazard, the "must be defined locally" constraint may
no longer hold, and shared could re-export core's type instead of duplicating
it. That is a simplification the migration makes available, not a requirement.

## Consumer impact

`proposit-server` pins `typebox` to an exact `"1.1.14"` (`package.json:95`) to
hold the tree green. That pin blocks every typebox bump for the whole repo and
is a workaround, not a position.

The server also carries two `Value.Parse` → `Value.Convert` workarounds
(`src/model/source.ts:20-32`, `src/model/argument/queries.ts:59`) whose comments
record that `Value.Parse` on `TIntersect` schemas containing `Base` types can
fail **for valid values**, because clone/spread strips the `~guard` property.
Option 1 removes those.

## Test cases

- Import `@proposit/shared` with typebox 1.3.x resolved: must not throw at
  module evaluation.
- `Value.Check` / `Value.Errors` on a shared schema carrying a `Date` field:
  same accept/reject behavior as at 1.1.14.
- A `Date` value produced by `@proposit/proposit-core` validating against a
  `@proposit/shared` schema and vice versa — the cross-package case the local
  definition exists for.
- **`Value.Parse` on a `TIntersect` schema containing a date field, for a valid
  value.** The exact shape the consumer workarounds say fails silently today;
  a broad suite will not catch it.

## Cross-reference

Sibling escalation: `proposit-core`, same initiative, same root cause,
`dist/lib/schemata/shared.js:6`.

Consumer work item: `2026-07-28-typebox-1-3-x-removes-type-base-breaking-proposit-proposit-core-at-runtime` (`proposit-server`).
