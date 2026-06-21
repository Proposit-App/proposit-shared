# Ingestion pipeline restructure — `proposit-shared` 0.20.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the version-named ingestion-pipeline union with a role-named one (`scholar`/`scribe`), add a user-facing `mode` selector to `CreateArgumentSchema`, and persist the resolved `pipeline` on `ArgumentCreateTask.data` — all in `@proposit/shared`.

**Architecture:** Three TypeBox schema edits in `src/schemas/`, each with TDD-first test coverage. `IngestionPipelineSchema` (role union) becomes the single source of truth, imported by both `IngestArgumentTaskInputSchema` and the new `ArgumentCreateTask.data.pipeline` field.

**Tech Stack:** TypeBox `^1.1.14`, Vitest `^4`, TypeScript, pnpm. ESM (`.js` relative imports).

## Global Constraints

- Version: `0.19.0` → `0.20.0` (pre-1.0 breaking-in-minor). **DO NOT cut/tag the version or bump it in this work — the orchestrator owns the release step.**
- **DO NOT bump the `@proposit/proposit-core` pin to `^3.0.0`.** Keep it at `^2.0.0` in both `dependencies` and `peerDependencies` so `pnpm run check` passes against installed core 2.0.0. The orchestrator coordinates the `^3.0.0` pin-bump + publish.
- Naming (brain-style): `PascalCase` for TypeBox schema consts; `T`-prefixed `PascalCase` for derived types; `camelCase` for properties; string literals are runtime values (exempt).
- ESM: all relative imports end in `.js`; directory imports use explicit `index.js`.
- No co-authoring trailers in commits.
- No initiative/planning language (slice/phase/wave labels) in shipped code/comments/test titles.
- TDD: write the failing test, watch it fail, minimal code to pass. Run `pnpm exec vitest run <file>` per test cycle; `pnpm run check` at the end.

---

### Task 1: Role-named pipeline union + field rename (`ingest-argument`)

**Files:**

- Modify: `src/schemas/ingest-argument/index.ts` (whole file, 29 lines)
- Test: `src/schemas/ingest-argument/__tests__/index.test.ts` (rewrite fixtures + add rejection guards)

**Interfaces:**

- Produces: `IngestionPipelineSchema` (TypeBox union of `Type.Literal("scholar")` | `Type.Literal("scribe")`), `type TIngestionPipeline = Static<typeof IngestionPipelineSchema>`, and `IngestArgumentTaskInputSchema` whose field is now `pipeline: IngestionPipelineSchema` (was `pipelineVersion: IngestionPipelineVersionSchema`). `TIngestArgumentTaskInput` unchanged in name.
- Consumed by: Task 3 (`tasks.ts` imports `IngestionPipelineSchema` from `./ingest-argument/index.js`).

- [ ] **Step 1: Rewrite the test file (failing — old symbols still in source)**

Replace `src/schemas/ingest-argument/__tests__/index.test.ts` with:

```typescript
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    IngestArgumentTaskInputSchema,
    IngestionPipelineSchema,
} from "../index.js"

// Verifies the internal task-input schemas at
// `@proposit/shared/schemas/ingest-argument`. These are NOT public route
// bodies — they are the shape a server route handler constructs (from the
// user-selected import mode resolved to a pipeline role) before passing
// into `executePipeline(...)` from `@proposit/proposit-core`.
describe("IngestionPipelineSchema", () => {
    it("accepts the scholar role", () => {
        expect(Value.Check(IngestionPipelineSchema, "scholar")).toBe(true)
    })

    it("accepts the scribe role", () => {
        expect(Value.Check(IngestionPipelineSchema, "scribe")).toBe(true)
    })

    it("rejects the retired v1-single-shot literal", () => {
        expect(Value.Check(IngestionPipelineSchema, "v1-single-shot")).toBe(
            false
        )
    })

    it("rejects the retired v2-multi-stage literal", () => {
        expect(Value.Check(IngestionPipelineSchema, "v2-multi-stage")).toBe(
            false
        )
    })

    it("rejects an unknown role", () => {
        expect(Value.Check(IngestionPipelineSchema, "oracle")).toBe(false)
    })

    it("rejects non-string values", () => {
        expect(Value.Check(IngestionPipelineSchema, 1)).toBe(false)
        expect(Value.Check(IngestionPipelineSchema, null)).toBe(false)
    })
})

describe("IngestArgumentTaskInputSchema", () => {
    it("accepts a minimal valid input", () => {
        const input = { text: "hi", pipeline: "scholar" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional title and description present", () => {
        const input = {
            text: "Some argument text",
            pipeline: "scribe",
            title: "My title",
            description: "Some description",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional title alone", () => {
        const input = {
            text: "Some argument text",
            pipeline: "scholar",
            title: "My title",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional description alone", () => {
        const input = {
            text: "Some argument text",
            pipeline: "scholar",
            description: "Some description",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("rejects an empty text", () => {
        const input = { text: "", pipeline: "scholar" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects text exceeding the 50_000 char ceiling", () => {
        const input = {
            text: "x".repeat(50_001),
            pipeline: "scholar",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("accepts text exactly at the 50_000 char ceiling", () => {
        const input = {
            text: "x".repeat(50_000),
            pipeline: "scholar",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("rejects an unknown pipeline role", () => {
        const input = { text: "hi", pipeline: "oracle" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects a retired version literal in the pipeline field", () => {
        const input = { text: "hi", pipeline: "v2-multi-stage" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects a missing pipeline", () => {
        const input = { text: "hi" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects a missing text", () => {
        const input = { pipeline: "scholar" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/schemas/ingest-argument/__tests__/index.test.ts`
