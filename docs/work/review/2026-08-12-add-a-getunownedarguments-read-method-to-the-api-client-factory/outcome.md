# Outcome: Add a getUnownedArguments read method to the api-client factory

Branch `feat/get-unowned-arguments`, worktree
`proposit-shared/.worktrees/get-unowned-arguments`. Not published, not pushed —
both deliberate (the epic holds a single publish window at closeout).

## What shipped

Two methods on the api-client factory, and nothing else. No new schema, no new
sub-path export, no server change.

```ts
// src/api-client/argument/index.ts
export async function getUnownedArgumentsImpl(config: TApiClientConfig)
export async function getUnownedArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number
)
```

As seen by a consumer (`config` is bound away by `createApiClient`):

```ts
apiClient.getUnownedArguments(): Promise<ParsedSuccess<TArgument[]> | ParsedError<…>>
apiClient.getUnownedArgument(argumentId: string, version: number)
    : Promise<ParsedSuccess<TUnownedArgument | null> | ParsedError<…>>
```

Wired in `src/api-client/factory.ts` as `getUnownedArguments` /
`getUnownedArgument` in the `impls` map, immediately above the existing
`claimUnownedArgument`, so all three unowned methods read as one group.
`TApiClient` derives from `impls`, so no type declaration needed changing.

Files touched:

| File                                                        | Change            |
| ----------------------------------------------------------- | ----------------- |
| `src/api-client/argument/index.ts`                            | +2 impls, +1 import |
| `src/api-client/factory.ts`                                   | +2 imports, +2 registry entries |
| `src/api-client/argument/__tests__/unowned-arguments.test.ts` | new, 6 cases      |

Schema choices, both reusing what already existed:

- List → `Type.Array(ArgumentSchema)`. Not `ArgumentWithMetadataSchema`: the
  route selects `arguments.*` with no reaction-count join, so `upvotes` /
  `downvotes` are absent and the wider schema would reject every real response.
- Single → `Nullable(UnownedArgumentSchema)`. The route answers `200` with a JSON
  `null` for a miss; a non-nullable schema would turn an ordinary empty state
  into a parse failure.

## Shape parity with the web consumer

`proposit-server/src/app/profile/unowned-args-list.tsx` declares
`unownedArgs: TArgument[]` and dereferences six fields. Each is present in
`ArgumentSchema` and survives the round trip — asserted by the
`returns full arguments carrying every field the web list renders` test, whose
fixture is a hand-written wire body rather than a generated one, so a schema
change that would break the list fails here.

| Field read by the component | Line | In `ArgumentSchema` via | Round-trip result |
| --- | --- | --- | --- |
| `arg.id`           | 55, 33 | `CoreArgumentSchema.id` (`UUID`)      | asserted |
| `arg.version`      | 55, 33 | `CoreArgumentSchema.version`          | asserted |
| `arg.title`        | 66     | `title: Type.String()`                | asserted |
| `arg.createdOn`    | 68     | `createdOn: EncodableDate`            | decodes to a real `Date` |
| `arg.platform`     | 85     | `platform: ArgumentPlatform`          | asserted (`"twitter"`) |
| `arg.platformData` | 78     | `platformData: Nullable(Union([…]))`  | `postUrl` asserted |

The `createdOn` row is the one that could have gone wrong quietly.
`parseResponse` runs `Value.Decode`, which rehydrates `EncodableDate` into a
`Date`; the page today gets a Knex `Date` from an in-process model call. So both
paths hand `<LocalDate date={…}>` the same type. ESLint confirmed it
independently — an `as Date` assertion in the test was flagged
`no-unnecessary-type-assertion`, i.e. the value is already statically a `Date`.

**Caveat on "no-op for web", stated plainly.** Web does not call this route at
all: `proposit-server/src/app/profile/page.tsx:60` calls
`getUnownedArgumentsByUserId({ userId })` directly in a Server Component. The
parity claim is therefore about *shape*, verified against the component's prop
type and its field reads — not about swapping an existing fetch. Adopting the
client on web remains possible and unblocked, but is untested here and is out of
this item's scope (the epic makes web the reference, not a target).

