# Citation Data Model (shared slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt `proposit-core`'s two-tier citation model in `@proposit/shared` so the `CitationClaim.citation` field is an `IEEE | Unparsed` union, consumers can import `UnparsedCitationSchema`/`TUnparsedCitation` through the shared references subpath, and `embedding-text` handles the new `"unparsed"` form.

**Architecture:** Three source edits + two test updates, all confined to `proposit-shared/src`. The IEEE re-export path moves from `@proposit/proposit-core/extensions/ieee` to `…/extensions/citations/ieee` (3 sites in `references.ts`), a new `…/citations/unparsed` re-export is added, the claim `citation` field widens from `Nullable(IEEEReferenceSchema)` to `Nullable(Type.Union([IEEEReferenceSchema, UnparsedCitationSchema]))` discriminating on `.type`, and `extractCitationTitle` swaps its compiler-forced-gone `case "UnparsedURL"` for a `case "unparsed"` while preserving the legacy `case "Other"`.

**Tech Stack:** TypeScript (ESM, `lib: ES2022`), TypeBox 1.x, Vitest.

## Global Constraints

- Build/test against the linked local core branch: `pnpm add file:/private/tmp/proposit-core-citations-core` (DEV link only; `package.json` core pins are restored to `^1.7.0` before completion — the `file:` pin is NOT a deliverable).
- `pnpm run check` is the gate (typecheck + lint + test + build). The only permitted pre-existing failure is prettier on `docs/superpowers/briefings/citation-data-model-shared-agenda.md`; fix that doc's formatting so `check` is fully green.
- ESM: all relative imports in `src/` end in `.js`; directory imports use explicit index path.
- `lib: ["ES2022"]` — no `window`/`document`/`Buffer`/`process` or other platform globals in `src/`.
- brain-style naming (TypeScript sub-skill); ESLint enforces `@typescript-eslint/naming-convention` + `check-file/filename-naming-convention`.
- Git commit messages must NOT include Co-Authored-By or any co-authoring trailer.
- No flat root entry; new subpath re-export rides the existing `references` module (already exported).
- No initiative/spec/planning labels in shipped code (comments/tests/strings).
- **GATED STOP:** NO `pnpm version`, NO publish.

---

### Task 1: Move the IEEE re-export path + add the unparsed re-export

**Files:**

- Modify: `src/schemas/model/references.ts:3,8,19`
- Test: `src/schemas/__tests__/references-reexport.test.ts` (create)

**Interfaces:**

- Consumes (from linked core): `@proposit/proposit-core/extensions/citations/ieee` (exports `IEEEReferenceSchema`, `IEEEReferenceSchemaMap`, `ReferenceTypeSchema`, and the per-type schemas — same surface as the old `…/extensions/ieee` minus `UnparsedURL`); `@proposit/proposit-core/extensions/citations/unparsed` (exports `UnparsedCitationSchema`, `TUnparsedCitation`, `UnparsedCitationTypeGuessSchema`, `TUnparsedCitationTypeGuess`).
- Produces (for consumers via `@proposit/shared/schemas/model/references`): re-exported `UnparsedCitationSchema` / `TUnparsedCitation`, alongside the existing IEEE surface.

- [ ] **Step 1: Write the failing test**

Create `src/schemas/__tests__/references-reexport.test.ts`. It imports the new unparsed surface _through the shared references module_ (proving the re-export path) and round-trips a value:

```ts
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    UnparsedCitationSchema,
    type TUnparsedCitation,
} from "../model/references.js"

describe("references re-export of the unparsed citation surface", () => {
    it("re-exports UnparsedCitationSchema and validates an unparsed citation", () => {
        const citation: TUnparsedCitation = {
            type: "unparsed",
            text: "Mill, On Liberty (Pooley case)",
            citationTypeGuess: "Book",
            url: "https://example.com/on-liberty",
        }
        expect(Value.Check(UnparsedCitationSchema, citation)).toBe(true)
    })

    it("validates an unparsed citation with no url and an unknown guess", () => {
        const citation: TUnparsedCitation = {
            type: "unparsed",
            text: "the Apologia",
            citationTypeGuess: "unknown",
        }
        expect(Value.Check(UnparsedCitationSchema, citation)).toBe(true)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/schemas/__tests__/references-reexport.test.ts`