Expected: FAIL — `IngestionPipelineSchema` is not exported (old name `IngestionPipelineVersionSchema` still in source), import error / undefined.

- [ ] **Step 3: Rewrite the source**

Replace `src/schemas/ingest-argument/index.ts` with:

```typescript
import Type, { type Static } from "typebox"

export const IngestionPipelineSchema = Type.Union([
    Type.Literal("scholar"),
    Type.Literal("scribe"),
])
export type TIngestionPipeline = Static<typeof IngestionPipelineSchema>

/**
 * Internal task input passed from a server route handler into the
 * ingestion pipeline executor. NOT a public route body — the public
 * `/api/v1/argument/import/raw_text` route accepts the `CreateArgumentSchema`
 * shape (`{ origin: "raw_text", data: { text }, mode? }`). The server
 * resolves the user-facing `mode` (or its configured default) to a pipeline
 * role, constructs this internal shape, and passes it to `executePipeline(...)`
 * in `@proposit/proposit-core`.
 */
export const IngestArgumentTaskInputSchema = Type.Object({
    text: Type.String({ minLength: 1, maxLength: 50_000 }),
    pipeline: IngestionPipelineSchema,
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
})
export type TIngestArgumentTaskInput = Static<
    typeof IngestArgumentTaskInputSchema
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/schemas/ingest-argument/__tests__/index.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/schemas/ingest-argument/index.ts src/schemas/ingest-argument/__tests__/index.test.ts
git commit -m "feat(ingest-argument): role-named pipeline union (scholar/scribe), rename pipelineVersion field to pipeline"
```

---

### Task 2: `mode` on `CreateArgumentSchema`

**Files:**

- Modify: `src/schemas/api/argument/index.ts` (`CreateArgumentSchema`, ~:75-82)
- Test: `src/schemas/api/argument/__tests__/index.test.ts` (NEW file — none exists)

**Interfaces:**

- Produces: `CreateArgumentSchema` gains a top-level optional `mode: Type.Optional(Type.Union([Type.Literal("fast"), Type.Literal("thorough")]))`. `TCreateArgument` gains `mode?: "fast" | "thorough"`.

- [ ] **Step 1: Write the failing test (NEW file)**

Create `src/schemas/api/argument/__tests__/index.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { CreateArgumentSchema } from "../index.js"

// `CreateArgumentSchema` is the validated body for POST /api/v1/argument
// (and the import routes). `mode` is the user-facing import-depth selector;
// it is optional so existing callers that omit it still validate. The server
// resolves `mode` to a pipeline role (or falls back to its configured
// default when absent).
describe("CreateArgumentSchema mode", () => {
    const rawTextBody = (extra: Record<string, unknown> = {}) => ({
        origin: "raw_text",
        data: { text: "Some argument text" },
        ...extra,
    })

    it("accepts a body with no mode (backward-compatible)", () => {
        expect(Value.Check(CreateArgumentSchema, rawTextBody())).toBe(true)
    })

    it("accepts mode: fast", () => {
        expect(
            Value.Check(CreateArgumentSchema, rawTextBody({ mode: "fast" }))
        ).toBe(true)
    })

    it("accepts mode: thorough", () => {
        expect(
            Value.Check(CreateArgumentSchema, rawTextBody({ mode: "thorough" }))
        ).toBe(true)
    })

    it("rejects an unknown mode string", () => {
        expect(
            Value.Check(CreateArgumentSchema, rawTextBody({ mode: "turbo" }))
        ).toBe(false)
    })

    it("rejects a non-string mode", () => {
        expect(
            Value.Check(CreateArgumentSchema, rawTextBody({ mode: 1 }))
        ).toBe(false)
    })

    it("validates a full {origin, data, mode} body", () => {
        const body = {
            origin: "raw_text",
            data: { text: "A complete argument body" },
            mode: "thorough",
        }
        expect(Value.Check(CreateArgumentSchema, body)).toBe(true)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/schemas/api/argument/__tests__/index.test.ts`
