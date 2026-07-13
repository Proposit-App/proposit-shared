# Plan

Trivial, one-file change. See `spec.md` / `initial-request.md`.

1. Add an exported `ArgumentStatusFilter` union (`"unpublished" | "published" |
   "archived"`) and an optional `status?: ArgumentStatusFilter` field to
   `GetAllArgumentsParams` in `src/api-client/argument/index.ts`.
2. No serialization change needed: `getAllArgumentsImpl` already threads every
   non-undefined param through `URLSearchParams` generically. Add a test asserting
   `status` is serialized when provided and existing omit-the-param callers are
   unchanged.
3. Verify: targeted vitest + typecheck, then full `pnpm run check`.

**Touch points:** `src/api-client/argument/index.ts`,
`src/api-client/argument/__tests__/get-all-arguments.test.ts`.
