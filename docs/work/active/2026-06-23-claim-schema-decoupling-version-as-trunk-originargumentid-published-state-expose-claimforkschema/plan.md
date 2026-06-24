# Claim schema decoupling Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. TDD: write/adjust the failing test first, then change the schema.

**Goal:** Decouple `ClaimSchema` from the argument version (own trunk `version`, nullable `originArgumentId`, `published`/`publishedOn`) and re-export `ClaimForkSchema`.

**Architecture:** Edit the single shared base `ClaimSharedFieldsSchema` in `src/schemas/model/claims.ts`; all three variant schemas + derived types inherit the change. Add one re-export line. Adjust the existing `claims.test.ts` fixtures + add field-presence tests.

**Tech Stack:** TypeBox (`typebox`), Vitest.

## Global Constraints

- Runtime-agnostic; no DOM/Node globals in source; `lib: ["ES2022"]`.
- All relative imports end in `.js`.
- brain-style naming; commit messages carry no co-authoring trailer.
- Breaking change → **minor** bump (pre-1.0 policy).
- Do NOT `pnpm publish`, tag, or `git push`.

---

### Task 1: Reshape `ClaimSharedFieldsSchema` + re-export `ClaimForkSchema`

**Files:**
- Modify: `src/schemas/model/claims.ts` (the `ClaimSharedFieldsSchema` object + an export line)
- Test: `src/schemas/__tests__/claims.test.ts`

**Interfaces:**
- Produces (consumer-visible, all claim variants): `originArgumentId: string | null`
  (replaces `argumentId: string`), `published: boolean`,
  `publishedOn: Date | null`, `version: number` (now the claim's own trunk
  version). Re-exports `ClaimForkSchema` / `TClaimFork` from `@proposit/shared/schemas`.

- [ ] **Step 1: Update test fixtures + add failing field tests.** In
  `claims.test.ts`: in `normalBase`/`citationBase`/`axiomaticBase`, replace
  `argumentId: ARG_ID` with `originArgumentId: ARG_ID` and add
  `published: false, publishedOn: null`. Add tests asserting (a) a claim with
  `originArgumentId: null` is accepted, (b) a claim still carrying the old
  `argumentId` key but missing `originArgumentId` is rejected (the rename took
  effect — relies on `additionalProperties` behavior of `Type.Interface`; if
  Interface is open, instead assert that omitting `originArgumentId` is rejected),
  (c) `published`/`publishedOn` are required and typed (non-boolean `published`
  rejected; non-null/non-date `publishedOn`… `publishedOn: null` accepted,
  a Date accepted). Add a `ClaimForkSchema` import + a `Value.Check` round-trip
  test for a well-formed fork record.

- [ ] **Step 2: Run tests, verify the new ones fail.**
  Run: `sh -c 'cd /Users/brian/Projects/Proposit-App/proposit-shared && pnpm exec vitest run src/schemas/__tests__/claims.test.ts'`
  Expected: the new originArgumentId/published/fork tests FAIL (schema unchanged).

- [ ] **Step 3: Edit `ClaimSharedFieldsSchema`.** In `claims.ts`, change the base:
  replace `argumentId: UUID` with `originArgumentId: Nullable(UUID)`; add
  `published: Type.Boolean()` and `publishedOn: Nullable(EncodableDate)`; update
  the `version` field's surrounding doc comment to state it is the claim's own
  trunk version (independent of argument version), provenance via
  `originArgumentId`. Add `export { ClaimForkSchema, type TClaimFork } from "./forks.js"`
  near the existing imports (mirroring `arguments.ts`'s `ArgumentForkSchema` line).

- [ ] **Step 4: Run tests, verify green.**
  Run: `sh -c 'cd /Users/brian/Projects/Proposit-App/proposit-shared && pnpm exec vitest run src/schemas/__tests__/claims.test.ts'`
  Expected: PASS.

- [ ] **Step 5: Full check.**
  Run: `sh -c 'cd /Users/brian/Projects/Proposit-App/proposit-shared && pnpm run check'`
  Expected: typecheck + lint + test + build all green.

- [ ] **Step 6: Commit.** `git add` the two files; commit
  `feat(schemas): decouple claim version from argument; nullable originArgumentId, published state; expose ClaimForkSchema`.

### Task 2: Release prep (minor bump + rotate upcoming docs)

**Files:**
- Modify: `package.json` (version)
- Rotate: `docs/release-notes/upcoming.md` → `docs/release-notes/<new>.md` (+ fresh upcoming)
- Rotate: `docs/changelogs/upcoming.md` → `docs/changelogs/<new>.md` (+ fresh upcoming)

- [ ] **Step 1:** `pnpm version minor --no-git-tag-version` (or hand-edit
  `package.json`) to bump `0.24.0` → `0.25.0`. Do NOT let it tag.
- [ ] **Step 2:** Move `upcoming.md` files to the new version filename, write the
  claim-decoupling entry, recreate empty `upcoming.md` files.
- [ ] **Step 3:** `pnpm run check` once more (build picks up nothing version-wise,
  but confirms green).
- [ ] **Step 4: Commit** the release-prep changes. Do NOT tag or push.
