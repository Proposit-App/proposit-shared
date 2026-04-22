# Mobile Auth Schemas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TypeBox request/response schemas for the new mobile-session + mobile-refresh endpoints under `@proposit/shared/schemas/api/auth`, then bundle + tag + publish as `0.3.0` after human go/no-go.

**Architecture:** Four schemas (`MobileSessionRequest`, `MobileSessionResponse`, `MobileRefreshRequest`, `MobileRefreshResponse`) live in a single `src/schemas/api/auth/index.ts` following the `user/` + `reaction/` api-subpath conventions. Static types are derived via `Static<typeof Schema>` with a `T`-prefix. A new exports-map entry `./schemas/api/auth` is added to `package.json` with all three conditions (`types` + `import` + `default`). TDD throughout — one schema at a time, test-first, commit after each green run.

**Tech Stack:** TypeBox 1.x (`typebox`), vitest 4.x, TypeScript 6.x. ESM with `.js` relative import extensions. `UUID` comes from `src/schemas/common.ts` (re-exports `@proposit/proposit-core`'s UUID).

**Spec:** `docs/superpowers/specs/2026-04-22-mobile-auth-schemas.md`.

---

## Task 1: Scaffold barrel + test file

**Files:**
- Create: `src/schemas/api/auth/index.ts`
- Create: `src/schemas/api/auth/__tests__/index.test.ts`

- [ ] **Step 1: Create the empty barrel with imports and nothing else**

Write `src/schemas/api/auth/index.ts`:

```ts
import { Type, type Static } from "typebox"
import { UUID } from "../../common.js"

// Schemas for POST /api/v1/auth/mobile-session and POST /api/v1/auth/mobile-refresh.
// Shape signed off by server on broker room phase-1-1c-shared (762413, 2026-04-22).
// See docs/superpowers/specs/2026-04-22-mobile-auth-schemas.md.
```

- [ ] **Step 2: Create the empty test file with vitest scaffold**

Write `src/schemas/api/auth/__tests__/index.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    MobileSessionRequest,
    MobileSessionResponse,
    MobileRefreshRequest,
    MobileRefreshResponse,
} from "../index.js"
```

Note: this import will fail to typecheck until Task 2-5 introduce the exports. That's fine — we'll add tests per-schema and the imports will resolve incrementally. To avoid a red build between tasks, leave the import commented out and uncomment per-schema as tests are added.

Revise to:

```ts
import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
// imports added per-schema in Tasks 2–5
```

- [ ] **Step 3: Verify typecheck + test still pass (baseline)**

Run: `pnpm run typecheck && pnpm run test`
Expected: PASS (unused `common.ts` import in `auth/index.ts` would fail `@typescript-eslint/no-unused-vars`; comment out or leave `UUID` used by adding a placeholder export once Task 3 uses it — safest is to defer the `UUID` import to Task 3).

Adjust Step 1 output to not yet import `UUID`:

```ts
import { Type, type Static } from "typebox"

// Schemas for POST /api/v1/auth/mobile-session and POST /api/v1/auth/mobile-refresh.
// Shape signed off by server on broker room phase-1-1c-shared (762413, 2026-04-22).
// See docs/superpowers/specs/2026-04-22-mobile-auth-schemas.md.
```

(`Type` and `Static` will be used in Task 2's first export; if lint complains about unused imports on the empty scaffold, skip Step 3 and go straight into Task 2.)

- [ ] **Step 4: Commit the scaffold**

```bash
git add src/schemas/api/auth/index.ts src/schemas/api/auth/__tests__/index.test.ts
git commit -m "chore(schemas): scaffold src/schemas/api/auth barrel + test file"
```

---

## Task 2: MobileSessionRequest

**Files:**
- Modify: `src/schemas/api/auth/index.ts`
- Modify: `src/schemas/api/auth/__tests__/index.test.ts`

- [ ] **Step 1: Write failing tests for MobileSessionRequest**

Append to `src/schemas/api/auth/__tests__/index.test.ts`:

```ts
import { MobileSessionRequest } from "../index.js"

describe("MobileSessionRequest", () => {
    it("accepts a valid google request with nonce", () => {
        const input = { provider: "google", idToken: "eyJ.xxx.yyy", nonce: "n-abc" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("accepts a valid apple request without nonce (wire-schema optional)", () => {
        const input = { provider: "apple", idToken: "eyJ.xxx.yyy" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("rejects an unsupported provider", () => {
        const input = { provider: "twitter", idToken: "eyJ.xxx.yyy" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects a missing idToken", () => {
        const input = { provider: "google" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/schemas/api/auth`
Expected: FAIL with "MobileSessionRequest is not exported" (or equivalent module-resolution error on the import).

- [ ] **Step 3: Implement MobileSessionRequest**

Append to `src/schemas/api/auth/index.ts`:

```ts
export const MobileSessionRequest = Type.Object({
    provider: Type.Union([Type.Literal("google"), Type.Literal("apple")]),
    idToken: Type.String(),
    nonce: Type.Optional(Type.String()),
})
export type TMobileSessionRequest = Static<typeof MobileSessionRequest>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/schemas/api/auth`
Expected: PASS, 4 tests for MobileSessionRequest green.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/api/auth/index.ts src/schemas/api/auth/__tests__/index.test.ts
git commit -m "feat(schemas/api/auth): add MobileSessionRequest"
```

---

## Task 3: MobileSessionResponse

**Files:**
- Modify: `src/schemas/api/auth/index.ts`
- Modify: `src/schemas/api/auth/__tests__/index.test.ts`

- [ ] **Step 1: Write failing tests for MobileSessionResponse**

Append to `src/schemas/api/auth/__tests__/index.test.ts`:

```ts
import { MobileSessionResponse } from "../index.js"

describe("MobileSessionResponse", () => {
    const valid = {
        accessToken: "access.jwt.here",
        accessTokenExpiresAt: "2026-04-22T00:15:00.000Z",
        refreshToken: "refresh-opaque-token",
        refreshTokenExpiresAt: "2026-05-22T00:00:00.000Z",
        userId: "00000000-0000-0000-0000-000000000001",
    }

    it("accepts a valid response", () => {
        expect(Value.Check(MobileSessionResponse, valid)).toBe(true)
    })

    it("rejects a missing refreshToken", () => {
        const { refreshToken: _omitted, ...rest } = valid
        expect(Value.Check(MobileSessionResponse, rest)).toBe(false)
    })

    it("rejects a non-UUID userId", () => {
        expect(Value.Check(MobileSessionResponse, { ...valid, userId: "not-a-uuid" })).toBe(false)
    })

    it("rejects a missing accessTokenExpiresAt", () => {
        const { accessTokenExpiresAt: _omitted, ...rest } = valid
        expect(Value.Check(MobileSessionResponse, rest)).toBe(false)
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/schemas/api/auth`
Expected: FAIL on the import of `MobileSessionResponse` — module export not found.

- [ ] **Step 3: Import UUID and implement MobileSessionResponse**

Modify the top of `src/schemas/api/auth/index.ts` to add the `UUID` import (it's not currently imported because Task 2 didn't need it):

```ts
import { Type, type Static } from "typebox"
import { UUID } from "../../common.js"
```

Append the schema:

```ts
export const MobileSessionResponse = Type.Object({
    accessToken: Type.String(),
    accessTokenExpiresAt: Type.String({ format: "date-time" }),
    refreshToken: Type.String(),
    refreshTokenExpiresAt: Type.String({ format: "date-time" }),
    userId: UUID,
})
export type TMobileSessionResponse = Static<typeof MobileSessionResponse>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/schemas/api/auth`
Expected: PASS, 4 tests for MobileSessionResponse green, total 8 auth tests passing.

Note: if `Value.Check` does **not** reject `userId: "not-a-uuid"` because the `UUID` schema in `common.ts` is only a `Type.String()` alias with no format validator, swap that assertion to check a specific UUID-derived rejection (e.g., wrong type like `userId: 123`). Investigate `src/schemas/common.ts` (via `Read`) to see what `UUID` actually is before writing the test — adjust the test input accordingly so it reflects a real rejection case for this codebase.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/api/auth/index.ts src/schemas/api/auth/__tests__/index.test.ts
git commit -m "feat(schemas/api/auth): add MobileSessionResponse"
```

---

## Task 4: MobileRefreshRequest

**Files:**
- Modify: `src/schemas/api/auth/index.ts`
- Modify: `src/schemas/api/auth/__tests__/index.test.ts`

- [ ] **Step 1: Write failing tests for MobileRefreshRequest**

Append to `src/schemas/api/auth/__tests__/index.test.ts`:

```ts
import { MobileRefreshRequest } from "../index.js"

describe("MobileRefreshRequest", () => {
    it("accepts a valid refresh request", () => {
        expect(Value.Check(MobileRefreshRequest, { refreshToken: "refresh-opaque-token" })).toBe(true)
    })

    it("rejects a missing refreshToken", () => {
        expect(Value.Check(MobileRefreshRequest, {})).toBe(false)
    })

    it("rejects a non-string refreshToken", () => {
        expect(Value.Check(MobileRefreshRequest, { refreshToken: 42 })).toBe(false)
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/schemas/api/auth`
Expected: FAIL on the import of `MobileRefreshRequest`.

- [ ] **Step 3: Implement MobileRefreshRequest**

Append to `src/schemas/api/auth/index.ts`:

```ts
export const MobileRefreshRequest = Type.Object({
    refreshToken: Type.String(),
})
export type TMobileRefreshRequest = Static<typeof MobileRefreshRequest>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/schemas/api/auth`
Expected: PASS, 3 more tests green, total 11 auth tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/api/auth/index.ts src/schemas/api/auth/__tests__/index.test.ts
git commit -m "feat(schemas/api/auth): add MobileRefreshRequest"
```

---

## Task 5: MobileRefreshResponse

**Files:**
- Modify: `src/schemas/api/auth/index.ts`
- Modify: `src/schemas/api/auth/__tests__/index.test.ts`

- [ ] **Step 1: Write failing tests for MobileRefreshResponse**

Append to `src/schemas/api/auth/__tests__/index.test.ts`:

```ts
import { MobileRefreshResponse } from "../index.js"

describe("MobileRefreshResponse", () => {
    const valid = {
        accessToken: "new-access.jwt",
        accessTokenExpiresAt: "2026-04-22T00:15:00.000Z",
        refreshToken: "new-refresh-opaque-token",
        refreshTokenExpiresAt: "2026-05-22T00:00:00.000Z",
    }

    it("accepts a valid refresh response", () => {
        expect(Value.Check(MobileRefreshResponse, valid)).toBe(true)
    })

    it("rejects a userId field (refresh response has no identity)", () => {
        // Excess properties are allowed by default in TypeBox Type.Object unless
        // additionalProperties: false is set. We only want to verify the shape
        // does NOT REQUIRE userId — so the canonical shape without userId must pass.
        expect(Value.Check(MobileRefreshResponse, valid)).toBe(true)
    })

    it("rejects a missing refreshToken", () => {
        const { refreshToken: _omitted, ...rest } = valid
        expect(Value.Check(MobileRefreshResponse, rest)).toBe(false)
    })

    it("rejects a missing accessToken", () => {
        const { accessToken: _omitted, ...rest } = valid
        expect(Value.Check(MobileRefreshResponse, rest)).toBe(false)
    })
})
```

Note: the second test is aspirational/documentation. TypeBox's `Type.Object` allows additional properties by default. The spec says MobileRefreshResponse has no `userId`; that's a shape-not-require-it statement, not a shape-reject-extras statement. Drop that test if it adds confusion; the naming makes the absence clear. Keep the other three.

Revise by removing the `rejects a userId field` block and keeping only:

```ts
describe("MobileRefreshResponse", () => {
    const valid = {
        accessToken: "new-access.jwt",
        accessTokenExpiresAt: "2026-04-22T00:15:00.000Z",
        refreshToken: "new-refresh-opaque-token",
        refreshTokenExpiresAt: "2026-05-22T00:00:00.000Z",
    }

    it("accepts a valid refresh response", () => {
        expect(Value.Check(MobileRefreshResponse, valid)).toBe(true)
    })

    it("rejects a missing refreshToken", () => {
        const { refreshToken: _omitted, ...rest } = valid
        expect(Value.Check(MobileRefreshResponse, rest)).toBe(false)
    })

    it("rejects a missing accessToken", () => {
        const { accessToken: _omitted, ...rest } = valid
        expect(Value.Check(MobileRefreshResponse, rest)).toBe(false)
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/schemas/api/auth`
Expected: FAIL on the import of `MobileRefreshResponse`.

- [ ] **Step 3: Implement MobileRefreshResponse**

Append to `src/schemas/api/auth/index.ts`:

```ts
export const MobileRefreshResponse = Type.Object({
    accessToken: Type.String(),
    accessTokenExpiresAt: Type.String({ format: "date-time" }),
    refreshToken: Type.String(),
    refreshTokenExpiresAt: Type.String({ format: "date-time" }),
})
export type TMobileRefreshResponse = Static<typeof MobileRefreshResponse>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/schemas/api/auth`
Expected: PASS, 3 more tests green, total 14 auth tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/api/auth/index.ts src/schemas/api/auth/__tests__/index.test.ts
git commit -m "feat(schemas/api/auth): add MobileRefreshResponse"
```

---

## Task 6: Exports map + CLAUDE.md Package structure

**Files:**
- Modify: `package.json`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the exports entry**

In `package.json`, insert a new entry into `exports` (alphabetically grouped with the other `./schemas/api/*` entries; the existing list has `argument`, `reaction`, `review`, `user`; `auth` sorts first):

```json
"./schemas/api/auth": {
    "types": "./dist/schemas/api/auth/index.d.ts",
    "import": "./dist/schemas/api/auth/index.js",
    "default": "./dist/schemas/api/auth/index.js"
},
```

All three conditions (`types` + `import` + `default`) are mandatory per the 0.2.1 exports-map fix.

- [ ] **Step 2: Add the CLAUDE.md Package structure bullet**

In `CLAUDE.md` Package structure section (the bullet list under `## Package structure`), add:

```
- `./schemas/api/auth` → `src/schemas/api/auth/index.ts`
```

Position is editorial; placing it immediately after the last existing `./schemas` bullet is fine.

- [ ] **Step 3: Verify the build resolves the new subpath**

Run: `pnpm run build`
Expected: PASS, `dist/schemas/api/auth/index.js` + `dist/schemas/api/auth/index.d.ts` produced.

Sanity-check with `ls dist/schemas/api/auth/` — should list both `.js` and `.d.ts`.

- [ ] **Step 4: Commit**

```bash
git add package.json CLAUDE.md
git commit -m "chore(exports): add ./schemas/api/auth subpath with types/import/default conditions"
```

---

## Task 7: Full check

**Files:** none directly; runs `pnpm run check`.

- [ ] **Step 1: Run the full pipeline**

Run: `pnpm run check`
Expected: typecheck + lint + test + build all green. Test count should be 170 (prior) + 10 new auth tests = 180 (or thereabouts — confirm by visual inspection, the exact prior count may differ).

- [ ] **Step 2: If anything fails, fix it in-place before proceeding**

Common failures to anticipate:
- Lint: unused imports, line-length, file-naming — address per lint output.
- TypeScript: missing `.js` extensions on relative imports; `UUID` not exported from `common.ts` under a different name; `Static` vs. `static` casing.
- Build: `dist/` stale. `pnpm run build` wipes `dist/` + `.tsbuildinfo` — safe to re-run.

Fix, then re-run `pnpm run check` until green. Commit any additional fixes with `fix(schemas/api/auth): ...`.

- [ ] **Step 3: Confirm test count**

Run: `pnpm run test 2>&1 | tail -10`
Expected: a summary line like `Tests  N passed` where N reflects prior + 10. No skipped, no failed.

---

## Task 8: Publish ceremony — HALT, await human go/no-go

**This task is NOT auto-executed.** The implementation agent pauses here and reports status to the human.

Per repo policy, `pnpm publish --access public` requires OTP from the human operator. Pushing the branch and opening the PR is also externally visible. These steps happen only after the human gives explicit go-ahead.

- [ ] **Step 1: Surface a summary for human review**

Report to the human:
- Branch: `phase-1/pr-1c-mobile-auth-shared`
- Commits: list of commits ahead of `main`
- Final schema shape (reference the spec doc)
- `pnpm run check` result
- Proposed next steps (version bump, publish, push, PR, READY signal)

Ask the human to confirm before proceeding with any of:
1. `pnpm version minor` (bumps 0.2.1 → 0.3.0, creates a `v0.3.0` tag).
2. `pnpm publish --access public` (OTP prompted in-terminal; human types it).
3. `git push -u origin phase-1/pr-1c-mobile-auth-shared` and `git push origin v0.3.0`.
4. `gh pr create --title "feat: add mobile-auth schemas (0.3.0)" --body "..."`.
5. Post `READY: @proposit/shared@0.3.0 published with TMobileSession* + TMobileRefresh* under /schemas/api/auth` on broker room 762413 as identity `proposit-shared`.
6. After merge, update `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md` renames per repo's versioning ritual (not part of this plan's scope; surface as a follow-up).

- [ ] **Step 2: On human go, execute the above in order, one at a time, pausing between each.**

- [ ] **Step 3: On human no-go or request for edits, loop back to the relevant earlier task.**

---

## Self-review

- **Spec coverage:** all four schemas (§"Schemas") → Tasks 2–5. Exports-map entry (§"Exports-map entry") → Task 6. CLAUDE.md package structure → Task 6. Full-check gate (§"Acceptance" #5) → Task 7. Publish ceremony (§"Acceptance" #6) → Task 8.
- **Placeholders:** none. Every code snippet is complete. Every command is exact.
- **Type consistency:** schemas use bare-name consts (`MobileSessionRequest`, not `MobileSessionRequestSchema`), T-prefixed types via `Static<typeof ...>`. `UUID` is imported from `../../common.js` (verified against existing `user/index.ts` + `claims.ts`). `Type` + `Static` named-imported from `"typebox"` (matches `user/index.ts`).
- **Known-unknown:** Task 3 Step 4 calls out that `UUID` in `common.ts` may not enforce UUID-format at runtime. The test for non-UUID rejection adjusts accordingly.
