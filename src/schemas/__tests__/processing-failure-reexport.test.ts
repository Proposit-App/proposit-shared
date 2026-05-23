import { describe, expectTypeOf, it } from "vitest"
import type { TProcessingFailure as CoreTProcessingFailure } from "@proposit/proposit-core"
import type { TProcessingFailure } from "../processing-failure.js"

// Verifies the type-only re-export at
// `@proposit/shared/schemas/processing-failure`. Mirrors the grammar
// re-export pattern: shared owes consumers a single import path; the
// source of truth is core (`src/lib/pipelines/types.ts`).
//
// As of `@proposit/proposit-core@1.1.1`, only the TypeScript type
// `TProcessingFailure` is exported — no TypeBox runtime schema ships
// yet. A future core minor that adds `ProcessingFailureSchema` would
// trigger a shared minor bump to extend this re-export to include the
// runtime value (the dep range plus the re-export mechanism mirrors
// core's surface automatically).
describe("@proposit/shared/schemas/processing-failure re-export", () => {
    it("re-exports TProcessingFailure structurally identical to core's", () => {
        // Compile-time assertion — fails the build if the re-exported type
        // drifts from core's, locking the contract shared owes its
        // consumers.
        expectTypeOf<TProcessingFailure>().toEqualTypeOf<CoreTProcessingFailure>()
    })
})