## Verification

`pnpm run check` (typecheck → lint → test → build), verbatim tail:

```
> @proposit/shared@0.67.0 prettify:check
> pnpm exec prettier --cache --check .

Checking formatting...
All matched files use Prettier code style!

> @proposit/shared@0.67.0 test
> pnpm exec vitest run

 RUN  v4.1.4

 Test Files  126 passed (126)
      Tests  1209 passed (1209)
   Start at  16:49:52
   Duration  8.74s

> @proposit/shared@0.67.0 build
> pnpm run gen:fixtures && rm -rf dist *.tsbuildinfo && pnpm exec tsc -p tsconfig.build.json

gen:fixtures — wrote src/fixtures/historical-figures/content.generated.ts (4 figures, 4 arguments)
```

Tests were written first and confirmed failing for the right reason — all six
reported `TypeError: apiClient.getUnownedArguments is not a function` /
`apiClient.getUnownedArgument is not a function`, not an assertion mismatch —
then went green with no edits to the test file beyond removing the redundant
`as Date` that ESLint flagged.

Targeted run:

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Acceptance criteria, each to its evidence:

| Criterion | Evidence |
| --- | --- |
| GETs the auth-scoped list route, absolute URL | `GETs the auth-scoped list route with an absolute URL` |
| Empty, not an error, when nothing is claimable | `returns an empty list, not an error, …` → `{ ok: true, value: [] }` |
| Unauthenticated caller rejected | `rejects an unauthenticated caller rather than yielding data` |
| Shape matches `unowned-args-list.tsx` | `returns full arguments carrying every field the web list renders` + the table above |
| Single read returns the row, or `null` | two `apiClient.getUnownedArgument` cases |
| `pnpm run check` passes | transcript above |

Built output carries both methods — checked by content, not by version:

```
dist/api-client/factory.js:39:    getUnownedArguments: getUnownedArgumentsImpl,
dist/api-client/factory.js:40:    getUnownedArgument: getUnownedArgumentImpl,
```

No `*.tgz` in the package root; `git status --porcelain` shows only the tracked
work artifacts.

## Known wart, not fixed here — needs routing

**The list route's `401` is plain text, so it throws instead of returning an
error envelope.** `proposit-server/.../argument/unowned/route.ts:9` answers
`new Response("Unauthorized", { status: 401 })`. `parseResponse` calls
`await response.json()` before the `response.ok` branch, so a non-JSON body
raises a `SyntaxError` rather than yielding `{ ok: false, error }`. The
unauthenticated caller *is* rejected — the acceptance criterion holds, and the
important property (never resolving with an empty list, which would read as
"nothing claimable") is pinned by test — but mobile will catch a parse error
rather than branch on a typed envelope.

It is the only route in `src/app/api/v1/` doing this; every sibling goes through
`refuseWrite` → `createErrorResponse`, which emits a proper `TErrorResponse`.
Left alone deliberately: the fix belongs either in that route or in
`parseResponse` as the root normalizer, and both sit outside this item's stated
boundary ("the api-client read method and its schema only… no server changes").
Worth a `proposit-server` item; the one-line change is to use `refuseWrite(request)`.

## Not done, and why

- **Not published.** Explicitly deferred to the epic's single publish window.
  Mobile consumes this via a `file:` tarball pin until then.
- **Not pushed.** Commits are local on `feat/get-unowned-arguments`.
- **Not completed.** `tcw work submit` only — `tcw work complete` belongs to the
  epic-level human verification gate.
- **No capability flip.** `proposit-shared/arguments/claim-my-external-post-argument`
  is already `Supported` in this node's master; the `Missing` reading is a
  mobile-node override that the owning mobile slice clears.
