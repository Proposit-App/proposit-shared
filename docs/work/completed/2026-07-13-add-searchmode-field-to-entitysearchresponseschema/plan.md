# Plan

Trivial, one-file change. See `spec.md` / `initial-request.md`.

1. TDD: add `src/schemas/api/__tests__/search.test.ts` asserting
   `Value.Check(EntitySearchResponseSchema, …)` for the four cases (embedding /
   string / omitted accepted; out-of-union rejected). Watch it fail.
2. Add the optional inline `searchMode` union to `EntitySearchResponseSchema` in
   `src/schemas/api/search.ts`.
3. Verify: targeted vitest + typecheck, then full `pnpm run check`.

**Touch points:** `src/schemas/api/search.ts`,
`src/schemas/api/__tests__/search.test.ts`.
