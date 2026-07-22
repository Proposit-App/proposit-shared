# Outcome — Ordering fields on the arguments list request

Shipped as `@proposit/shared` **0.47.0** (not published — tarball only).

## Schema

`src/schemas/api/argument/index.ts` gained two exported TypeBox unions, matching
the repo's existing `Type.Union([Type.Literal(...)])` style:

- `ArgumentOrderBy` — `"popularity" | "createdOn" | "title"`
- `ArgumentOrderDirection` — `"asc" | "desc"`

plus `TArgumentOrderBy` / `TArgumentOrderDirection`, and on
`GetAllArgumentsRequestSchema`: `orderBy` and `orderDirection`, both optional
with **no default** — so a request carrying neither validates and serializes
byte-for-byte as before.

`orderByPopularity` is semantically untouched, deliberately: server and mobile
must be able to repin independently rather than in lockstep. Its JSDoc now
records that `orderBy` supersedes it when both are present, and `orderBy`'s
JSDoc states it wins (the server enforces).

## `createdOn` was already there

The planning assumption was that the list response might lack a creation
timestamp. It does not: the list is `Type.Array(ArgumentWithMetadataSchema)`,
and `ArgumentSchema` (`src/schemas/model/arguments.ts`) already declares
`createdOn: EncodableDate` as **required**, separately from `publishedOn`. So
`parseResponse` would already reject a response missing it — no schema change
needed.

Mobile's `TArgumentSummary` narrowing is a mobile-local type; widening it
belongs to the mobile slice, not here.

## api-client

`GetAllArgumentsParams` gained the two fields, typed by importing from the
schema module rather than re-declaring the unions. `getAllArgumentsImpl` already
serializes params through a generic `Object.entries` loop that skips
`undefined`, so no serialization code changed at all.

## Verification

`pnpm run check` exit 0 (prettier + eslint + tsc + 846 tests / 100 files +
build), run both before the version bump and after the doc rotation.

Tests cover: a request with neither field validating and surviving
`Value.Clean` unchanged (no injected keys); `orderByPopularity` alone still
accepted; both together accepted; every `orderBy` / `orderDirection` value
accepted; unknown values rejected; and the api-client emitting the new params in
the query string while producing the exact pre-existing URL when they are
absent.

## Release

Version **0.47.0**. `pnpm version` auto-created a `v0.47.0` tag; deleted, since
tagging is the publish trigger and publishing is the user's step. Tarball packed
and moved out of the package root (a stray `*.tgz` there makes `pnpm publish`
fail with EUSAGE).

Peer dep on `@proposit/proposit-core` left at `^3.1.0` — this build does not
need 3.2.0.

**Not published, not tagged.**