Expected: FAIL — "accepts mode: fast" etc. fail because `mode` isn't a known property and (depending on `additionalProperties` default) is either ignored or rejected; the unknown-mode/non-string cases will be wrong relative to the not-yet-added union. (Watch which specific cases fail — at minimum the `fast`/`thorough` acceptance must be the proof.)

- [ ] **Step 3: Add the field**

In `src/schemas/api/argument/index.ts`, change `CreateArgumentSchema` (currently):

```typescript
export const CreateArgumentSchema = Type.Object({
    origin: ArgumentImportOrigin,
    data: Type.Index(
        ArgumentPlatformDataMap,
        Type.KeyOf(ArgumentPlatformDataMap)
    ),
})
```

to:

```typescript
export const CreateArgumentSchema = Type.Object({
    origin: ArgumentImportOrigin,
    data: Type.Index(
        ArgumentPlatformDataMap,
        Type.KeyOf(ArgumentPlatformDataMap)
    ),
    mode: Type.Optional(
        Type.Union([Type.Literal("fast"), Type.Literal("thorough")])
    ),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/schemas/api/argument/__tests__/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/api/argument/index.ts src/schemas/api/argument/__tests__/index.test.ts
git commit -m "feat(api/argument): add optional user-facing mode (fast/thorough) to CreateArgumentSchema"
```

---

### Task 3: Persist `pipeline` on `ArgumentCreateTask.data` + SSOT import

**Files:**

- Modify: `src/schemas/tasks.ts` (import `IngestionPipelineSchema`; add field to `ArgumentCreateTask.data`, ~:58-65)
- Test: `src/schemas/__tests__/tasks.test.ts` (NEW file — none exists)

**Interfaces:**

- Consumes: `IngestionPipelineSchema` / `TIngestionPipeline` from `./ingest-argument/index.js` (Task 1).
- Produces: `ArgumentCreateTask.data.pipeline?: TIngestionPipeline`. The type `TTask<"argument_create">["data"]["pipeline"]` is `TIngestionPipeline | undefined`.

- [ ] **Step 1: Write the failing test (NEW file)**

Create `src/schemas/__tests__/tasks.test.ts`:

```typescript
import { describe, expect, it, expectTypeOf } from "vitest"
import { Value } from "typebox/value"
import { ArgumentCreateTask, type TTask } from "../tasks.js"
import { type TIngestionPipeline } from "../ingest-argument/index.js"

// `ArgumentCreateTask.data` is the persisted payload of an `argument_create`
// task. The server resolves the import pipeline at task-creation time and
// persists it as `data.pipeline`, so the executor reads the persisted role
// instead of re-resolving from configuration. The field is optional only so
// that tasks persisted before this field existed still validate on read; the
// server always writes a concrete role on new tasks.
const baseData = {
    argumentId: "11111111-1111-4111-8111-111111111111",
    version: 1,
}

const checkData = (data: unknown) =>
    Value.Check(ArgumentCreateTask.properties.data, data)

describe("ArgumentCreateTask.data.pipeline", () => {
    it("accepts a valid pipeline role", () => {
        expect(checkData({ ...baseData, pipeline: "scholar" })).toBe(true)
        expect(checkData({ ...baseData, pipeline: "scribe" })).toBe(true)
    })

    it("accepts data with pipeline absent (legacy-row tolerance)", () => {
        expect(checkData({ ...baseData })).toBe(true)
    })

    it("rejects an unknown pipeline role", () => {
        expect(checkData({ ...baseData, pipeline: "v2-multi-stage" })).toBe(
            false
        )
    })

    it("still rejects an unknown property (additionalProperties: false)", () => {
        expect(checkData({ ...baseData, bogus: true })).toBe(false)
    })

    it("types data.pipeline as the role union or undefined", () => {
        expectTypeOf<
            TTask<"argument_create">["data"]["pipeline"]
        >().toEqualTypeOf<TIngestionPipeline | undefined>()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/schemas/__tests__/tasks.test.ts`
