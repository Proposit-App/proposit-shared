---
from: proposit-app
---

# Encode path segments in the reaction api-client methods, matching the sibling impls

Found by a code review of `proposit-server`'s adoption of `@proposit/shared@0.68.0`.
Not introduced by that work — the inconsistency is inside this library.

## Problem

`src/api-client/argument/operator-reactions.ts` and
`src/api-client/argument/claim-reactions.ts` interpolate path segments raw:

```ts
`${baseUrl}/api/v1/argument/${argumentId}/${version}/premise/${premiseId}/reactions`
```

Sibling impls in the same package **do** encode — `api-client/tasks/*` and
`api-client/argument/logic/index.ts` both call `encodeURIComponent` on their id
segments. So the package is inconsistent with itself about a rule that only
matters when it is applied everywhere.

The server's local helper, which `0.68.0` replaced, *did* encode:

```ts
// deleted from proposit-server operator-reactions-context.tsx
`/api/v1/argument/${encodeURIComponent(argumentId)}/${version}/premise/${encodeURIComponent(premiseId)}/reactions`
```

So adopting the shared client was a small, silent regression at that call site.

## Root cause

Not a defect anyone can reach today. Both ids are engine/DB UUIDs — `argument.id`
from the argument context, `premiseId` from the engine snapshot — so no value
containing `/`, `?` or `#` can occur, which is why every test is green and why
this was invisible until someone diffed the deleted helper against its
replacement.

## Why fix it anyway

A `?` in a segment silently truncates the path into a query string, so the
request reaches `/premise/<prefix>` and 404s rather than erroring usefully. That
class of bug is nearly unreadable from the symptom, and the guard costs one
function call.

More importantly, "ids are always UUIDs" is an assumption held in the callers, not
in this library. This package is consumed by two apps and is the shared contract;
it should not depend on a property none of its own types enforce.

## Proposed fix

`encodeURIComponent` on the id segments in both files, matching `tasks/*` and
`logic/index.ts`. Leave `version` alone — it is a number.

Worth a sweep in the same pass: check every `api-client/**` impl for the same
split, so the rule ends up applied uniformly rather than in three of four places.
Whatever the outcome, state the convention somewhere it can be checked — a rule
this package follows only sometimes is the shape that produced this.

## Consumer impact

None observable. No shipped behaviour changes for any reachable input; this is
hardening plus internal consistency.

## Test cases

- An id containing `/`, `?` or `#` produces a URL whose path still has the
  expected segment count, and reaches the intended route.
- Existing UUID call sites produce byte-identical URLs to today — the fix must be
  a no-op for every value that actually occurs.