Expected: FAIL — `UnparsedCitationSchema` is not exported from `../model/references.js` yet.

- [ ] **Step 3: Repoint the three IEEE sites + add the unparsed re-export**

In `src/schemas/model/references.ts`, change all three `@proposit/proposit-core/extensions/ieee` specifiers to `@proposit/proposit-core/extensions/citations/ieee`:

- line 3: `export * from "@proposit/proposit-core/extensions/citations/ieee"`
- line 8: `import type { IEEEReferenceSchemaMap } from "@proposit/proposit-core/extensions/citations/ieee"`
- line 19: `import { ReferenceTypeSchema } from "@proposit/proposit-core/extensions/citations/ieee"`

Then add directly under line 3 (next to the IEEE `export *`):

```ts
export * from "@proposit/proposit-core/extensions/citations/unparsed"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/schemas/__tests__/references-reexport.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS — no dangling `…/extensions/ieee` references; `TIEEEReferenceMap` (derived from `IEEEReferenceSchemaMap`) still resolves.

- [ ] **Step 6: Commit**

```bash
git add src/schemas/model/references.ts src/schemas/__tests__/references-reexport.test.ts
git commit -m "feat(references): move IEEE re-export to citations subpath, add unparsed re-export"
```

---

### Task 2: Widen `CitationClaim.citation` to the IEEE | Unparsed union

**Files:**

- Modify: `src/schemas/model/claims.ts:3,115-130`
- Test: `src/schemas/__tests__/claims.test.ts` (extend)

**Interfaces:**

- Consumes: `UnparsedCitationSchema` from `./references.js` (re-exported in Task 1).
- Produces: `CitationClaimSchema.citation` = `Nullable(Type.Union([IEEEReferenceSchema, UnparsedCitationSchema]))`; `TCitationClaim.citation` narrows on `.type` (`"unparsed"` vs the 33 IEEE literals). `isCitationClaim` is unchanged (keys on `type === "citation"` at the claim level, not the citation field).

- [ ] **Step 1: Write the failing test**

In `src/schemas/__tests__/claims.test.ts`, add an unparsed fixture and tests inside the existing `describe("CitationClaimSchema", …)` block. Place this fixture near `citationBase` (top of file):

```ts
const unparsedCitationBase = {
    ...citationBase,
    digest: "digest-citation-unparsed",
    citation: {
        type: "unparsed",
        text: "Mill, On Liberty (the Pooley case)",
        citationTypeGuess: "Book",
        url: "https://example.com/on-liberty",
    },
}
```

Add these tests in the `CitationClaimSchema` describe block:

```ts
it("accepts a citation claim carrying an unparsed citation", () => {
    expect(Value.Check(CitationClaimSchema, unparsedCitationBase)).toBe(true)
})

it("accepts an unparsed citation with no url and an unknown guess", () => {
    const noUrl = {
        ...unparsedCitationBase,
        citation: {
            type: "unparsed",
            text: "the Apologia",
            citationTypeGuess: "unknown",
        },
    }
    expect(Value.Check(CitationClaimSchema, noUrl)).toBe(true)
})

it("rejects a citation whose citation.type is neither an IEEE type nor unparsed", () => {
    const bad = {
        ...citationBase,
        citation: { type: "Nonsense", text: "x", citationTypeGuess: "unknown" },
    }
    expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
})

