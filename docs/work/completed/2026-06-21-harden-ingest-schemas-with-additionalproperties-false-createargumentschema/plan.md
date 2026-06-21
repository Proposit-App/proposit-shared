# Plan

1. **`src/schemas/integrations/index.ts`** — add `{ additionalProperties: false }` to:
    - `ExternalPlatformData` (`Type.Object` 2nd arg)
    - `NoPlatformData` (`Type.Object` 2nd arg)
    - `TwitterArgumentPlatformData` (`Type.Interface` 3rd arg)
    - `RedditArgumentPlatformData` (`Type.Interface` 3rd arg)
    - Leave `TwitterEmbedResponse` open (comment why).

2. **`src/schemas/api/argument/index.ts`** — add `{ additionalProperties: false }` to `CreateArgumentSchema` top-level `Type.Object`.

3. **`src/schemas/ingest-argument/index.ts`** — add `{ additionalProperties: false }` to `IngestArgumentTaskInputSchema`.

4. **Tests** (extend existing files; no new framework):
    - `api/argument/__tests__/index.test.ts` — extra top-level key on the body fails; extra key inside `data` fails; known shape still passes.
    - `ingest-argument/__tests__/index.test.ts` — extra key fails; known shape + optional-omitted still pass.
    - `integrations` has no test file today; the api/argument + ingest tests exercise the value schemas via the union, so no separate file needed (ponytail). Add the twitter/reddit extra-key case via `CreateArgumentSchema` (origin twitter/reddit) in the api test.

5. **Docs** — `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md`: note the hardening AND the read-back tightening of `ArgumentSchema.platformData`.

6. **Verify** — `pnpm run check`.
