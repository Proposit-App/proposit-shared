# Outcome — engine derive/render/algebra/overlay layer (+ folded items A & B)

The derived-view layer shipped in v0.44.0. Two additional cross-repo items were
folded into the same unreleased v0.44.0 per the epic owner's decision.

## Item A — reaction/stance optimistic math graduated into shared

New module `src/engine/optimistic/claim-stance-state.ts`, re-exported from
`@proposit/shared/engine/optimistic`. Ported **byte-identical** from mobile's
canonical `src/arguments/claim-stance-state.ts` (the tested source, with
`claim-stance-state.test.ts`); only the two import lines were rewritten to
shared-local relative `.js` paths.

New exports from `@proposit/shared/engine/optimistic`:

- `type TStanceBucket = "affirm" | "disagree" | "neutral"`
- `type TClaimReactionState = { counts: TClaimReactionStanceCounts; own: TClaimReactionSelection | null }`
- `bucketOf(value: boolean | null): TStanceBucket`
- `applyStance(state: TClaimReactionState, value: boolean | null, reasonCode: TClaimReasonCode): TClaimReactionState`
- `clearOwn(state: TClaimReactionState): TClaimReactionState`

Source ported from: `proposit-mobile/src/arguments/claim-stance-state.ts`.

### Server divergence found (server adopts shared's mobile-based version)

Server duplicates the same logic in
`proposit-server/src/app/view/[argumentId]/[version]/contexts/claim-reactions-context.tsx`
(local `bucketOf` / `applyStance` / `clearOwn`). Divergences vs mobile:

1. **No `Math.max(0, …)` floor on the old-bucket decrement in `applyStance`.**
   Server does `if (state.own) counts[bucketOf(state.own.value)] -= 1`
   unconditionally. On the inconsistent edge case (own set while that bucket's
   count is already 0), server can emit a **negative** count; mobile floors it
   to 0. (Server's `clearOwn` already floors — only `applyStance` diverges.)
2. **No same-bucket short-circuit.** Server always decrements the old bucket and
   increments the new even for a same-bucket reason change; mobile returns early
   with counts untouched. Net result is identical except via the negative-count
   path in (1).
3. **Looser `reasonCode` type** (`string`) vs mobile's `TClaimReasonCode`.

Resolution: shared ships **mobile's tested behavior** (floored, short-circuited,
narrow reason type). Server adopts `@proposit/shared/engine/optimistic` on its
own slice and deletes its local copy; the floor removes the latent negative-count
edge case.

### Golden coverage

- Shared fixtures appended to `src/engine/__tests__/derived-view-goldens.ts`:
  `stanceGoldenStart`, `stanceGoldenScript` (a scripted op sequence hitting every
  reducer branch in order), `stanceGoldenFloorStart` (the floor edge case), and
  `type TStanceGoldenOp`. Structurally typed — no coupling to the reducer's own
  type declarations — so consumers can import and replay them.
- Locked assertion test:
  `src/engine/optimistic/__tests__/claim-stance-state.test.ts` folds the golden
  script and asserts the exact state sequence, plus bucket mapping, immutability,
  the same-reference no-op clear, and the floored decrement. Consumers replay the
  same golden against their local copy and diff the output to prove byte-identical
  before deleting it. (5 tests, green.)

## Item B — coded conflict envelope for publish/archive

New shared contract (additive; no existing schema touched):

- **Schema module** `src/schemas/api/mutation-conflict.ts` → subpath
  `@proposit/shared/schemas/api/mutation-conflict` (mirrors the
  `grammar-violations` layout).
  - `MutationConflictResponseSchema` / `type TMutationConflictResponse`
  - `MutationConflictCodeSchema` / `type TMutationConflictCode`
- **Type guard** `src/api-client/mutation-conflict.ts` →
  `isMutationConflictError(err): err is TMutationConflictResponse`, re-exported
  from `@proposit/shared/api-client` (mirrors `isGrammarViolationsError`).

Envelope shape:

```ts
{
  error: "MUTATION_CONFLICT",              // stable discriminator
  code: TMutationConflictCode,             // the specific conflict
  message: string                          // server's human-readable text
}
```

`code` enum values — named from the **actual** server throw sites (there is no
"already archived" condition; archive is idempotent-by-design, so it was NOT
invented):

| code | server condition (proposit-server) | current status |
|------|-----------------------------------|----------------|
| `ALREADY_PUBLISHED` | `model/argument/lifecycle.ts:747` — publish on `arg.published === true` ("Argument is already published, cannot publish again") | currently a **500** (unmatched `throw new Error`) |
| `PUBLISHED_VERSION_NOT_ARCHIVABLE` | `lifecycle.ts:300` — archive on a published version ("Cannot archive a published argument version") | currently **409** via a brittle message-substring regex in `handleMutationError` |
| `PUBLISH_VERSION_CONFLICT` | `lifecycle.ts:788` — publish update affected ≠ 1 row / lost-update race ("Failed to publish old argument") | currently a **500** |

### EXACT server-emit shape (proposit-server adoption slice)

Mirror `respondWithViolations` (`src/utils/server/utils.ts:198`) — a single
funnel emitting the discriminated envelope at HTTP **409**:

