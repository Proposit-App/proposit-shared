# Outcome: Add a username lookup read method to the api-client factory

## What shipped

`apiClient.searchUsername(username: string)` — a read method for
`GET /api/v1/user/search`.

| File | Change |
| --- | --- |
| `src/api-client/user/search-username.ts` | new — `searchUsernameImpl(config, username)` |
| `src/api-client/factory.ts` | import + `searchUsername: searchUsernameImpl` in `impls` |
| `src/api-client/user/__tests__/search-username.test.ts` | new — 3 cases |

Derived signature on `TApiClient`:

```ts
searchUsername: (username: string) => Promise<
    ParsedSuccess<typeof UsernameSearchResponse> | ParsedError<…>
>
```

No schema was added — `UsernameSearchRequest` / `UsernameSearchResponse` already
existed and are already exported at `@proposit/shared/schemas/api/user`. No
`package.json` `exports` change: the method lands on the existing `./api-client`
entry.

## How it was verified

TDD. The first run failed with `TypeError: apiClient.searchUsername is not a
function` on all three cases — a missing method, not an assertion mismatch —
before any implementation existed.

Two of the three then failed a second time on **my test's** wrong assumptions,
both corrected against the real contracts rather than by loosening the test:

- The success field is `value`, not `data` (`ParsedSuccess` in
  `src/schemas/common.ts:104`).
- The 404 body is `{ errorMessage, errorID, statusCode }` — what the server's
  `createErrorResponse` actually emits (`proposit-server/src/utils/server/utils.ts:224`)
  — not the `{ message }` shape I had guessed. `ErrorResponseSchema` rejected the
  guess by throwing on parse, which is the schema doing its job.

The narrowing in the 404 case (`"statusCode" in result.error`) is not
decoration: `parseResponse`'s error union includes `BudgetExceededErrorBodySchema`,
which has no `statusCode`, so `tsc` refused the unnarrowed read. The web
operator-reactions context narrows identically.

**Encoding, the case the escalation flagged.** The test passes the curated
persona handle `Socrates / Plato` (spaces **and** a slash — the real shape, from
`src/fixtures/historical-figures/index.ts:90`) and then reads the value back out
of the issued URL with `new URL(issued).searchParams.get("username")`, asserting
it equals the input. That fails on a double encode. A literal string comparison
would instead have pinned whatever the implementation emitted, which is the
failure mode that matters here: a double-encoded handle produces a well-formed
URL that resolves nobody, so the bug presents as "no such account".

`pnpm run check` green: 127 files, 1212 tests, typecheck, lint, build.

## What was deliberately not done

- **No web adoption.** `proposit-server/src/app/profile/[username]/page.tsx`
  still calls the route with its own `createUrlWithParameters` + `fetchServer`.
  Switching it to the factory is behaviour-preserving but needs a repin, so it is
  a follow-up for after the epic's publish window.
- **No version bump, no publish.** One publish window for the whole epic, at
  closeout.
- **No live-route test.** The suite stubs `fetchImpl`, so it proves the client's
  half of the contract and nothing about the route — which is unchanged and
  already serves the web profile page.
