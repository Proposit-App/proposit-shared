# Plan

TDD: failing schema tests first, then the schema + const change, then docs.

1. **Tests (red).** Add a `UpdateArgumentRequestSchema` describe block to
   `schemas/api/argument/__tests__/index.test.ts` (co-located with the existing
   `CreateArgumentSchema` tests):
   - accepts `{ newData: { title, description }, currentDigest }`
   - accepts `{ newData: { title }, currentDigest }` (description omitted)
   - rejects `newData` missing `title`
   Run `pnpm test` → the description-present case fails (field stripped/closed object).

2. **Schema (green).** Add `description: Type.Optional(Type.String())` to
   `MutableArgumentFieldsSchema` in `schemas/model/arguments.ts`.

3. **Const.** Add `export const ARGUMENT_DESCRIPTION_MAX_LEN = 500` to
   `consts/argument.ts` (auto re-exported via `consts/index.ts`'s `export *`).

4. **Verify.** `pnpm run check` (typecheck + lint + test + build).

5. **Docs.** Append entries to `docs/changelogs/upcoming.md` and
   `docs/release-notes/upcoming.md` describing the additive optional field +
   new const.

6. **Complete.** `tcw work complete --resolution done`; offer the minor version
   bump (`pnpm version minor`) per repo convention.