Expected: FAIL — "accepts a valid pipeline role" fails (unknown prop rejected by `additionalProperties:false` since `pipeline` isn't yet in the schema); the type-level `expectTypeOf` is checked by `pnpm run typecheck` (tsc), which will error because `data.pipeline` doesn't exist yet. (Runtime cases prove the failure.)

- [ ] **Step 3: Add the import + field**

In `src/schemas/tasks.ts`, add the import after the existing `./common.js` imports:

```typescript
import { IngestionPipelineSchema } from "./ingest-argument/index.js"
```

Then change `ArgumentCreateTask`'s `data` from:

```typescript
    data: Type.Object(
        {
            argumentId: Type.String({ format: "uuid" }),
            version: Type.Number(),
            responseId: Type.Optional(Nullable(Type.String())),
        },
        { additionalProperties: false }
    ),
```

to:

```typescript
    data: Type.Object(
        {
            argumentId: Type.String({ format: "uuid" }),
            version: Type.Number(),
            responseId: Type.Optional(Nullable(Type.String())),
            // Resolved import pipeline role, persisted at task creation so
            // the executor reads it instead of re-resolving from config.
            // Optional only to tolerate rows persisted before this field
            // existed; new tasks always carry a concrete role.
            pipeline: Type.Optional(IngestionPipelineSchema),
        },
        { additionalProperties: false }
    ),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/schemas/__tests__/tasks.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck the type-level guard**

Run: `pnpm run typecheck`
Expected: PASS (the `expectTypeOf` assertion compiles — confirms `data.pipeline` is `TIngestionPipeline | undefined`).

- [ ] **Step 6: Commit**

```bash
git add src/schemas/tasks.ts src/schemas/__tests__/tasks.test.ts
git commit -m "feat(tasks): persist resolved pipeline role on argument_create task data"
```

---

### Task 4: Release notes + changelog (break-vs-additive)

**Files:**

- Modify: `docs/release-notes/upcoming.md`
- Modify: `docs/changelogs/upcoming.md`

(Exact paths confirmed against the repo's documentation-sync layout before editing.)

- [ ] **Step 1: Add an itemized entry distinguishing BREAKING from ADDITIVE**

Release note must list:

- **BREAKING:** `IngestionPipelineVersionSchema` → `IngestionPipelineSchema`; literals `"v1-single-shot"`/`"v2-multi-stage"` → `"scholar"`/`"scribe"`; field `pipelineVersion` → `pipeline` (on `IngestArgumentTaskInputSchema`). Consumers importing the old names from `@proposit/shared/schemas/ingest-argument` must update.
- **ADDITIVE (backward-compatible):** `CreateArgumentSchema.mode?: "fast" | "thorough"`; `ArgumentCreateTask.data.pipeline?: TIngestionPipeline`.

- [ ] **Step 2: Commit**

```bash
git add docs/release-notes/upcoming.md docs/changelogs/upcoming.md
git commit -m "docs: note role-named pipeline union, mode, and persisted pipeline field"
```

---

### Task 5: Full verification

- [ ] **Step 1: Run the full check pipeline**

Run: `pnpm run check`
Expected: PASS — prettier clean, eslint clean, all tests pass (was 477; now +new cases), typecheck clean, build succeeds. Core pin still `^2.0.0`.

- [ ] **Step 2: Confirm constraints held**

- `package.json` version still `0.19.0` (NOT bumped).
- Core pin still `^2.0.0` in both `dependencies` and `peerDependencies`.
- No `package.json` `exports` change (symbols stayed in-file).
- No planning-label language in any shipped comment/test title.

---

## Self-Review

**Spec coverage:** Change 1 (rename) → Task 1. Change 2 (`mode`) → Task 2. Change 3 (persisted `pipeline`) → Task 3. Review-folded P1 tests: OLD-literals-rejected → Task 1 Steps (two cases) + Task 3 (`v2-multi-stage` rejection); `mode` concrete coverage incl. full body → Task 2; `pipeline` both-halves (valid + absent + unknown-prop-rejected) → Task 3; type-level guard → Task 3 Step 5. Docstring reword → Task 1 Step 3. Release-note itemization → Task 4. Constraints (no pin bump, no version cut) → Global Constraints + Task 5.

**Placeholder scan:** none — every code step shows full content.

**Type consistency:** `IngestionPipelineSchema`/`TIngestionPipeline` used identically across Tasks 1 & 3; `pipeline` field name consistent; `mode` union identical in Task 2 source and tests.
