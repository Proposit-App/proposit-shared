# Grammar Tiers — `proposit-shared` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `@proposit/shared@0.9.0` shipping the grammar-tiers wire-format module (`./schemas/grammar`: `TGrammarTier`, `TGrammarRuleCode`, `TViolation`), a standardized 422-equivalent grammar-violations response envelope, the rule-code coordination protocol documented in `CLAUDE.md`, and aligned mutation-generator commentary that no longer references soon-to-be-removed `proposit-core` config flags. Shared publishes **first** in the cross-repo sequence (shared → core → server + mobile in parallel) per spec §10.5.

**Architecture:** A new `src/schemas/grammar/` module exports TypeBox schemas (`GrammarTierSchema`, `GrammarRuleCodeSchema`, `ViolationSchema`) and their derived TypeScript types. A new `src/schemas/api/grammar-violations.ts` exports the 422 response envelope (`GrammarViolationsResponseSchema`). A new exports-map entry `./schemas/grammar` is added with the required `types` + `import` + `default` conditions. The mutation-generators audit reveals only comment-level dependencies on removed flag names; no structural code changes are needed in `src/engine/mutations/` for this initiative (the runtime behavioral break for consumers happens at core's 1.0.0 publish, not here — see §"Work item 2 audit finding" below). CLAUDE.md gains a new "Grammar rule-code coordination protocol" section.

**Tech Stack:** TypeScript 6.x, TypeBox 1.x, vitest 4.x, pnpm 10.x. Pre-1.0 semver (per `proposit-shared/CLAUDE.md`: "minor bumps may include breaking changes").

---

## Cross-cutting context for the implementing agent

If you are reading this fresh and have not yet read the briefing/spec, **stop and do that first**:

1. **Briefing:** `docs/superpowers/briefings/grammar-tiers-shared-agenda.md` (this repo).
2. **Cross-repo spec:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-05-13-grammar-tiers-design.md` — §7.1 (API surface) is the source of truth for the `TGrammarTier` / `TGrammarRuleCode` / `TViolation` shape; §10.2 is this repo's scope.
3. **Core plan task A1:** `/Users/brian/Projects/Proposit-App/proposit-core/docs/superpowers/plans/grammar-tiers-core-plan.md` lines 188–289. Core-dev has authored a local stub in `src/lib/grammar/types.ts` with the **exact same shape** this plan ships. Your TypeBox schemas must produce TypeScript types that match core-dev's stub character-for-character so their Phase B0 ("swap stubs for shared imports") is a clean re-export, not a diff-resolution exercise.
4. **`proposit-shared/CLAUDE.md`** — exports-map discipline (`types` + `import` + `default` on every entry), ESM `.js` import suffix, no Node-only APIs in `src/`, pre-1.0 versioning policy.

### Version baseline reality

- Current `proposit-shared` is **`0.8.0`** on `main` (not `0.2.1` as the briefing said).
- This plan publishes **`0.9.0`**. The "minor bump under pre-1.0 covers a breaking contract change for downstream consumers" reasoning from the briefing still applies; only the version _numbers_ differ.
- Current `peerDependencies["@proposit/proposit-core"]`: `^0.12.3` — **do not change** in this initiative. Core publishes a new major after shared ships; that bump is core-dev's and server-dev's coordination problem, not this plan's.
- **Consumer baselines** (per team-lead, useful context for the Phase 3 broker post): `proposit-server` consumes `@proposit/shared@^0.8.0`; `proposit-mobile` consumes `@proposit/shared@^0.6.1`. Mobile is several minors behind, so its bump path is `^0.6.1 → ^0.9.0` and may surface unrelated breaking changes from intervening minors — flag this in the `READY:` post so mobile-dev knows to expect that.

### Cross-repo coordination

- **Broker thread:** `grammar-tiers`. Post `READY:` / `BLOCKED:` / `QUESTION:` signals.
- **Team lead:** `team-lead` (the orchestrator). SendMessage them at: (a) plan complete, (b) before publishing in Phase 3, (c) on blocker.
- **Teammate currently active:** `proposit-core-dev` (in their Phase 2 / Phase A scaffolding). Their B0 task is gated on this plan's Phase 3 (npm publish of `0.9.0`).

### Work item 2 audit finding (must read before Phase 2 Task 8)

The briefing's work-item 2 framing — "`@proposit/shared/engine/mutations` currently emits flag-driven cleanup ops inline with the mutation it's generating, remove them" — does not match the source. An audit of `src/engine/mutations/` shows:

- **No flag-named control flow exists in shared.** `grep -nE "if.*autoNormalize|if.*grammar|enforceFormula|setGrammar|TGrammar|getGrammar" src/engine/mutations/*.ts` produces zero hits.
- **The only references to flag names are in 3 comments** — `expressions.ts:385` ("from wrapInsertFormula"), `premises.ts:573` ("wrapInsertFormula auto-normalize rule inserts a formula buffer"), `premises.ts:605` ("wrapInsertFormula slips a formula expression"). These document _what core's `wrapExpression` does_, not what shared does.
- The shared mutation helpers call into `proposit-core`'s `PremiseEngine.wrapExpression(...)` etc. and rely on **core's** auto-normalization to insert formula buffers. That reliance does not change shape _runtime-wise_ under the new model: when shared 0.9.0 is paired with core ≥1.0 in `assistive` mode, the AN post-hook still inserts the formula buffer; in `permissive` mode it does not (and that's fine — D-1 treats the formula node as transparent when matching the populated-form skeleton).
- `populateDerivationFromCitations` is a derived helper in shared that produces `IMPLIES(OR(c1..cn), Q)` and lets core's `wrapInsertFormula` slip in the buffer. Spec §10.1 says **core** will ship `populateFromCitations` / `populateFromAxioms` directly on the engine in core 1.0. Shared's helper becomes redundant _eventually_ but **stays in 0.9.0** — removing it would break current consumers (server/mobile still on core 0.12.x at shared 0.9.0 publish time). It is marked deprecated in release notes; future removal happens in a later shared version once server/mobile have bumped to core 1.x.

**Therefore Task 8 is documentation-only.** It updates three comments to describe the new contract (engine-side post-hook AN, not a specific named flag) and notes the deprecation. There are no failing tests to write because the runtime behavior is unchanged on 0.9.0. This is a deviation from the briefing's wording but matches the spec's _substance_. The deviation is called out in the Phase 1 SendMessage to team-lead.

### Why no `intendedForm` field

Spec §12 "How a derivation premise's 'form' (citation vs axiomatic) is determined" rejects the stored-field approach. Grounding form is derived at read time from antecedent claim variable types. **Do not add `intendedForm` to any schema in this initiative.** If you encounter stale references in old briefings or doc fragments, ignore them — the current spec wins.

---

## File structure changes

### New files

| Path                                                        | Responsibility                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/schemas/grammar/tier.ts`                               | TypeBox `GrammarTierSchema` (`Type.Union` of 4 string literals) + `type TGrammarTier = Static<typeof GrammarTierSchema>`.                                                                                                                                                            |
| `src/schemas/grammar/rule-code.ts`                          | TypeBox `GrammarRuleCodeSchema` (`Type.Union` of 30 string literals — S-1..S-14, E-1, E-3..E-7, D-1..D-6, P-1..P-5; codes `E-2` and `D-7` intentionally absent, code comment cites spec §4.2 / §4.3) + `type TGrammarRuleCode = Static<typeof GrammarRuleCodeSchema>`.               |
| `src/schemas/grammar/violation.ts`                          | TypeBox `ViolationSchema` (`Type.Object` with `tier`, `code`, `message`, optional `argumentId`/`premiseId`/`expressionId`/`variableId`/`claimId`; `additionalProperties: true` for rule-specific context fields per spec §7.1) + `type TViolation = Static<typeof ViolationSchema>`. |
| `src/schemas/grammar/index.ts`                              | Barrel re-exporting the three schemas + their `T*` types.                                                                                                                                                                                                                            |
| `src/schemas/api/grammar-violations.ts`                     | TypeBox `GrammarViolationsResponseSchema` (the standardized 422-equivalent envelope for submit/publish endpoints) + derived type.                                                                                                                                                    |
| `src/schemas/__tests__/grammar-tier.test.ts`                | Validation tests for `GrammarTierSchema`.                                                                                                                                                                                                                                            |
| `src/schemas/__tests__/grammar-rule-code.test.ts`           | Validation tests for `GrammarRuleCodeSchema` — explicitly verifies `'E-2'` and `'D-7'` are rejected and every other code in the union is accepted.                                                                                                                                   |
| `src/schemas/__tests__/grammar-violation.test.ts`           | Validation tests for `ViolationSchema` — required fields, optional fields, extension slot.                                                                                                                                                                                           |
| `src/schemas/__tests__/grammar-violations-response.test.ts` | Validation tests for the 422 response envelope.                                                                                                                                                                                                                                      |

### Modified files

| Path                                                            | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                  | (a) Bump `version` from `0.8.0` to `0.9.0` (via `pnpm version minor` in Task 9). (b) Add new exports-map entry `./schemas/grammar` with `types` + `import` + `default` conditions pointing at `dist/schemas/grammar/index.{d.ts,js,js}`. The existing `./schemas/*` glob entry already covers `./schemas/api/grammar-violations` via the `./schemas/api/*` reach-through pattern — verify during implementation; if the existing wildcard doesn't reach two levels deep, add an explicit `./schemas/api/grammar-violations` entry too. |
| `CLAUDE.md`                                                     | Add a new "Grammar rule-code coordination protocol" section under "Key design rules" (per work item 3 of the briefing).                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/engine/mutations/expressions.ts` (comment at line 385)     | Update the comment text to describe the new model: "Auto-generated expressions (formula buffers produced by the engine's post-mutation AN pass in assistive mode)." Remove the specific `wrapInsertFormula` flag-name reference.                                                                                                                                                                                                                                                                                                       |
| `src/engine/mutations/premises.ts` (comments at lines 573, 605) | Same comment update — describe the AN post-hook in general terms, not the specific removed flag. Add a deprecation note above `populateDerivationFromCitations` (line 478) directing future consumers to core 1.0's `populateFromCitations` once it ships.                                                                                                                                                                                                                                                                             |
| `docs/release-notes/upcoming.md` _(create if missing)_          | User-facing release notes for `0.9.0` — explicitly call out the new `./schemas/grammar` wire format, the 422 envelope, the rule-code coordination protocol, and the "mutation-generator contract change" (no longer relies on core flag names; runtime behavior unchanged until consumers bump to core 1.0).                                                                                                                                                                                                                           |
| `docs/changelogs/upcoming.md` _(create if missing)_             | Developer changelog with commit hash ranges.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Deleted files

None.

---

## Phase 1 — Plan (this document)

You are reading it. After saving, the implementing agent (or you, before transitioning to Phase 2) SendMessages `team-lead` with a one-paragraph summary + the list of TaskCreate IDs that correspond to the major plan tasks. Wait for an explicit OK before starting Phase 2.

---

## Phase 2 — Implementation

Execute Tasks 1–8 in order. Every code task is TDD: failing test first, watch it fail, implement minimally, watch it pass, commit. Use the `superpowers:test-driven-development` skill for discipline.

---

## Task 1: Branch setup + baseline check

**Files:** none (git + tooling only).

- [ ] **Step 1: Create and check out the feature branch**

```bash
git checkout -b grammar-tiers/shared
```

- [ ] **Step 2: Confirm baseline is green**

```bash
pnpm run check
```

Expected: typecheck + lint + test + build all pass. If anything fails on `main` before this initiative starts, **stop and SendMessage team-lead**.

- [ ] **Step 3: No commit yet** — Task 2 lands the first concrete file.

---

## Task 2: Wire-format schemas — `GrammarTierSchema`

**Files:**

- Create: `src/schemas/grammar/tier.ts`
- Test: `src/schemas/__tests__/grammar-tier.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/schemas/__tests__/grammar-tier.test.ts
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { GrammarTierSchema } from "../grammar/tier.js"

describe("GrammarTierSchema", () => {
    it("accepts each of the four canonical tier names", () => {
        for (const tier of [
            "structural",
            "evaluable",
            "derivable",
            "presentable",
        ]) {
            expect(Value.Check(GrammarTierSchema, tier)).toBe(true)
        }
    })

    it("rejects an unknown tier name", () => {
        expect(Value.Check(GrammarTierSchema, "atomic")).toBe(false)
        expect(Value.Check(GrammarTierSchema, "Structural")).toBe(false) // case-sensitive
        expect(Value.Check(GrammarTierSchema, "")).toBe(false)
    })

    it("rejects non-string inputs", () => {
        expect(Value.Check(GrammarTierSchema, 0)).toBe(false)
        expect(Value.Check(GrammarTierSchema, null)).toBe(false)
        expect(Value.Check(GrammarTierSchema, undefined)).toBe(false)
    })
})
```

- [ ] **Step 2: Run test to verify it fails (module not found)**

```bash
pnpm exec vitest run src/schemas/__tests__/grammar-tier.test.ts
```

Expected: FAIL with "Cannot find module '../grammar/tier.js'" (or equivalent ESM resolution error).

- [ ] **Step 3: Write the schema**

```ts
// src/schemas/grammar/tier.ts
//
// The four grammar tiers form a strict subset chain
// (Structural ⊇ Evaluable ⊇ Derivable ⊇ Presentable). See cross-repo spec
// 2026-05-13-grammar-tiers-design §3 for the full definition.
//
// Wire format owned by @proposit/shared; consumed by proposit-core
// (validator implementations), proposit-server (endpoint gates),
// and proposit-mobile (inline issue surface).

import { Type, type Static } from "typebox"

export const GrammarTierSchema = Type.Union([
    Type.Literal("structural"),
    Type.Literal("evaluable"),
    Type.Literal("derivable"),
    Type.Literal("presentable"),
])

export type TGrammarTier = Static<typeof GrammarTierSchema>
```

- [ ] **Step 4: Re-run the test, expect PASS**

```bash
pnpm exec vitest run src/schemas/__tests__/grammar-tier.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/grammar/tier.ts src/schemas/__tests__/grammar-tier.test.ts
git commit -m "feat(schemas/grammar): add GrammarTierSchema (structural/evaluable/derivable/presentable)"
```

---

## Task 3: Wire-format schemas — `GrammarRuleCodeSchema`

**Files:**

- Create: `src/schemas/grammar/rule-code.ts`
- Test: `src/schemas/__tests__/grammar-rule-code.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/schemas/__tests__/grammar-rule-code.test.ts
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { GrammarRuleCodeSchema } from "../grammar/rule-code.js"

// The canonical rule-code inventory, lifted from spec §7.1. Any change here
// is a coordinated shared+core publish — see proposit-shared/CLAUDE.md
// "Grammar rule-code coordination protocol".
const ALL_CODES = [
    "S-1",
    "S-2",
    "S-3",
    "S-4",
    "S-5",
    "S-6",
    "S-7",
    "S-8",
    "S-9",
    "S-10",
    "S-11",
    "S-12",
    "S-13",
    "S-14",
    "E-1",
    "E-3",
    "E-4",
    "E-5",
    "E-6",
    "E-7",
    "D-1",
    "D-2",
    "D-3",
    "D-4",
    "D-5",
    "D-6",
    "P-1",
    "P-2",
    "P-3",
    "P-4",
    "P-5",
] as const

describe("GrammarRuleCodeSchema", () => {
    it("accepts every code in the canonical inventory", () => {
        for (const code of ALL_CODES) {
            expect(Value.Check(GrammarRuleCodeSchema, code)).toBe(true)
        }
    })

    it("has exactly 30 codes (Structural 14 + Evaluable 6 + Derivable 6 + Presentable 5 - reserved 1, restated 0)", () => {
        // Cross-check the count so a future edit that adds/removes a code
        // notices when the union grows past spec §7.1's inventory.
        expect(ALL_CODES.length).toBe(30)
    })

    it("rejects 'E-2' (reserved; promoted to Structural as S-13 per spec §4.2)", () => {
        expect(Value.Check(GrammarRuleCodeSchema, "E-2")).toBe(false)
    })

    it("rejects 'D-7' (reserved; restated as E-6 per spec §4.3)", () => {
        expect(Value.Check(GrammarRuleCodeSchema, "D-7")).toBe(false)
    })

    it("rejects codes outside the namespace", () => {
        expect(Value.Check(GrammarRuleCodeSchema, "S-99")).toBe(false)
        expect(Value.Check(GrammarRuleCodeSchema, "X-1")).toBe(false)
        expect(Value.Check(GrammarRuleCodeSchema, "s-1")).toBe(false) // case-sensitive
        expect(Value.Check(GrammarRuleCodeSchema, "S1")).toBe(false) // missing hyphen
    })
})
```

- [ ] **Step 2: Run test, expect FAIL (module missing)**

```bash
pnpm exec vitest run src/schemas/__tests__/grammar-rule-code.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write the schema**

```ts
// src/schemas/grammar/rule-code.ts
//
// Canonical grammar rule-code namespace. The string-literal codes themselves
// are owned here (wire format); proposit-core owns the *definitions* of what
// each code means and what triggers it.
//
// Codes 'E-2' and 'D-7' are intentionally absent — their rules were
// promoted/restated in the spec (E-2 → S-13 per §4.2; D-7 → E-6 per §4.3)
// and their codes are reserved (not reused) so historical references remain
// unambiguous. Do not add them back without coordinating with core.
//
// Adding a new rule code is a coordinated shared+core publish — see this
// repo's CLAUDE.md "Grammar rule-code coordination protocol" for the flow.

import { Type, type Static } from "typebox"

export const GrammarRuleCodeSchema = Type.Union([
    // Structural (S-1..S-14)
    Type.Literal("S-1"),
    Type.Literal("S-2"),
    Type.Literal("S-3"),
    Type.Literal("S-4"),
    Type.Literal("S-5"),
    Type.Literal("S-6"),
    Type.Literal("S-7"),
    Type.Literal("S-8"),
    Type.Literal("S-9"),
    Type.Literal("S-10"),
    Type.Literal("S-11"),
    Type.Literal("S-12"),
    Type.Literal("S-13"),
    Type.Literal("S-14"),
    // Evaluable (E-1, E-3..E-7 — 'E-2' reserved)
    Type.Literal("E-1"),
    Type.Literal("E-3"),
    Type.Literal("E-4"),
    Type.Literal("E-5"),
    Type.Literal("E-6"),
    Type.Literal("E-7"),
    // Derivable (D-1..D-6 — 'D-7' reserved)
    Type.Literal("D-1"),
    Type.Literal("D-2"),
    Type.Literal("D-3"),
    Type.Literal("D-4"),
    Type.Literal("D-5"),
    Type.Literal("D-6"),
    // Presentable (P-1..P-5)
    Type.Literal("P-1"),
    Type.Literal("P-2"),
    Type.Literal("P-3"),
    Type.Literal("P-4"),
    Type.Literal("P-5"),
])

export type TGrammarRuleCode = Static<typeof GrammarRuleCodeSchema>
```

- [ ] **Step 4: Re-run the test, expect PASS**

```bash
pnpm exec vitest run src/schemas/__tests__/grammar-rule-code.test.ts
```

Expected: 5 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/grammar/rule-code.ts src/schemas/__tests__/grammar-rule-code.test.ts
git commit -m "feat(schemas/grammar): add GrammarRuleCodeSchema (S/E/D/P inventory; E-2 and D-7 reserved)"
```

---

## Task 4: Wire-format schemas — `ViolationSchema`

**Files:**

- Create: `src/schemas/grammar/violation.ts`
- Test: `src/schemas/__tests__/grammar-violation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/schemas/__tests__/grammar-violation.test.ts
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { ViolationSchema } from "../grammar/violation.js"

describe("ViolationSchema", () => {
    it("accepts a minimal violation with just the three required fields", () => {
        const minimal = {
            tier: "structural",
            code: "S-1",
            message: "FK soundness: parentId 'foo' does not resolve",
        }
        expect(Value.Check(ViolationSchema, minimal)).toBe(true)
    })

    it("accepts a violation with every documented optional locator", () => {
        const fullyLocated = {
            tier: "presentable",
            code: "P-1",
            message: "Non-`not` operator is a direct child of another operator",
            argumentId: "arg-uuid",
            premiseId: "premise-uuid",
            expressionId: "expr-uuid",
            variableId: "var-uuid",
            claimId: "claim-uuid",
        }
        expect(Value.Check(ViolationSchema, fullyLocated)).toBe(true)
    })

    it("accepts rule-specific context fields beyond the documented locators (extension slot)", () => {
        // Spec §7.1: "additional rule-specific context fields as needed".
        // The TypeBox schema must allow additional properties so a future
        // rule can attach extra context without a wire-format break.
        const withExtras = {
            tier: "derivable",
            code: "D-3",
            message: "Mixed-grounding antecedent",
            premiseId: "premise-uuid",
            mixedCitationCount: 2,
            mixedAxiomCount: 1,
            antecedentSkeleton: "OR(c, c, a)",
        }
        expect(Value.Check(ViolationSchema, withExtras)).toBe(true)
    })

    it("rejects when `tier` is missing", () => {
        const bad = { code: "S-1", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `code` is missing", () => {
        const bad = { tier: "structural", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `message` is missing", () => {
        const bad = { tier: "structural", code: "S-1" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `tier` is not in the GrammarTier union", () => {
        const bad = { tier: "atomic", code: "S-1", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `code` is not in the GrammarRuleCode union", () => {
        const bad = { tier: "structural", code: "S-99", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `code` is 'E-2' (reserved)", () => {
        const bad = { tier: "evaluable", code: "E-2", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when an optional locator is the wrong type", () => {
        const bad = {
            tier: "structural",
            code: "S-1",
            message: "x",
            premiseId: 42, // expected string
        }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })
})
```

- [ ] **Step 2: Run test, expect FAIL (module missing)**

```bash
pnpm exec vitest run src/schemas/__tests__/grammar-violation.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write the schema**

```ts
// src/schemas/grammar/violation.ts
//
// Wire format for a single grammar violation. Returned by core's
// `validate(tier)` and by server's 422 grammar-violations envelope
// (see ./api/grammar-violations.ts).
//
// `tier` and `code` are constrained unions. `message` is a human-readable
// string the UI may localize/replace. The locator fields are all optional
// because some rules apply argument-wide and have no per-entity locator.
// `additionalProperties: true` reserves an extension slot for rule-specific
// context fields the validator may attach (e.g., D-3 might attach
// `mixedCitationCount`/`mixedAxiomCount` for UI rendering); see spec §7.1.

import { Type, type Static } from "typebox"
import { GrammarTierSchema } from "./tier.js"
import { GrammarRuleCodeSchema } from "./rule-code.js"

export const ViolationSchema = Type.Object(
    {
        tier: GrammarTierSchema,
        code: GrammarRuleCodeSchema,
        message: Type.String(),
        argumentId: Type.Optional(Type.String()),
        premiseId: Type.Optional(Type.String()),
        expressionId: Type.Optional(Type.String()),
        variableId: Type.Optional(Type.String()),
        claimId: Type.Optional(Type.String()),
    },
    { additionalProperties: true }
)

export type TViolation = Static<typeof ViolationSchema>
```

- [ ] **Step 4: Re-run the test, expect PASS**

```bash
pnpm exec vitest run src/schemas/__tests__/grammar-violation.test.ts
```

Expected: 10 passing tests.

- [ ] **Step 5: Verify type compatibility with core-dev's stub**

Open `/Users/brian/Projects/Proposit-App/proposit-core/docs/superpowers/plans/grammar-tiers-core-plan.md` lines 209–260 (the Task A1 stub). Read the three exported type aliases (`TGrammarTier`, `TGrammarRuleCode`, `TViolation`) and confirm the shape matches what your `Static<>` types would infer — same string-literal union members in `TGrammarTier`, same 30 codes in `TGrammarRuleCode`, same required-and-optional field set in `TViolation`. **Differences would block core-dev's Task B0.**

If you find a divergence, stop and SendMessage `team-lead` describing the divergence — do not silently make either side wrong.

- [ ] **Step 6: Commit**

```bash
git add src/schemas/grammar/violation.ts src/schemas/__tests__/grammar-violation.test.ts
git commit -m "feat(schemas/grammar): add ViolationSchema (tier+code+message+optional locators+extension slot)"
```

---

## Task 5: `src/schemas/grammar/index.ts` barrel

**Files:**

- Create: `src/schemas/grammar/index.ts`
- Test: none (pure re-export; the schema-specific tests cover correctness)

- [ ] **Step 1: Write the barrel**

```ts
// src/schemas/grammar/index.ts
//
// Public entry point for the grammar wire format. Consumed by
// proposit-core, proposit-server, and proposit-mobile via
// `@proposit/shared/schemas/grammar`.

export { GrammarTierSchema } from "./tier.js"
export type { TGrammarTier } from "./tier.js"

export { GrammarRuleCodeSchema } from "./rule-code.js"
export type { TGrammarRuleCode } from "./rule-code.js"

export { ViolationSchema } from "./violation.js"
export type { TViolation } from "./violation.js"
```

- [ ] **Step 2: Typecheck**

```bash
pnpm run typecheck
```

Expected: no errors. (No new exports map entry yet — the barrel just exists on disk; the exports entry is added in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src/schemas/grammar/index.ts
git commit -m "feat(schemas/grammar): add barrel exporting Tier, RuleCode, Violation schemas + types"
```

---

## Task 6: 422-equivalent grammar-violations response envelope

**Files:**

- Create: `src/schemas/api/grammar-violations.ts`
- Test: `src/schemas/__tests__/grammar-violations-response.test.ts`

The envelope returned by server endpoints (submit, publish) when they reject a request due to grammar violations. Per spec §10.3, the server's `validate('derivable')` and `validate('presentable')` gates produce structured 422s; this is the wire shape. Mobile maps it into the inline issue surface; server returns it; both consume the same TypeBox schema for round-trip safety.

- [ ] **Step 1: Write the failing test**

```ts
// src/schemas/__tests__/grammar-violations-response.test.ts
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { GrammarViolationsResponseSchema } from "../api/grammar-violations.js"

describe("GrammarViolationsResponseSchema", () => {
    it("accepts a response with one violation", () => {
        const body = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: [
                {
                    tier: "derivable",
                    code: "D-3",
                    message: "Mixed-grounding antecedent",
                    premiseId: "p1",
                },
            ],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, body)).toBe(true)
    })

    it("accepts a response with multiple violations across tiers", () => {
        const body = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "presentable",
            violations: [
                {
                    tier: "derivable",
                    code: "D-1",
                    message: "Derivation premise canonical shape",
                    premiseId: "p1",
                },
                {
                    tier: "presentable",
                    code: "P-1",
                    message: "Missing formula buffer",
                    premiseId: "p2",
                    expressionId: "e9",
                },
            ],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, body)).toBe(true)
    })

    it("accepts an empty violations array (degenerate case server may emit)", () => {
        const body = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "presentable",
            violations: [],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, body)).toBe(true)
    })

    it("rejects when `error` is missing", () => {
        const bad = {
            tier: "derivable",
            violations: [],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, bad)).toBe(false)
    })

    it("rejects when `tier` is not a GrammarTier", () => {
        const bad = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "atomic",
            violations: [],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, bad)).toBe(false)
    })

    it("rejects when `violations` is not an array", () => {
        const bad = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: { code: "D-1" },
        }
        expect(Value.Check(GrammarViolationsResponseSchema, bad)).toBe(false)
    })

    it("rejects when a contained violation is malformed", () => {
        const bad = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: [{ tier: "derivable", code: "D-1" }], // no `message`
        }
        expect(Value.Check(GrammarViolationsResponseSchema, bad)).toBe(false)
    })
})
```

- [ ] **Step 2: Run test, expect FAIL (module missing)**

```bash
pnpm exec vitest run src/schemas/__tests__/grammar-violations-response.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write the schema**

```ts
// src/schemas/api/grammar-violations.ts
//
// 422-equivalent response envelope returned by server endpoints that
// reject a request due to grammar-tier violations. Used by:
//   - submit/save endpoints in assistive mode (validate('derivable') gate)
//   - publish endpoint (validate('presentable') gate)
//
// `error` is the stable string discriminator ("GRAMMAR_VIOLATIONS") that
// allows clients to switch on response type without sniffing tier/codes.
// `tier` is the gate the request failed at (the strictest tier the
// endpoint enforces). `violations` is the full list — clients may render
// them inline next to the offending entity (see spec §10.3, §10.4).

import { Type, type Static } from "typebox"
import { GrammarTierSchema } from "../grammar/tier.js"
import { ViolationSchema } from "../grammar/violation.js"

export const GrammarViolationsResponseSchema = Type.Object({
    error: Type.Literal("GRAMMAR_VIOLATIONS"),
    tier: GrammarTierSchema,
    violations: Type.Array(ViolationSchema),
})

export type TGrammarViolationsResponse = Static<
    typeof GrammarViolationsResponseSchema
>
```

- [ ] **Step 4: Re-run the test, expect PASS**

```bash
pnpm exec vitest run src/schemas/__tests__/grammar-violations-response.test.ts
```

Expected: 7 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/api/grammar-violations.ts src/schemas/__tests__/grammar-violations-response.test.ts
git commit -m "feat(schemas/api): add GrammarViolationsResponseSchema (422 envelope for submit/publish gates)"
```

---

## Task 7: Wire up the exports-map entry for `./schemas/grammar`

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Read the current `exports` block**

Open `package.json` and locate the `exports` block. Confirm the existing pattern for sub-entries — every one uses all three conditions:

```json
"./schemas": {
    "types": "./dist/schemas/index.d.ts",
    "import": "./dist/schemas/index.js",
    "default": "./dist/schemas/index.js"
}
```

This three-condition pattern is **load-bearing** — `default` is required so non-`import`-aware resolvers (Jest CJS, older bundlers) can locate the dist file. The 0.2.1 patch release fixed a real bug from omitting `default`; do not regress it.

- [ ] **Step 2: Add the new `./schemas/grammar` entry**

Insert (alphabetical placement among the `./schemas/*` siblings — place after `./schemas/api/user` and before `./schemas/*` glob):

```json
"./schemas/grammar": {
    "types": "./dist/schemas/grammar/index.d.ts",
    "import": "./dist/schemas/grammar/index.js",
    "default": "./dist/schemas/grammar/index.js"
}
```

- [ ] **Step 3: Verify whether the existing `./schemas/*` wildcard covers `./schemas/api/grammar-violations`**

Look at the existing entry:

```json
"./schemas/*": {
    "types": "./dist/schemas/*.d.ts",
    "import": "./dist/schemas/*.js",
    "default": "./dist/schemas/*.js"
}
```

This is a single-level wildcard. `./schemas/api/grammar-violations` requires two-level wildcard reach (it lives at `dist/schemas/api/grammar-violations.js`). Test by running:

```bash
pnpm run build
node --input-type=module --eval "import('@proposit/shared/schemas/api/grammar-violations').then(m => console.log(Object.keys(m)))"
```

(Run from `proposit-shared/` after `pnpm install` — the package is installed-as-itself for local dev.)

If the import succeeds and prints `[ 'GrammarViolationsResponseSchema' ]`, the wildcard is reaching. If it fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`, add an explicit entry:

```json
"./schemas/api/grammar-violations": {
    "types": "./dist/schemas/api/grammar-violations.d.ts",
    "import": "./dist/schemas/api/grammar-violations.js",
    "default": "./dist/schemas/api/grammar-violations.js"
}
```

Place it alphabetically among the other explicit `./schemas/api/*` entries.

- [ ] **Step 4: Build, then verify both subpaths resolve**

```bash
pnpm run build
node --input-type=module --eval "import('@proposit/shared/schemas/grammar').then(m => console.log(Object.keys(m)))"
node --input-type=module --eval "import('@proposit/shared/schemas/api/grammar-violations').then(m => console.log(Object.keys(m)))"
```

Expected output:

```
[ 'GrammarTierSchema', 'GrammarRuleCodeSchema', 'ViolationSchema' ]
[ 'GrammarViolationsResponseSchema' ]
```

(The type-only re-exports `TGrammarTier`/`TGrammarRuleCode`/`TViolation`/`TGrammarViolationsResponse` are erased at runtime and won't appear in the runtime keys.)

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat(package): export ./schemas/grammar (+ ./schemas/api/grammar-violations if not covered by wildcard)"
```

---

## Task 8: Mutation-generator comment alignment + `populateDerivationFromCitations` deprecation note

**Files:**

- Modify: `src/engine/mutations/expressions.ts` (comment at line 385)
- Modify: `src/engine/mutations/premises.ts` (comments at lines 573, 605; add deprecation block above line 478)
- Test: none — runtime behavior is unchanged on 0.9.0 (see "Work item 2 audit finding" in the plan header). The existing `src/engine/mutations/__tests__/derivation-premises.test.ts` continues to pass; if any test fails, **stop and investigate** — the audit may have missed a code path.

- [ ] **Step 1: Confirm the audit is still accurate**

```bash
grep -nE "if.*autoNormalize|if.*grammar|enforceFormula|setGrammar|TGrammar|getGrammar" src/engine/mutations/*.ts
```

Expected: no matches. If matches appear, the audit was wrong; **stop and SendMessage team-lead** with the matches and a recommendation.

- [ ] **Step 2: Update `src/engine/mutations/expressions.ts` line 385 comment**

Find the existing comment:

```ts
// Auto-generated expressions (formula buffers from wrapInsertFormula)
```

Replace with:

```ts
// Auto-generated expressions (formula buffers inserted by the engine's
// post-mutation AN pass when running in assistive behavior; see cross-repo
// spec 2026-05-13-grammar-tiers-design §5)
```

- [ ] **Step 3: Update `src/engine/mutations/premises.ts` line 573 comment block**

Find the comment block starting at line 568 ("Standard grammar drives construction throughout. For n ≥ 2 the engine's wrapInsertFormula auto-normalize rule inserts a formula buffer between IMPLIES and OR, producing the canonical `IMPLIES(formula(OR(c1, …, cn)), Q)` shape."):

Replace the `wrapInsertFormula auto-normalize rule inserts` phrasing with:

```ts
// Standard grammar drives construction throughout. For n ≥ 2 the engine
// inserts a formula buffer between IMPLIES and OR (in core ≤ 0.12.x this
// is the `wrapInsertFormula` auto-normalize rule; in core ≥ 1.0.0 it is
// the AN post-hook in assistive behavior — see cross-repo spec
// 2026-05-13-grammar-tiers-design §5). The result is the canonical
// `IMPLIES(formula(OR(c1, …, cn)), Q)` shape. n = 0 and n = 1 have no
// operator-under-operator nesting so no formula gets inserted.
```

- [ ] **Step 4: Update `src/engine/mutations/premises.ts` line 605 comment**

Find:

```ts
// n ≥ 2: wrap with IMPLIES(OR, Q) and append citation children to OR.
// wrapInsertFormula slips a formula expression between IMPLIES and OR.
```

Replace the second line:

```ts
// n ≥ 2: wrap with IMPLIES(OR, Q) and append citation children to OR.
// The engine slips a formula expression between IMPLIES and OR
// (auto-normalize in core ≤ 0.12.x; AN post-hook in core ≥ 1.0.0
// assistive behavior).
```

- [ ] **Step 5: Add a deprecation block above `populateDerivationFromCitations` at line 478**

Find the JSDoc block that ends just before `export function populateDerivationFromCitations(`. Append a `@deprecated` paragraph at the bottom of that JSDoc:

```ts
 * @deprecated since `@proposit/shared@0.9.0`. The grammar-tiers initiative
 *   moves equivalent functionality onto the core engine as
 *   `populateFromCitations` and `populateFromAxioms` (see cross-repo spec
 *   2026-05-13-grammar-tiers-design §10.1, §12). Once `@proposit/proposit-core
 *   @^1.0.0` is the peer dep, prefer calling the engine method directly and
 *   delete this helper in a subsequent shared minor. The helper continues to
 *   function correctly against core ≤ 0.12.x.
```

- [ ] **Step 6: Verify nothing broke**

```bash
pnpm run check
```

Expected: typecheck + lint + test + build all pass. The `derivation-premises.test.ts` tests in particular must remain green — they validate the existing runtime behavior that did not change.

- [ ] **Step 7: Commit**

```bash
git add src/engine/mutations/expressions.ts src/engine/mutations/premises.ts
git commit -m "refactor(engine/mutations): update comments for new AN model; deprecate populateDerivationFromCitations"
```

---

## Task 9: Document the rule-code coordination protocol in `CLAUDE.md`

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Read the current "Key design rules" section**

Open `CLAUDE.md` and find the "Key design rules" header. The new section goes immediately after the existing bullets, before "Naming conventions".

- [ ] **Step 2: Append the protocol section**

Add this content as a new H2 (or H3 if the existing rules are bullets under an H2 — match the existing structure):

```markdown
## Grammar rule-code coordination protocol

`@proposit/shared/schemas/grammar` owns the `TGrammarRuleCode` union as wire
format. `@proposit/proposit-core` owns the validator _implementations_ — the
code that determines what triggers each code at runtime. Adding, renaming, or
removing a rule code is a **coordinated shared + core publish**:

1. **Bump shared minor**, extending (or modifying) the union in
   `src/schemas/grammar/rule-code.ts`. Tests in
   `src/schemas/__tests__/grammar-rule-code.test.ts` should be updated to
   cover the new state. Publish `@proposit/shared` to npm.
2. **Bump `@proposit/proposit-core`**, shipping the validator implementation
   that references the new code. Core's validator must `import type` the
   updated `TGrammarRuleCode` from `@proposit/shared/schemas/grammar` — the
   TypeScript build will refuse to ship a code that isn't in shared's union
   (this is the contract enforcement point; do not rely on runtime checks
   alone).
3. **Bump server + mobile deps** to pick up both new versions in lockstep.
   Mobile and server both consume `TViolation` and the codes via shared, not
   via core directly.

**Reserved codes** stay out of the union forever. As of `0.9.0`, `E-2` and
`D-7` are reserved (their rules were promoted/restated in the 2026-05-13
grammar-tiers redesign; see spec §4.2 / §4.3). Code comments in
`rule-code.ts` document the reservations — leave them in place.

**Do not let core ship a code that isn't in shared's union.** TypeScript
catches this at build time once the dep is wired through, but the
publish-order rule above is the proximate guard.
```

- [ ] **Step 3: Verify formatting**

```bash
pnpm run prettify:check
```

Expected: `CLAUDE.md` passes Prettier. If it doesn't, run `pnpm run prettify` and re-check.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude.md): add grammar rule-code coordination protocol section"
```

---

## Task 10: Draft release notes + changelog for `0.9.0`

**Files:**

- Modify or create: `docs/release-notes/upcoming.md`
- Modify or create: `docs/changelogs/upcoming.md`

- [ ] **Step 1: Check whether the upcoming files exist**

```bash
ls docs/release-notes/upcoming.md docs/changelogs/upcoming.md 2>&1
```

If they don't exist, create them per the repo's `Documentation Sync` convention (`docs/release-notes/` and `docs/changelogs/` are repo-standard locations; the trailing `upcoming.md` is the staging filename per `proposit-core/CLAUDE.md`'s pattern — `proposit-shared/CLAUDE.md` doesn't enforce this explicitly but the workspace convention is consistent).

If they exist and contain pre-0.9.0 in-flight entries (unlikely on a fresh feature branch but worth checking), append; do not overwrite.

- [ ] **Step 2: Write the release notes**

`docs/release-notes/upcoming.md`:

```markdown
# Upcoming — `@proposit/shared@0.9.0`

## New: `./schemas/grammar` wire format

Adds a new exports-map entry `./schemas/grammar` shipping the cross-repo
wire format for the grammar-tiers initiative:

- `GrammarTierSchema` / `TGrammarTier` — the four tiers
  (`structural` ⊇ `evaluable` ⊇ `derivable` ⊇ `presentable`).
- `GrammarRuleCodeSchema` / `TGrammarRuleCode` — canonical rule-code union
  (S-1..S-14, E-1, E-3..E-7, D-1..D-6, P-1..P-5; codes `E-2` and `D-7` are
  reserved).
- `ViolationSchema` / `TViolation` — the per-violation envelope returned by
  core's `validate(tier)` and surfaced inline by server/mobile UIs.

Adoption: `import { TViolation, ViolationSchema } from "@proposit/shared/schemas/grammar"`.

## New: 422 grammar-violations response envelope

Adds `./schemas/api/grammar-violations` exporting `GrammarViolationsResponseSchema`
— the standardized response server endpoints return when submit/publish
requests fail a grammar-tier gate. Mobile consumes this same schema to render
violations inline.

## Changed (contract-only): mutation-generator behavior expectations

`@proposit/shared/engine/mutations` no longer documents its behavior in terms
of specific `proposit-core` `autoNormalize` flag names (`wrapInsertFormula`,
etc.) that are being removed in `proposit-core@1.0.0`. The _runtime behavior_
of the mutation generators is unchanged on `0.9.0` against any
`@proposit/proposit-core@0.12.x` peer. When consumers upgrade to
`proposit-core@1.0+`, mutation-generator outputs become structural-only
shapes; the engine's post-mutation AN hook (assistive behavior) inserts the
formula buffers and other Presentable-tier cleanup. In permissive (advanced)
behavior, no AN runs — and that's intended.

**Action for server + mobile consumers:** none required at the `0.9.0` bump.
The breaking behavioral change surfaces only when you bump `proposit-core` to
`^1.0.0` (a separate coordinated step — see the cross-repo spec).

## Deprecated: `populateDerivationFromCitations`

The helper continues to function against `proposit-core@0.12.x` and is **not**
removed in `0.9.0`. Once `proposit-core@^1.0` is the peer dep, prefer the
engine's native `populateFromCitations` / `populateFromAxioms` and remove this
helper in a subsequent shared minor.

## New documentation

`CLAUDE.md` gains a "Grammar rule-code coordination protocol" section codifying
the shared + core publish flow for rule-code changes.
```

- [ ] **Step 3: Write the changelog**

`docs/changelogs/upcoming.md`:

```markdown
# Upcoming — `@proposit/shared@0.9.0`

## Schemas

- **Add:** `src/schemas/grammar/{tier,rule-code,violation,index}.ts` — TypeBox schemas + derived types for the grammar-tiers wire format. Tests in `src/schemas/__tests__/grammar-{tier,rule-code,violation}.test.ts`.
- **Add:** `src/schemas/api/grammar-violations.ts` — 422 response envelope. Tests in `src/schemas/__tests__/grammar-violations-response.test.ts`.

## Package

- **Add:** Exports-map entry `./schemas/grammar` with `types` + `import` + `default` conditions.
- **(Conditional) Add:** Explicit exports-map entry `./schemas/api/grammar-violations` if the existing `./schemas/*` wildcard does not reach two levels deep — verified at build time per plan Task 7 step 3.

## Engine

- **Modify:** `src/engine/mutations/expressions.ts` and `src/engine/mutations/premises.ts` — comment alignment with the new AN-post-hook model. No runtime behavior change.
- **Deprecate:** `populateDerivationFromCitations` (JSDoc `@deprecated`). Continues to function.

## Docs

- **Add:** `CLAUDE.md` "Grammar rule-code coordination protocol" section.
- **Add:** `docs/release-notes/upcoming.md`, `docs/changelogs/upcoming.md`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/release-notes/upcoming.md docs/changelogs/upcoming.md
git commit -m "docs(release): draft 0.9.0 release notes + changelog"
```

---

## Task 11: Full pipeline check

**Files:** none.

- [ ] **Step 1: Run `pnpm run check`**

```bash
pnpm run check
```

Expected: typecheck + lint + test + build all pass. The test count is the baseline + (3 + 5 + 10 + 7) = 25 new tests minimum.

- [ ] **Step 2: If anything fails, debug**

Use `superpowers:systematic-debugging`. Do not skip a failing test — fix the underlying cause. Lint failures get auto-fixed with `pnpm exec eslint . --fix` and `pnpm run prettify`.

- [ ] **Step 3: No commit** — `pnpm run check` is a verification gate, not a content change.

---

## Phase 3 — Publish

> **Gate:** Do **NOT** proceed to Task 12 until you've SendMessaged `team-lead` with the proposed version + changelog summary, and gotten an explicit OK back.

---

## Task 12: SendMessage team-lead for publish authorization

**Files:** none.

- [ ] **Step 1: Compose the message**

SendMessage `team-lead`:

```
Phase 2 complete. Ready to publish @proposit/shared@0.9.0.

Summary:
- Added /schemas/grammar wire format (TGrammarTier, TGrammarRuleCode, TViolation; codes E-2 and D-7 reserved per spec §4.2/§4.3).
- Added /schemas/api/grammar-violations 422 envelope.
- Added exports-map entry for ./schemas/grammar with types+import+default conditions.
- Added rule-code coordination protocol section to CLAUDE.md.
- Audited mutation generators per briefing work item 2; found the actual change is comment-only (no flag-driven control flow ever existed in shared's mutations). Updated 3 comments + deprecated populateDerivationFromCitations. Runtime behavior unchanged on 0.9.0; the breaking behavioral change for consumers surfaces only when they bump core to ^1.0.
- 25 new tests, all green. pnpm run check exit 0.

Proposed version: 0.9.0 (minor bump under pre-1.0; covers the contract change vs. the eventual core 1.0 model).
Release notes draft is in docs/release-notes/upcoming.md.

Awaiting OK to: pnpm version minor → pnpm publish --access public (human OTP) → tag v0.9.0 → push → PR → merge → broker READY: post.
```

- [ ] **Step 2: Wait for team-lead's reply**

Do not proceed without an explicit OK. If team-lead asks for changes (version number, release notes wording, scope), apply and re-Send. If team-lead asks for more time, ScheduleWakeup for a check-back interval matched to the wait.

---

## Task 13: Version bump

**Files:** `package.json` (version), `pnpm-lock.yaml` (auto-updated).

- [ ] **Step 1: Rename the upcoming docs to the versioned filenames**

```bash
mv docs/release-notes/upcoming.md docs/release-notes/v0.9.0.md
mv docs/changelogs/upcoming.md docs/changelogs/v0.9.0.md
```

- [ ] **Step 2: Commit the rename ahead of the version bump**

```bash
git add docs/release-notes/v0.9.0.md docs/changelogs/v0.9.0.md
git commit -m "docs(release): cut v0.9.0 release notes + changelog"
```

- [ ] **Step 3: Run `pnpm version minor`**

```bash
pnpm version minor
```

Expected: `package.json` version goes `0.8.0 → 0.9.0`; pnpm creates a commit + tag (default behavior). Verify:

```bash
git log -1 --oneline
git tag --list "v0.9.0"
```

Expected: the most recent commit is the version bump, and the tag `v0.9.0` exists locally.

If pnpm did **not** create the tag (e.g., `version.git-tag` is disabled in the workspace settings), create it manually:

```bash
git tag v0.9.0
```

---

## Task 14: Publish to npm

**Files:** none (publish operation).

- [ ] **Step 1: Run `pnpm publish --access public`**

```bash
pnpm publish --access public
```

The script invokes `prepublishOnly` → `pnpm run check` first. If anything fails, **stop** and fix. The human at the keyboard provides the npm OTP when prompted; the agent must not prompt for or fabricate one.

- [ ] **Step 2: Verify the publish landed**

```bash
npm view @proposit/shared@0.9.0 version
```

Expected: prints `0.9.0`. If not, the publish failed; debug before continuing.

---

## Task 15: Push, open PR, merge

**Files:** none (git operations).

- [ ] **Step 1: Push the branch + tag**

```bash
git push -u origin grammar-tiers/shared
git push origin v0.9.0
```

- [ ] **Step 2: Open the PR with `gh pr create`**

```bash
gh pr create --title "Grammar Tiers — shared wire format + 0.9.0 release" --body "$(cat <<'EOF'
## Summary

Publishes `@proposit/shared@0.9.0` with the cross-repo grammar-tiers wire format. Sequenced first per spec §10.5 (shared → core → server + mobile).

- New `./schemas/grammar` module exporting `GrammarTierSchema` / `GrammarRuleCodeSchema` / `ViolationSchema` and their derived TypeScript types. Codes `E-2` and `D-7` are reserved per spec §4.2 / §4.3.
- New `./schemas/api/grammar-violations` 422 envelope returned by submit/publish endpoints.
- New `CLAUDE.md` section codifying the shared+core publish protocol for rule-code changes.
- Comment alignment in `src/engine/mutations/{expressions,premises}.ts` plus `@deprecated` JSDoc on `populateDerivationFromCitations` (helper continues to function; native replacement ships in core 1.0).

Audit finding: the briefing's "remove flag-driven cleanup ops from mutation generators" wording overstated the work. No flag-named control flow existed in shared's mutation generators; the only references were comments documenting core's behavior. Updated those comments to describe the new AN post-hook model rather than specific removed flag names. Runtime behavior on `0.9.0` is unchanged against any `proposit-core@0.12.x`.

## Test plan

- [ ] `pnpm run check` green (typecheck + lint + test + build).
- [ ] 25+ new tests covering the schemas and the 422 envelope.
- [ ] `node --input-type=module --eval "import('@proposit/shared/schemas/grammar')..."` resolves at runtime after `pnpm run build`.
- [ ] `npm view @proposit/shared@0.9.0 version` returns `0.9.0`.

Cross-repo spec: `proposit-orchestration/docs/superpowers/specs/2026-05-13-grammar-tiers-design.md` (§7.1, §10.2).
EOF
)"
```

- [ ] **Step 3: Merge once the PR is approved**

```bash
gh pr merge --squash --delete-branch
```

(Or `--merge` / `--rebase` if the repo convention differs — check the existing PR history with `gh pr list --state merged --limit 3`.)

---

## Task 16: Broker `READY:` + final SendMessage

**Files:** none.

- [ ] **Step 1: Post on the broker thread `grammar-tiers`**

Use the broker tool to post:

```
READY: @proposit/shared@0.9.0 published with /schemas/grammar wire format + 422 envelope. Core can bump.

Notes for core-dev:
- Pin to ^0.9.0 (your plan's Task B0 hardcodes ^0.3.0 — bump to ^0.9.0).
- Wire-format types live at @proposit/shared/schemas/grammar exactly as your A1 stub shape; re-export should be a no-op type-wise.
- 422 envelope at @proposit/shared/schemas/api/grammar-violations — server-dev will consume it later.
```

- [ ] **Step 2: SendMessage team-lead with completion**

```
Phase 3 complete. @proposit/shared@0.9.0 published, tagged, merged. Posted READY: on broker thread `grammar-tiers` with note for core-dev to update their B0 pin from ^0.3.0 to ^0.9.0. Standing by for cleanup / next initiative.
```

---

# Plan summary

| Phase         | Tasks                  | Output                                                                                     |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| 1 — Plan      | This document          | Saved + summarized to team-lead with TaskCreate IDs                                        |
| 2 — Implement | 1 — Branch + baseline  | Feature branch checked out, `pnpm run check` green                                         |
| 2 — Implement | 2–6 — Schemas          | `tier.ts`, `rule-code.ts`, `violation.ts`, `index.ts`, `api/grammar-violations.ts` + tests |
| 2 — Implement | 7 — Exports map        | `package.json` updated; subpath imports resolve at runtime                                 |
| 2 — Implement | 8 — Mutation comments  | 3 comments updated, `populateDerivationFromCitations` `@deprecated`                        |
| 2 — Implement | 9 — CLAUDE.md          | Coordination protocol section added                                                        |
| 2 — Implement | 10 — Release docs      | `upcoming.md` drafts in `docs/release-notes/` + `docs/changelogs/`                         |
| 2 — Implement | 11 — Pipeline check    | `pnpm run check` green                                                                     |
| 3 — Publish   | 12 — Auth gate         | SendMessage team-lead, wait for OK                                                         |
| 3 — Publish   | 13 — Version bump      | `pnpm version minor` → 0.9.0, tag created                                                  |
| 3 — Publish   | 14 — npm publish       | `pnpm publish --access public` (human OTP), verify with `npm view`                         |
| 3 — Publish   | 15 — Push + PR         | Branch + tag pushed, PR opened, PR merged                                                  |
| 3 — Publish   | 16 — Broker + closeout | `READY:` posted, team-lead notified                                                        |

**Risk register:**

| Risk                                                                  | Mitigation                                                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Core-dev's A1 stub shape diverges from shared's TypeBox-derived types | Task 4 step 5 explicitly verifies. If divergent, stop + escalate.                                                               |
| Existing `./schemas/*` wildcard doesn't reach two levels deep         | Task 7 step 3 runs a runtime probe and adds an explicit entry if needed.                                                        |
| Mutation-generator audit missed a flag-driven code path               | Task 8 step 1 re-runs the audit grep; Task 8 step 6 runs the full test suite. Any failure stops the task.                       |
| Briefing's "0.2.1 → 0.3.0" version target is wrong                    | Confirmed during Phase 1. Plan uses `0.8.0 → 0.9.0`; team-lead acknowledged in Phase 1 SendMessage and updated task #9 subject. |
| Core-dev's plan hardcodes `^0.3.0` peer pin                           | Plan calls this out in Task 16 step 1 broker post. Core-dev's B0 needs a pin update.                                            |