```ts
import type {
    TMutationConflictCode,
    TMutationConflictResponse,
} from "@proposit/shared/schemas/api/mutation-conflict"

export function respondWithConflict(
    code: TMutationConflictCode,
    message: string
): Response {
    const body: TMutationConflictResponse = {
        error: "MUTATION_CONFLICT",
        code,
        message,
    }
    return Response.json(body, { status: 409 })
}
```

Wiring: add a `ConflictError` (carrying `code: TMutationConflictCode`) thrown at
`lifecycle.ts:747` (`ALREADY_PUBLISHED`), `:300`
(`PUBLISHED_VERSION_NOT_ARCHIVABLE`), and `:788` (`PUBLISH_VERSION_CONFLICT`),
then one `instanceof ConflictError` branch in `handleMutationError` calling
`respondWithConflict(err.code, err.message)`. This also lets the brittle
`/Cannot archive a published argument version/i` substring row be deleted from
`ENGINE_CLIENT_INPUT_MESSAGE_PATTERNS`. (Unblocks server item-5.)

Example emitted body:

```json
{ "error": "MUTATION_CONFLICT", "code": "ALREADY_PUBLISHED", "message": "Argument is already published, cannot publish again" }
```

### EXACT mobile-consume / narrow snippet (proposit-mobile adoption slice)

```ts
import { isMutationConflictError } from "@proposit/shared/api-client"

// `err` is the parsed error body from a failed publish/archive call.
if (isMutationConflictError(err)) {
    switch (err.code) {
        case "ALREADY_PUBLISHED":
            // This version is already published — refresh state.
            break
        case "PUBLISHED_VERSION_NOT_ARCHIVABLE":
            // A published version can't be archived — surface + block.
            break
        case "PUBLISH_VERSION_CONFLICT":
            // Superseded by a concurrent write — reload and retry.
            break
    }
    // `err.message` is safe to show directly.
}
```

### Item B tests

- `src/schemas/api/__tests__/mutation-conflict.test.ts` — schema accepts each
  code; rejects wrong discriminator, unknown code, missing message.
- `src/api-client/__tests__/mutation-conflict.test.ts` — guard positive case +
  negatives (TErrorResponse shape, grammar-violations envelope, wrong `error`
  string, missing `error`, null/undefined/primitives/arrays). (13 tests, green.)

### Item B integration fix — surface the envelope through the api-client

The schema + `isMutationConflictError` guard shipped, but the guard was
**unreachable**: `parseResponse` (`src/utils/utils.ts`) had a GRAMMAR_VIOLATIONS
auto-detect branch but no MUTATION_CONFLICT branch, so a 409 conflict body fell
through to `Value.Parse(ErrorResponseSchema, data)`, which **throws** on the
conflict envelope (it lacks `errorID`/`errorMessage`/`statusCode`). A real
publish conflict therefore rejected `apiClient.publishArgument` in a way no
client could narrow.

Fix (mirrors the grammar-violations path exactly — the api-client convention is
a **result shape** `{ error, ok: false }`, not a thrown error): added a
default-form (2-arg) auto-detect branch in `parseResponse` —

```ts
if (
    errorSchema === undefined &&
    response.status === 409 &&
    Value.Check(MutationConflictResponseSchema, data)
) {
    return { error: Value.Parse(MutationConflictResponseSchema, data), ok: false }
}
```

and widened the 2-arg overload + impl return unions with
`ParsedError<typeof MutationConflictResponseSchema>`. The 3-arg
explicit-error-schema form is untouched (callers with their own error schema keep
single-schema behavior), matching grammar-violations. A conflict now surfaces as
`result.error` (with `result.ok === false`), which `isMutationConflictError`
narrows.

**EXACT consumer snippet (mobile `confirmPublish` + server web UI).** Because the
factory surfaces via a result shape (not a throw), narrow `result.error` after
checking `!result.ok`:

```ts
import { isMutationConflictError } from "@proposit/shared/api-client"

const result = await apiClient.publishArgument(/* … */)
if (!result.ok && isMutationConflictError(result.error)) {
    switch (result.error.code) {
        case "ALREADY_PUBLISHED":             // already published — refresh state
            break
        case "PUBLISHED_VERSION_NOT_ARCHIVABLE": // can't archive a published version
            break
        case "PUBLISH_VERSION_CONFLICT":      // superseded by concurrent write — reload + retry
            break
    }
    // result.error.message is safe to show directly.
}
```

(If a callsite instead catches a thrown/re-thrown error and holds an `unknown`,
`isMutationConflictError(err)` narrows that value the same way — the guard is
surface-agnostic.)

Integration fix tests — `src/utils/__tests__/utils.test.ts`:

- 409 + MUTATION_CONFLICT body → `parseResponse` returns `{ ok: false, error }`
  where `isMutationConflictError(error)` is true and `error.code` is preserved.
- 409 with a conventional TErrorResponse-shaped body → still falls back to
  `TErrorResponse` (no regression; guard returns false).

## Human decisions needed

None. Both items shipped as additive contracts; server + mobile wire them on
their own adoption slices using the exact shapes above.
