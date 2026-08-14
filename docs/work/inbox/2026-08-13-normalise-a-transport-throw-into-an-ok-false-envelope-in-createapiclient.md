---
from: proposit-app
---

# Normalise a transport throw into an ok:false envelope in createApiClient

The root-cause fix for a defect class that has now been found **five separate
times** in `proposit-mobile`, in code written by different people at different
times. Fixing it here would close every remaining instance at once and make the
next one impossible.

## Problem

`createApiClient`'s methods return a result envelope (`{ ok: true, value }` /
`{ ok: false, error }`) for anything the server answers — but a **transport
failure throws** instead. `strictFetch` has no `catch`, `parseResponse` has no
`catch`, and a rejected `fetchImpl` propagates straight to the caller.

So every call site has to handle failure two ways: branch on `!result.ok`, *and*
wrap the whole thing in `try/catch`. The envelope's whole promise is that a caller
does not have to do the second one.

On mobile, "Network request failed" is not exotic — it is the ordinary offline
path. On web it is a dropped connection or a proxy hiccup.

## Root cause of the defect class it produces

Consumers reasonably write:

```ts
setBusy(true)
const result = await apiClient.doThing(...)
setBusy(false)
```

A rejection skips `setBusy(false)` entirely. The screen is left permanently busy:
every control disabled, no message, and in at least one case not even a working
"Done" button — the user cannot leave the surface without killing the app.

**Found five times in `proposit-mobile`:** the source-text document sheet, the
source-text content hook, `participants-screen.tsx` (twice), and
`blocked-users-screen.tsx`. All are now fixed with local `try/catch/finally`.

**A sweep then found 17 more of the same shape** across 9 files
(`use-claim-editing.tsx` ×5, `use-premise-editing.tsx` ×4,
`use-inference-editing.tsx` ×2, the two review decision screens,
`review-done-screen.tsx`, `claim-search-picker.tsx`, `report-content-modal.tsx`),
each awaiting the api-client or the review store with no `catch` anywhere in the
file. They will wedge identically.

Nobody is being careless. The API's shape invites the mistake, and **the tests
cannot catch it**: every api-client mock in those screens *resolves*. A rejection
was never in the fixture vocabulary, which is exactly why one defect could appear
five times without a single red test.

## Proposed fix

Catch a rejected `fetchImpl` (and a schema-assert throw, if that is the right call
— decide deliberately and say which) at the factory boundary, and return the
`{ ok: false, error }` envelope the caller already handles, carrying enough detail
to distinguish "no network" from "server said no".

Then a call site's `catch` becomes genuinely unnecessary rather than merely
usually-unnecessary, and the 17 remaining mobile sites stop being latent defects
without anyone touching them.

## Consumer impact

**This changes the contract, so it needs care.** Any consumer currently relying on
a `try/catch` around an api-client call would find that `catch` unreachable — which
is harmless, but the code should be cleaned up rather than left implying a hazard
that no longer exists. Both consumers have such sites today.

Sequencing: land it here, publish, then both consumers repin and drop their local
`catch`es as a follow-up. Do not attempt the consumer cleanup in the same window.

Worth checking whether any consumer *depends* on the throw — e.g. an error
boundary that expects an exception to reach it. A grep of both repos for
`catch` around api-client calls is the cheap version of that check.

## Test cases

- A `fetchImpl` that rejects resolves to `{ ok: false }` with a distinguishable
  error, not a rejected promise.
- A schema-assert failure on the request body behaves per whatever policy is
  chosen — and that policy is stated in the code, not implied.
- An ordinary non-`ok` HTTP response is unchanged.
- A successful call is unchanged.
- Add the case that would have caught the original defect class: a consumer-shaped
  test where the transport rejects and the caller does **not** wrap in `try/catch`.
