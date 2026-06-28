# Outcome — v0.27.0 Argument Builder schema exports

## What was done

Added a single re-export line to `src/schemas/api/argument/index.ts`:
```ts
export * from "./build.js"
```

This makes the following schemas and types available from `@proposit/shared/schemas/api/argument`:

**Schemas:**
- `ArgumentBuilderRequestSchema`
- `ArgumentBuilderReviewResponseSuccessSchema`
- `ArgumentBuilderResponseRefusedSchema`
- `ArgumentBuilderFinalizeResponseSuccessSchema`
- `ArgumentBuilderResponseSchema` (union of the three response variants)

**Types:**
- `TArgumentBuilderRequest`
- `TArgumentBuilderRequestResponse`
- `TArgumentBuilderFinalizeResponseSuccess`

The `action` union (`"review" | "finalize" | "simulate_user"`) is accessible via the request type's `action` property and as a literal union extracted from `ArgumentBuilderRequestSchema`.

## Verification

- `pnpm run build` — passes (TypeScript compiles, dist output contains the re-export)
- `pnpm test` — passes (all 555 tests, all 67 test files green)
- Version bumped 0.26.0 -> 0.27.0 (minor)
- Release notes and changelog rotated to v0.27.0

## What was NOT changed

- No schema structure modifications
- No conversational-turn types moved to shared (they remain in core)
- No capability delta (export visibility only)
- No consumer-side updates (server bump is the next child task)
