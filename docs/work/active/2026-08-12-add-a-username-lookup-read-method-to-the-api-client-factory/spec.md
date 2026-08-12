# Spec: Add a username lookup read method to the api-client factory

## Problem

`GET /api/v1/user/search` resolves a handle to a user, and its request/response
bodies already live here (`UsernameSearchRequest` / `UsernameSearchResponse` in
`src/schemas/api/user/index.ts`). What is missing is the client half: the
api-client factory exposes no method for the route, so a client consumer cannot
call it.

Web never needed one — `proposit-server/src/app/profile/[username]/page.tsx`
calls the route from a Server Component with its own
`createUrlWithParameters` + `fetchServer` + `parseResponse`. Mobile is the first
client consumer, and its own guidance forbids a raw `fetch`.

## Goals

1. `apiClient.searchUsername(username)` calls `GET /api/v1/user/search?username=…`
   and returns a parsed `UsernameSearchResponse` result.
2. A handle carrying characters that need URL encoding is encoded **exactly
   once** and resolves the same account as a plain one.
3. An unresolvable handle surfaces the route's 404 as a non-`ok` parsed result,
   not a throw.

## Non-goals

- **No new schema.** Both bodies already exist and are already exported at
  `@proposit/shared/schemas/api/user`. This is an api-client-only gap.
- **No server change.** The route already 404s an unresolvable handle through
  `createErrorResponse`, which `parseResponse` already recognises.
- **No web adoption.** Rewriting the server profile page onto this method is
  behaviour-preserving and optional; it needs a repin, so it is not done here.

## Design

One `*Impl` in a new `src/api-client/user/search-username.ts`, registered in
`factory.ts` under the key `searchUsername`.

```ts
export async function searchUsernameImpl(
    config: TApiClientConfig,
    username: string
)
```

**Read path, so `parseResponse` rather than `strictFetch`.** The request body is
a query string, not a JSON payload, so there is nothing for `strictFetch`'s
pre-send `Value.Assert` to validate. Every other query-parameter read on the
factory (`getUserClaimsImpl`, `getUserCitationsImpl`) is built the same way and
this one matches them rather than inventing a third shape.

**Encoding is `URL.searchParams`, not a hand-rolled `encodeURIComponent`.**
`getUserClaimsImpl` already establishes the pattern:

```ts
const url = new URL(`${baseUrl}/api/v1/user/search`)
url.searchParams.set("username", username)
```

`URLSearchParams` serialises the value once on `toString()`, so a handle like the
curated `Socrates / Plato` goes out as `Socrates+%2F+Plato` and Next's
`request.nextUrl.searchParams` decodes it back to the original string. Composing
the URL by interpolating `encodeURIComponent(username)` would produce the same
result today but re-opens the double-encoding failure the moment somebody wraps
it, and it is the third spelling of a decision already made twice in this file's
neighbours.

`UsernameSearchRequest` is not passed to a validator on this path. It describes
the query shape, which the **server** parses with `Value.Convert` + `Value.Parse`;
the client's single `username: string` argument is the whole request, and the
compiler already types it.

## Acceptance criteria

1. `apiClient.searchUsername("<handle>")` issues exactly one request to
   `<baseUrl>/api/v1/user/search?username=<handle>` and parses a 200 body into
   `{ userId, username, imageURI }`.
2. A handle containing a space and a slash round-trips: the query value decoded
   from the issued URL equals the handle passed in — proving it was encoded once,
   not twice.
3. A 404 from the route resolves to a non-`ok` result carrying the error body;
   the call does not throw.
4. `pnpm run check` is green.

## Risks

- **Double encoding is silent.** It produces a valid URL that resolves nothing,
  so it reads as "no such user" rather than as a bug. Criterion 2 decodes the
  issued URL rather than string-matching it, so it fails on a double encode
  instead of pinning whatever the implementation happens to emit.
