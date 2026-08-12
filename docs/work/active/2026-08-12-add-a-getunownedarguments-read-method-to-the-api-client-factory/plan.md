# Plan: Add a getUnownedArguments read method to the api-client factory

Three files change: one test file (new), one impl file, one registry. Worked on
branch `feat/get-unowned-arguments` in
`proposit-shared/.worktrees/get-unowned-arguments`.

## Task 1 — Failing tests first

New file `src/api-client/argument/__tests__/unowned-arguments.test.ts`, modeled
on the sibling `get-all-arguments.test.ts` (a stub `fetchImpl` recording URLs and
returning canned `Response`s; no network, no server).

Cases, one per acceptance criterion:

1. `getUnownedArguments()` requests
   `https://example.test/api/v1/argument/unowned` with `method: "GET"`.
2. A `200 []` response yields `{ ok: true, value: [] }`.
3. A `200` response carrying one argument round-trips: every field
   `unowned-args-list.tsx` reads (`id`, `version`, `title`, `createdOn`,
   `platform`, `platformData.postUrl`) comes back intact. Build the fixture from
   `ArgumentSchema`'s required fields so a schema mismatch fails the test rather
   than passing silently.
4. A `401` rejects — the promise does not resolve with data.
5. `getUnownedArgument(id, version)` requests
   `.../api/v1/argument/unowned/{id}/{version}` and returns the row.
6. A `200 null` from that route yields `{ ok: true, value: null }`.

Run and confirm every case fails for the right reason: the methods do not exist
(a `TypeError`, not an assertion mismatch). A test that fails because the fixture
is wrong proves nothing.

**Verified by:** `pnpm exec vitest run src/api-client/argument/__tests__/unowned-arguments.test.ts`
reports all cases failing, with `getUnownedArguments is not a function` (or the
TypeScript equivalent) as the cause.

## Task 2 — Implement the two methods

In `src/api-client/argument/index.ts`, directly below
`claimUnownedArgumentImpl`:

```ts
export async function getUnownedArgumentsImpl(config: TApiClientConfig)
export async function getUnownedArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
)
```

Both follow the established bodyless-GET shape in this file: `resolveBaseUrl`,
`config.fetchImpl(url, { method: "GET" })`, `parseResponse(resp, schema)`.
Schemas are `Type.Array(ArgumentSchema)` and `Nullable(UnownedArgumentSchema)` —
both already imported or one import line away (`UnownedArgumentSchema` and
`Nullable` come from `../../schemas/model.js` / `../../schemas/common.js`; check
what `model.js` already re-exports before adding a second import path).

**Verified by:** the Task 1 suite goes green with no test edits.

## Task 3 — Wire into the factory

`src/api-client/factory.ts`: add both to the `./argument/index.js` import list
and to the `impls` map, adjacent to the existing `claimUnownedArgument` entry so
the three unowned methods read as a group. `TApiClient` derives from `impls`, so
no type declaration changes.

**Verified by:** `pnpm run typecheck` clean, and a test that calls the methods
through `createApiClient(...)` (which Task 1's tests already do) passes — that
path only exists if the registry entry landed.

## Task 4 — Shape parity with the web consumer

Not a code step; a verification step with a written result.

Cross-read `proposit-server/src/app/profile/unowned-args-list.tsx` against the
fixture from Task 1 case 3 and confirm each field the component dereferences is
present in `ArgumentSchema` and in the response the method returns. Record the
field-by-field mapping in `outcome.md`. This is the only evidence available for
the "no-op for web" claim, because web never calls the route — `profile/page.tsx`
calls `getUnownedArgumentsByUserId` in-process.

**Verified by:** a table in `outcome.md` listing every field read by the
component and where it is satisfied.

## Task 5 — Full check, then submit

`pnpm run check` (test + typecheck + lint + build). Prettier is part of `lint`,
so run `pnpm run prettify` first if it complains.

Then: no `*.tgz` left in the package root (`git status` clean besides the work
artifacts), commit `outcome.md` as its own commit, `tcw work submit`. **Stop
there** — `tcw work complete` is the epic-level human gate's to run, not this
item's.

**Verified by:** `pnpm run check` exits 0, transcript pasted verbatim into
`outcome.md`; `git status --porcelain` shows no untracked tarball.

## Out of scope, recorded

- Normalizing the list route's plain-text `401` so it parses as an error
  envelope. It belongs in `parseResponse` or in the route, both outside this
  item's boundary. Note it in `outcome.md` for the epic to route.
- Publishing. Deferred to epic closeout by design.
- Changing `profile/page.tsx` to consume the new client method. Web is the
  reference implementation in this epic, not a target.