it("discriminates the union on citation.type", () => {
    expect(Value.Check(CitationClaimSchema, citationBase)).toBe(true) // IEEE branch
    expect(Value.Check(CitationClaimSchema, unparsedCitationBase)).toBe(true) // unparsed branch
})
```

Also add to the `describe("ClaimSchema (union)", …)` block:

```ts
it("accepts a citation-variant claim carrying an unparsed citation", () => {
    expect(Value.Check(ClaimSchema, unparsedCitationBase)).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/schemas/__tests__/claims.test.ts`
Expected: FAIL — the unparsed-carrying fixtures fail `Value.Check` because `citation` is still `Nullable(IEEEReferenceSchema)`.

- [ ] **Step 3: Widen the schema**

In `src/schemas/model/claims.ts`:

Add `UnparsedCitationSchema` to the existing references import on line 3:

```ts
import { IEEEReferenceSchema, UnparsedCitationSchema } from "./references.js"
```

Replace the `citation` field declaration (the comment block + line 127) inside `CitationClaimSchema` with:

```ts
    // Full IEEE references and ingestion-extracted unparsed citations both
    // attach here; null is the url-only citation claim (a `url` column with
    // no structured reference). The single `type` discriminant — the 33 IEEE
    // literals vs `"unparsed"` — keeps the union unambiguous, and the `url`
    // string is what distinguishes a citation claim from the normal/axiomatic
    // branches, so a null citation does not collide with them.
    citation: Nullable(Type.Union([IEEEReferenceSchema, UnparsedCitationSchema])),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/schemas/__tests__/claims.test.ts`
Expected: PASS — all existing CitationClaim tests (IEEE accept, null accept, rejects) plus the new unparsed tests.

- [ ] **Step 5: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/schemas/model/claims.ts src/schemas/__tests__/claims.test.ts
git commit -m "feat(claims): widen CitationClaim.citation to IEEE | Unparsed union"
```

---

### Task 3: Update `extractCitationTitle` for the unparsed form

**Files:**

- Modify: `src/utils/embedding-text.ts:1,12-32`
- Test: `src/utils/__tests__/embedding-text.test.ts:1-2,132-148`

**Interfaces:**

- Consumes: `TIEEEReference`, `TUnparsedCitation` from `../schemas/model/references.js`.
- Produces: `extractCitationTitle(citation: TIEEEReference | TUnparsedCitation | { type: "Other"; text?: string }): string | null` — unparsed returns `text` (fallback `url`); legacy `"Other"` preserved; IEEE branches unchanged.

- [ ] **Step 1: Update the test (red)**

In `src/utils/__tests__/embedding-text.test.ts`, add the `TUnparsedCitation` import to line 2:

```ts
import type {
    TIEEEReference,
    TUnparsedCitation,
} from "../../schemas/model/references.js"
```

Replace the two `UnparsedURL` tests (lines 132–148) with `"unparsed"` equivalents typed as `TUnparsedCitation` (no `as` cast needed — the shape is exact):

```ts
// Unparsed citations (ingestion-extracted, not yet structured)
test("returns text for an unparsed citation with text", () => {
    const result = extractCitationTitle({
        type: "unparsed",
        text: "An interesting article",
        citationTypeGuess: "Website",
        url: "https://example.com/article",
    } satisfies TUnparsedCitation)
    expect(result).toBe("An interesting article")
})

test("falls back to url for an unparsed citation without text", () => {
    const result = extractCitationTitle({
        type: "unparsed",
        text: "",
        citationTypeGuess: "Website",
        url: "https://example.com/article",
    } satisfies TUnparsedCitation)
    expect(result).toBe("https://example.com/article")
})

test("returns null for an unparsed citation with neither text nor url", () => {
    const result = extractCitationTitle({
        type: "unparsed",
        text: "",
        citationTypeGuess: "unknown",
    } satisfies TUnparsedCitation)
    expect(result).toBeNull()
})
```

> Note: `TUnparsedCitation.text` is a required `string`. The "without text" case uses `text: ""` (empty) so the `text ?? url` fallback resolves to `url`; the "neither" case uses `text: ""` with no `url`. These exercise the same empty-text fallback the old `UnparsedURL` tests did, against the new required-`text` shape.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/utils/__tests__/embedding-text.test.ts`
Expected: FAIL — the function still switches on `"UnparsedURL"`, so `"unparsed"` falls through and returns null; also a type error if run under typecheck (`TUnparsedCitation` not assignable to the current param type).

- [ ] **Step 3: Widen the param + swap the case**

In `src/utils/embedding-text.ts`:

Update the import (line 1) to bring in both types:

```ts
import type {
    TIEEEReference,
    TUnparsedCitation,
} from "../schemas/model/references.js"
```

Update the JSDoc and signature (lines 3–14). New JSDoc + signature:

```ts
/**
 * Extract the best embeddable text from a citation object.
 * Handles strict IEEE references, ingestion-extracted unparsed citations
 * (`{ type: "unparsed", text, … }`), and the legacy non-IEEE
 * `{ type: "Other", text: "..." }` format used by the old import path.
 * Returns null if no meaningful text can be extracted.
 *
 * Reused for both server-side embedding generation and
 * client-side fuzzy search display text.
 */
export function extractCitationTitle(
    citation:
        | TIEEEReference
        | TUnparsedCitation
        | { type: "Other"; text?: string }
): string | null {
```

Replace the `case "UnparsedURL"` block (lines 18–26) with:

```ts
        // Ingestion-extracted citations not yet structured into IEEE: prefer
        // the raw text, fall back to the optional locator url.
        case "unparsed":
            text = citation.text || citation.url || null
            break
```

> `case "Other"` (the legacy branch) stays exactly as is, immediately below.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/utils/__tests__/embedding-text.test.ts`
Expected: PASS — the three unparsed tests plus all retained IEEE/Other tests.

- [ ] **Step 5: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS — the widened param now accepts `TUnparsedCitation`; the `citation.text` / `citation.url` accesses narrow correctly under `case "unparsed"`.

- [ ] **Step 6: Commit**

```bash
git add src/utils/embedding-text.ts src/utils/__tests__/embedding-text.test.ts
git commit -m "feat(embedding-text): handle unparsed citations, drop UnparsedURL case"
```

---

### Task 4: Internal code review + gate

**Files:** none (review + verification only)

- [ ] **Step 1: Fix the pre-existing briefing-doc formatting**

Run: `pnpm exec prettier --write docs/superpowers/briefings/citation-data-model-shared-agenda.md`
(So `pnpm run check`'s prettier stage is green. This is the only pre-existing `check` failure.)

- [ ] **Step 2: Run the full gate against the linked core**

Run: `pnpm run check`
Expected: PASS — typecheck, lint (prettier + eslint), test (all suites), build.

- [ ] **Step 3: Internal code review**

Dispatch an internal code-review subagent over the full branch diff (`git diff main...HEAD`). Fix every Critical/Important finding; re-run `pnpm run check` after fixes.

- [ ] **Step 4: Restore the core dep pin (un-deliverable the dev link)**

Confirm `package.json` `peerDependencies."@proposit/proposit-core"` is still `^1.7.0`. Restore `devDependencies."@proposit/proposit-core"` from the `file:/private/tmp/…` link back to `^1.7.0`:

```bash
git checkout package.json   # if only the core pin changed; otherwise edit the single devDependencies line
```

> The `pnpm-lock.yaml` will still reference the linked core until a real bump post-publish — note this in the report; do NOT commit a `file:` pin or a lock pointing at `/private/tmp`. Verify `git diff main...HEAD -- package.json pnpm-lock.yaml` shows no `file:/private/tmp` residue before declaring done.

- [ ] **Step 5: Commit doc fix (if any source/docs changed) and report**

```bash
git add docs/superpowers/briefings/citation-data-model-shared-agenda.md docs/superpowers/plans/2026-06-16-citation-data-model-shared.md
git commit -m "docs(plans): add citation-data-model shared plan; fix briefing formatting"
```

Then report per the briefing's report contract: worktree path + branch, per-task commits, final `pnpm run check` result, internal-review outcome, the core-link note (and that `package.json` is back at `^1.7.0`), deviations, and status.
