# Plan: Add a username lookup read method to the api-client factory

Three files, one of them a test. Sequenced TDD.

## Task 1 — Failing test for the method that does not exist

`src/api-client/user/__tests__/search-username.test.ts`, modelled on
`get-user-claims.test.ts` (same `makeJsonResponse` / `urlToString` helpers, same
stub-`fetchImpl` shape).

Three cases:

1. **URL + parsed body** — a 200 stub returns `{ userId, username, imageURI }`;
   assert exactly one call, to
   `https://example.test/api/v1/user/search?username=socrates`, and that the
   parsed result carries the body.
2. **Encoded once** — call with `Socrates / Plato`; take the issued URL, read
   `new URL(issued).searchParams.get("username")`, and assert it equals
   `Socrates / Plato`. Decoding rather than string-matching is the point: a
   double encode yields `Socrates+%2F+Plato` back out and fails, while a literal
   expected-string assertion would just pin whatever was emitted.
3. **404 is a result, not a throw** — a 404 `{ message, statusCode }` stub
   resolves with `ok: false`.

**Fails for the right reason first.** `apiClient.searchUsername` is not a key on
`TApiClient`, so the test does not compile and, at runtime, `searchUsername` is
`undefined` — a missing-method failure, not an assertion mismatch. Confirm that
before writing any implementation.

## Task 2 — `searchUsernameImpl`

New `src/api-client/user/search-username.ts`. `resolveBaseUrl` → `new URL` →
`searchParams.set("username", username)` → `parseResponse(await
config.fetchImpl(url.toString(), { method: "GET" }), UsernameSearchResponse)`.

Relative imports end in `.js`; the schema comes from
`../../schemas/api/user/index.js` (explicit index path).

**Verified by:** Task 1's three cases pass.

## Task 3 — Register on the factory

Import `searchUsernameImpl` in `src/api-client/factory.ts` and add
`searchUsername: searchUsernameImpl` to `impls`, next to the other
`./user/*` entries so the registry keeps its file-grouped order.

No `package.json` `exports` change — the method lands on the existing
`./api-client` entry, and `./schemas/api/user` is already declared.

**Verified by:** `TApiClient` exposes `searchUsername: (username: string) => …`
under `pnpm run typecheck`.

## Task 4 — Green the pipeline

`pnpm run check` (test + typecheck + lint + build).

## Documentation Sync

Evaluated against this repo's tracked docs.

- **`AGENTS.md` — does not fire.** It describes `./api-client` as "the
  `createApiClient` factory and its companion types" without enumerating methods,
  so one more method changes nothing it asserts.
- **`README.md` — does not fire** for the same reason.
- **Release notes / changelog — deferred to the version cut.** This branch does
  **not** bump the version: the whole epic ships in one publish window at
  closeout, and the notes are written there against the full set.

## Verification

What the suite covers: the URL built, the encoding round-trip, the 404 path.

What it does not, and is therefore a follow-up rather than a claim made here:

- **That a real handle resolves against a real server.** The tests stub
  `fetchImpl`, so they prove the client's half of the contract and nothing about
  the route. The route is unchanged and already serves the web profile page.
- **That mobile's deep link works.** That is the mobile slice's own acceptance,
  and it cannot run until the publish window and the repin.
