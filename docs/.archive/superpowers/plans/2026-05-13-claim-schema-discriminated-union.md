# `ClaimSchema` Discriminated-Union Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the flat `ClaimSchema` in `@proposit/shared` into a discriminated union of three variant schemas (`NormalClaimSchema`, `CitationClaimSchema`, `AxiomaticClaimSchema`), introduce a concrete `AxiomaticClaimSchema` with an `axiom` payload, deduplicate `digest`, rename `ClaimKinds` → `NormalClaimKinds`, and propagate the change through the engine, api-client, tests, and release docs.

**Architecture:** Each variant is a `Type.Interface([Parent...], { overrides })` with the `type` field as a literal discriminant. Variants carry the same field set; fields that don't apply to a variant serialize as `Type.Null()`. The union `ClaimSchema = Type.Union([Normal, Citation, Axiomatic])` is the source of `TClaim`. Internal narrowing uses three `is{Normal,Citation,Axiomatic}Claim` type guards.

**Tech Stack:** TypeScript, `typebox@^1.1.14` (the `typebox` package — not `@sinclair/typebox`), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-05-13-claim-schema-discriminated-union-design.md`

**Pre-flight notes:**

- The worktree has three uncommitted changes from the brainstorming session: a re-export aliases edit in `src/schemas/model/claims.ts` (gets superseded by Task 2), and edits to `docs/release-notes/upcoming.md` and `docs/changelogs/upcoming.md` (folded into Task 9). The plan handles these explicitly.
- There is a known pre-existing typecheck failure at `src/engine/text-tree.ts:121` (the `claim.type` widening from commit c442af4). Task 4 fixes it.

---

### Task 1: Add the new test cases to `claims.test.ts` (red phase)

**Files:**

- Modify: `src/schemas/__tests__/claims.test.ts`

This is the test-first step for the variant schemas. The new tests reference exports (`NormalClaimSchema`, `CitationClaimSchema`, `AxiomaticClaimSchema`, type guards) that don't exist yet — they will fail to compile until Task 2.

- [ ] **Step 1: Replace `claims.test.ts` wholesale with the new variant-aware test suite**

```ts
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    AxiomaticClaimSchema,
    CitationClaimSchema,
    ClaimSchema,
    isAxiomaticClaim,
    isCitationClaim,
    isNormalClaim,
    NormalClaimSchema,
    type TAxiomaticClaim,
    type TCitationClaim,
    type TNormalClaim,
} from "../model/claims.js"

const ID = "11111111-1111-1111-1111-111111111111"
const ARG_ID = "22222222-2222-2222-2222-222222222222"
const CREATOR_ID = "33333333-3333-3333-3333-333333333333"
const NOW = new Date("2026-05-06T00:00:00Z")

const normalBase = {
    id: ID,
    argumentId: ARG_ID,
    version: 1,
    claimForkId: null,
    creatorId: CREATOR_ID,
    createdOn: NOW,
    parentId: null,
    digest: "digest-normal",
    type: "normal" as const,
    kind: "claim" as const,
    title: "Cats are mammals",
    body: "All cats are mammals.",
    titleContentHash: "hash-of-title",
    url: null,
    citation: null,
    citationContentHash: null,
    axiom: null,
}

const citationBase = {
    id: ID,
    argumentId: ARG_ID,
    version: 1,
    claimForkId: null,
    creatorId: CREATOR_ID,
    createdOn: NOW,
    parentId: null,
    digest: "digest-citation",
    type: "citation" as const,
    kind: null,
    title: null,
    body: null,
    titleContentHash: null,
    url: "https://example.com/paper",
    citation: {
        kind: "journal-article",
        authors: [{ given: "A", family: "Author" }],
        year: 2024,
        title: "An IEEE-style title",
        journal: "Journal of Examples",
    },
    citationContentHash: "hash-of-citation",
    axiom: null,
}

const axiomaticBase = {
    id: ID,
    argumentId: ARG_ID,
    version: 1,
    claimForkId: null,
    creatorId: CREATOR_ID,
    createdOn: NOW,
    parentId: null,
    digest: "digest-axiomatic",
    type: "axiomatic" as const,
    kind: null,
    title: null,
    body: null,
    titleContentHash: null,
    url: null,
    citation: null,
    citationContentHash: null,
    axiom: "definition" as const,
}

describe("NormalClaimSchema", () => {
    it("accepts a well-formed normal claim", () => {
        expect(Value.Check(NormalClaimSchema, normalBase)).toBe(true)
    })

    it("rejects a normal claim with a non-null citation field", () => {
        const bad = { ...normalBase, url: "https://wrong.example.com" }
        expect(Value.Check(NormalClaimSchema, bad)).toBe(false)
    })

    it("rejects a normal claim with a non-null axiom field", () => {
        const bad = { ...normalBase, axiom: "definition" }
        expect(Value.Check(NormalClaimSchema, bad)).toBe(false)
    })

    it("rejects a normal claim with null titleContentHash", () => {
        const bad = { ...normalBase, titleContentHash: null }
        expect(Value.Check(NormalClaimSchema, bad)).toBe(false)
    })
})

describe("CitationClaimSchema", () => {
    it("accepts a well-formed citation claim", () => {
        expect(Value.Check(CitationClaimSchema, citationBase)).toBe(true)
    })

    it("rejects a citation claim whose title is non-null", () => {
        const bad = { ...citationBase, title: "Some title" }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })

    it("rejects a citation claim whose kind is non-null", () => {
        const bad = { ...citationBase, kind: "claim" }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })

    it("rejects a citation claim missing the URL", () => {
        const bad = { ...citationBase, url: null }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })

    it("rejects a citation claim with a non-null axiom field", () => {
        const bad = { ...citationBase, axiom: "definition" }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })
})

describe("AxiomaticClaimSchema", () => {
    it("accepts a well-formed axiomatic claim for each axiom kind", () => {
        const kinds = [
            "definition",
            "stipulation",
            "logical-principle",
            "mathematical-principle",
            "domain-rule",
            "background-assumption",
        ] as const
        for (const axiom of kinds) {
            expect(
                Value.Check(AxiomaticClaimSchema, { ...axiomaticBase, axiom })
            ).toBe(true)
        }
    })

    it("rejects an axiomatic claim with a non-null title", () => {
        const bad = { ...axiomaticBase, title: "Some title" }
        expect(Value.Check(AxiomaticClaimSchema, bad)).toBe(false)
    })

    it("rejects an axiomatic claim with a non-null citation field", () => {
        const bad = { ...axiomaticBase, url: "https://example.com" }
        expect(Value.Check(AxiomaticClaimSchema, bad)).toBe(false)
    })

    it("rejects an axiomatic claim whose axiom is null", () => {
        const bad = { ...axiomaticBase, axiom: null }
        expect(Value.Check(AxiomaticClaimSchema, bad)).toBe(false)
    })

    it("rejects an axiomatic claim whose axiom is an unrecognised literal", () => {
        const bad = { ...axiomaticBase, axiom: "made-up-kind" }
        expect(Value.Check(AxiomaticClaimSchema, bad)).toBe(false)
    })
})

describe("ClaimSchema (union)", () => {
    it("accepts each variant", () => {
        expect(Value.Check(ClaimSchema, normalBase)).toBe(true)
        expect(Value.Check(ClaimSchema, citationBase)).toBe(true)
        expect(Value.Check(ClaimSchema, axiomaticBase)).toBe(true)
    })

    it("rejects an object whose type is not one of the three literals", () => {
        const bad = { ...normalBase, type: "unknown" }
        expect(Value.Check(ClaimSchema, bad)).toBe(false)
    })
})

describe("Claim type guards", () => {
    it("isNormalClaim narrows correctly", () => {
        const c = normalBase as TNormalClaim
        expect(isNormalClaim(c)).toBe(true)
        expect(isCitationClaim(c)).toBe(false)
        expect(isAxiomaticClaim(c)).toBe(false)
    })

    it("isCitationClaim narrows correctly", () => {
        const c = citationBase as TCitationClaim
        expect(isCitationClaim(c)).toBe(true)
        expect(isNormalClaim(c)).toBe(false)
        expect(isAxiomaticClaim(c)).toBe(false)
    })

    it("isAxiomaticClaim narrows correctly", () => {
        const c = axiomaticBase as TAxiomaticClaim
        expect(isAxiomaticClaim(c)).toBe(true)
        expect(isNormalClaim(c)).toBe(false)
        expect(isCitationClaim(c)).toBe(false)
    })
})
```

- [ ] **Step 2: Run the test file to confirm it fails to compile**

Run: `pnpm exec vitest run src/schemas/__tests__/claims.test.ts`
Expected: FAIL with TypeScript compile errors about missing exports (`NormalClaimSchema`, `CitationClaimSchema`, `AxiomaticClaimSchema`, `isNormalClaim`, etc.).

- [ ] **Step 3: Do NOT commit yet**

The tests compile-fail by design. Commit at the end of Task 2 when the schema is in place.

---

### Task 2: Implement the new `claims.ts` module (green phase)

**Files:**

- Modify (wholesale replace): `src/schemas/model/claims.ts`

- [ ] **Step 1: Replace `claims.ts` wholesale**

```ts
import Type, { type Static } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"
import { IEEEReferenceSchema } from "./references.js"
import {
    CoreClaimAxiomaticTypeSchema,
    CoreClaimCitationTypeSchema,
    CoreClaimNormalTypeSchema,
    CoreClaimTypeSchema,
} from "@proposit/proposit-core"

// Re-export aliases so consumers that imported ClaimTypeSchema / TClaimType
// from @proposit/shared/schemas keep working without code edits.
export const ClaimTypeSchema = CoreClaimTypeSchema
export type TClaimType = Static<typeof ClaimTypeSchema>

export const AxiomKindSchema = Type.Union([
    Type.Literal("definition"),
    Type.Literal("stipulation"),
    Type.Literal("logical-principle"),
    Type.Literal("mathematical-principle"),
    Type.Literal("domain-rule"),
    Type.Literal("background-assumption"),
])
export type TAxiomKind = Static<typeof AxiomKindSchema>

// Single source of truth for `digest`. Everything that needs digest inherits
// from this rather than re-declaring the field.
const ClaimMetadataFieldsSchema = Type.Object({
    digest: Type.String(),
})

// Normal-only mutable fields. Citation/Axiomatic variants do NOT inherit from
// this — they redeclare title/body/titleContentHash inline as Type.Null().
export const MutableClaimFieldsSchema = Type.Object({
    title: Type.String(),
    body: Type.String(),
    titleContentHash: Type.String(),
})
export type TMutableClaimFields = Static<typeof MutableClaimFieldsSchema>

// Update request: Normal mutable fields + digest. Update is Normal-only in
// this bump (creation/update for Citation/Axiomatic comes later).
export const ClaimUpdateRequestSchema = Type.Interface(
    [MutableClaimFieldsSchema, ClaimMetadataFieldsSchema],
    {}
)
export type TClaimUpdateFields = Static<typeof ClaimUpdateRequestSchema>

// Presentation taxonomy — Normal-claim-only. `kind` is null on Citation and
// Axiomatic claims.
export const NormalClaimKinds = {
    CLAIM: "claim",
    CONCLUSION: "conclusion",
    DEFINITION: "definition",
    CRITERION: "criterion",
} as const

const NormalClaimChildKindsSchema = Type.Union([
    Type.Literal(NormalClaimKinds.DEFINITION),
    Type.Literal(NormalClaimKinds.CRITERION),
])
const NormalClaimLogicalKindsSchema = Type.Union([
    Type.Literal(NormalClaimKinds.CONCLUSION),
    Type.Literal(NormalClaimKinds.CLAIM),
])

export const NormalClaimKindsSchema = Type.Union([
    NormalClaimChildKindsSchema,
    NormalClaimLogicalKindsSchema,
])
export type TNormalClaimKinds = Static<typeof NormalClaimKindsSchema>

// Identity / lineage fields shared by all variants, with digest inherited.
const ClaimSharedFieldsSchema = Type.Interface([ClaimMetadataFieldsSchema], {
    id: UUID,
    argumentId: UUID,
    version: Type.Number(),
    claimForkId: Nullable(UUID),
    creatorId: UUID,
    createdOn: EncodableDate,
    parentId: Nullable(UUID),
})

export const NormalClaimSchema = Type.Interface(
    [ClaimSharedFieldsSchema, MutableClaimFieldsSchema],
    {
        type: CoreClaimNormalTypeSchema,
        kind: NormalClaimKindsSchema,
        url: Type.Null(),
        citation: Type.Null(),
        citationContentHash: Type.Null(),
        axiom: Type.Null(),
    }
)
export type TNormalClaim = Static<typeof NormalClaimSchema>

export const CitationClaimSchema = Type.Interface([ClaimSharedFieldsSchema], {
    type: CoreClaimCitationTypeSchema,
    kind: Type.Null(),
    title: Type.Null(),
    body: Type.Null(),
    titleContentHash: Type.Null(),
    url: Type.String(),
    citation: IEEEReferenceSchema,
    citationContentHash: Type.String(),
    axiom: Type.Null(),
})
export type TCitationClaim = Static<typeof CitationClaimSchema>

export const AxiomaticClaimSchema = Type.Interface([ClaimSharedFieldsSchema], {
    type: CoreClaimAxiomaticTypeSchema,
    kind: Type.Null(),
    title: Type.Null(),
    body: Type.Null(),
    titleContentHash: Type.Null(),
    url: Type.Null(),
    citation: Type.Null(),
    citationContentHash: Type.Null(),
    axiom: AxiomKindSchema,
})
export type TAxiomaticClaim = Static<typeof AxiomaticClaimSchema>

export const ClaimSchema = Type.Union([
    NormalClaimSchema,
    CitationClaimSchema,
    AxiomaticClaimSchema,
])
export type TClaim = Static<typeof ClaimSchema>

export function isNormalClaim(claim: TClaim): claim is TNormalClaim {
    return claim.type === "normal"
}
export function isCitationClaim(claim: TClaim): claim is TCitationClaim {
    return claim.type === "citation"
}
export function isAxiomaticClaim(claim: TClaim): claim is TAxiomaticClaim {
    return claim.type === "axiomatic"
}

// Re-based on NormalClaimSchema. Server's getClaims() filters by
// type='normal' before populating childClaimIds/childCitationIds, so this
// type accurately describes only Normal-with-children rows.
export const ClaimWithChildrenSchema = Type.Interface([NormalClaimSchema], {
    childClaimIds: Type.Array(UUID),
    childCitationIds: Type.Array(UUID),
})
export type TClaimWithChildren = Static<typeof ClaimWithChildrenSchema>
```

- [ ] **Step 2: Run the schema tests to confirm they pass**

Run: `pnpm exec vitest run src/schemas/__tests__/claims.test.ts`
Expected: PASS (all tests from Task 1 green).

- [ ] **Step 3: Run typecheck to see what else needs fixing**

Run: `pnpm run typecheck`
Expected: FAIL with errors in `src/engine/text-tree.ts` (still has the pre-existing widening issue), the test fixture files identified in the spec, and possibly other downstream consumers. This is expected — subsequent tasks resolve each one.

- [ ] **Step 4: Commit**

```bash
git add src/schemas/model/claims.ts src/schemas/__tests__/claims.test.ts
git commit -m "$(cat <<'EOF'
feat(schemas): split ClaimSchema into discriminated union of Normal / Citation / Axiomatic variants

- New per-variant schemas with the `type` field as literal discriminant.
- Each variant carries every field; inapplicable fields are `Type.Null()`.
- New `AxiomKindSchema` with six axiom kinds; `AxiomaticClaimSchema` carries
  one of them as `axiom`.
- `digest` deduplicated via a new `ClaimMetadataFieldsSchema` parent inherited
  by `ClaimSharedFieldsSchema` and `ClaimUpdateRequestSchema`.
- Renames: `ClaimKinds` -> `NormalClaimKinds`, `ChildClaimKinds` ->
  `NormalClaimChildKindsSchema`, `LogicalClaimKinds` ->
  `NormalClaimLogicalKindsSchema`, `ClaimKindsSchema` ->
  `NormalClaimKindsSchema`, `TClaimKindsSchema` -> `TNormalClaimKinds`.
- `kind` is now `Null` on Citation and Axiomatic variants.
- `MutableClaimFieldsSchema` reverted to Normal-only with non-null
  title/body/titleContentHash.
- `ClaimWithChildrenSchema` re-based on `NormalClaimSchema`.
- New type guards: `isNormalClaim`, `isCitationClaim`, `isAxiomaticClaim`.
EOF
)"
```

---

### Task 3: Add `consts/axioms.ts` with labels and descriptions

**Files:**

- Create: `src/consts/axioms.ts`
- Create: `src/consts/__tests__/axioms.test.ts`
- Modify: `src/consts/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/consts/__tests__/axioms.test.ts

import { describe, expect, it } from "vitest"
import { AXIOM_KIND_DESCRIPTIONS, AXIOM_KIND_LABELS } from "../axioms.js"

const ALL_KINDS = [
    "definition",
    "stipulation",
    "logical-principle",
    "mathematical-principle",
    "domain-rule",
    "background-assumption",
] as const

describe("AXIOM_KIND_LABELS", () => {
    it("has a non-empty label for every kind", () => {
        for (const kind of ALL_KINDS) {
            expect(AXIOM_KIND_LABELS[kind]).toBeTruthy()
        }
    })
})

describe("AXIOM_KIND_DESCRIPTIONS", () => {
    it("has a non-empty description for every kind", () => {
        for (const kind of ALL_KINDS) {
            expect(AXIOM_KIND_DESCRIPTIONS[kind]).toBeTruthy()
        }
    })

    it("includes an example sentence in each description", () => {
        for (const kind of ALL_KINDS) {
            expect(AXIOM_KIND_DESCRIPTIONS[kind]).toMatch(/Example:/)
        }
    })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/consts/__tests__/axioms.test.ts`
Expected: FAIL with a compile error about a missing module `../axioms.js`.

- [ ] **Step 3: Create `src/consts/axioms.ts`**

```ts
import type { TAxiomKind } from "../schemas/model/claims.js"

export const AXIOM_KIND_LABELS: Readonly<Record<TAxiomKind, string>> = {
    definition: "True by definition or meaning",
    stipulation: "Assumed for this argument",
    "logical-principle": "Basic logical principle",
    "mathematical-principle": "Basic mathematical principle",
    "domain-rule": "Rule or authority within a system",
    "background-assumption": "General background assumption",
} as const

export const AXIOM_KIND_DESCRIPTIONS: Readonly<Record<TAxiomKind, string>> = {
    definition:
        "Use when the claim is treated as true because of what the relevant words, categories, or concepts mean. Example: 'A bachelor is unmarried.'",
    stipulation:
        "Use when the argument explicitly defines or assumes something for its own purposes. Example: 'For this argument, an active user means someone who logs in weekly.'",
    "logical-principle":
        "Use for basic principles of valid reasoning. Example: 'If P implies Q, and P is true, then Q follows.'",
    "mathematical-principle":
        "Use for basic mathematical identities, axioms, or quantitative rules. Example: 'For any number x, x + 0 = x.'",
    "domain-rule":
        "Use for rules, standards, texts, contracts, doctrines, protocols, or authorities internal to a system. Example: 'Under this contract, payment is due within 30 days.'",
    "background-assumption":
        "Use for a foundational assumption the argument relies on but does not prove. Example: 'Human well-being matters.'",
} as const
```

- [ ] **Step 4: Add the barrel export**

In `src/consts/index.ts`, append:

```ts
export * from "./axioms.js"
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec vitest run src/consts/__tests__/axioms.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/consts/axioms.ts src/consts/__tests__/axioms.test.ts src/consts/index.ts
git commit -m "feat(consts): add AXIOM_KIND_LABELS and AXIOM_KIND_DESCRIPTIONS"
```

---

### Task 4: Fix `text-tree.ts` narrowing and update its tests

**Files:**

- Modify: `src/engine/text-tree.ts` (top-level imports, `TTextTreeItem.claimType` field around line 33, the `claimType` local around line 114)
- Modify: `src/engine/__tests__/text-tree.test.ts` (the `CLAIM_DEFAULTS` const, the citation test, and a new axiomatic test)

- [ ] **Step 1: Replace `CLAIM_DEFAULTS` with per-variant defaults**

In `src/engine/__tests__/text-tree.test.ts`, find the current `CLAIM_DEFAULTS` const (around lines 52-62). Replace it with:

```ts
const NORMAL_CLAIM_DEFAULTS = {
    argumentId: "arg-1",
    version: 1,
    claimForkId: null,
    creatorId: "user-1",
    createdOn: new Date(),
    kind: "claim" as const,
    type: "normal" as const,
    parentId: null,
    digest: "digest",
    titleContentHash: "hash",
    url: null,
    citation: null,
    citationContentHash: null,
    axiom: null,
}

const CITATION_CLAIM_DEFAULTS = {
    argumentId: "arg-1",
    version: 1,
    claimForkId: null,
    creatorId: "user-1",
    createdOn: new Date(),
    kind: null,
    type: "citation" as const,
    parentId: null,
    digest: "digest",
    title: null,
    body: null,
    titleContentHash: null,
    url: "https://example.com/source",
    citation: {
        kind: "journal-article",
        authors: [{ given: "A", family: "Author" }],
        year: 2024,
        title: "Cited Title",
        journal: "Journal",
    },
    citationContentHash: "citation-hash",
    axiom: null,
}

const AXIOMATIC_CLAIM_DEFAULTS = {
    argumentId: "arg-1",
    version: 1,
    claimForkId: null,
    creatorId: "user-1",
    createdOn: new Date(),
    kind: null,
    type: "axiomatic" as const,
    parentId: null,
    digest: "digest",
    title: null,
    body: null,
    titleContentHash: null,
    url: null,
    citation: null,
    citationContentHash: null,
    axiom: "definition" as const,
}
```

- [ ] **Step 2: Update every existing reference to `CLAIM_DEFAULTS`**

Search-and-replace within the test file: every `...CLAIM_DEFAULTS` in a _normal-claim_ fixture becomes `...NORMAL_CLAIM_DEFAULTS`. There are multiple — at minimum the ones around lines 74, 141, 232, 240, 308, 320 (the line numbers may shift after Step 1; just replace all occurrences). The citation-claim test around line 137-188 is special; handle it in the next step.

- [ ] **Step 3: Rewrite the citation test to use the new defaults**

Find the `test("populates claimType='citation' from snapshot claim type", ...)` block (around line 137). The claim literal inside `claims: { "claim-cite": { ... } }` currently spreads `CLAIM_DEFAULTS` and overrides `type: "citation"` plus supplies a non-null `title`/`body`. Replace the claim literal with:

```ts
claims: {
    "claim-cite": {
        ...CITATION_CLAIM_DEFAULTS,
        id: "claim-cite",
    },
},
```

The rest of the test (variables, premises, assertions) does not change.

- [ ] **Step 4: Add a new test for axiomatic claims**

Immediately after the citation test, insert:

```ts
test("populates claimType='axiomatic' from snapshot claim type and falls back to empty title/body", () => {
    const snapshot = makeSnapshot({
        claims: {
            "claim-ax": {
                ...AXIOMATIC_CLAIM_DEFAULTS,
                id: "claim-ax",
            },
        },
        variables: {
            "var-1": {
                ...VAR_DEFAULTS,
                id: "var-1",
                symbol: "X",
                claimId: "claim-ax",
                claimVersion: 1,
            } as unknown as TProjectReactiveSnapshot["variables"][string],
        },
        premises: {
            "premise-1": {
                premise: {
                    id: "premise-1",
                    title: null,
                    type: "freeform",
                } as TProjectReactiveSnapshot["premises"][string]["premise"],
                rootExpressionId: "expr-1",
                expressions: {
                    "expr-1": {
                        ...EXPR_DEFAULTS,
                        id: "expr-1",
                        type: "variable",
                        variableId: "var-1",
                        operator: null,
                        premiseId: "premise-1",
                        parentId: null,
                        position: 0,
                    } as unknown as TPropositionalExpressionCombined,
                },
            },
        },
    })

    const result = buildTextTree(snapshot)
    const claimItem = result.find((i) => i.type === "claim")
    expect(claimItem).toMatchObject({
        type: "claim",
        claimId: "claim-ax",
        claimType: "axiomatic",
        claimTitle: "",
        claimBody: "",
    })
})
```

- [ ] **Step 5: Run the test file to confirm the new shape**

Run: `pnpm exec vitest run src/engine/__tests__/text-tree.test.ts`
Expected: FAIL — the axiomatic test expects `claimType: "axiomatic"` but the existing `text-tree.ts` still types `claimType` as `"normal" | "citation"`. Also, the existing citation test's assertion expects `claimType: "citation"` — that still passes structurally, but the new axiomatic case will fail until Step 6 is done.

- [ ] **Step 6: Update `src/engine/text-tree.ts` to widen and narrow**

Open `src/engine/text-tree.ts`. At the top of the file, add or merge the import:

```ts
import type { TClaim, TClaimType } from "../schemas/model/claims.js"
import { isNormalClaim } from "../schemas/model/claims.js"
```

(If `TClaim` is already imported elsewhere in the file, merge into that line.)

Find the `TTextTreeItem` type definition (around line 18). Within its union, locate the `claimType: "normal" | "citation"` field (around line 33) and replace it with:

```ts
claimType: TClaimType
```

Find the `if (expr.type === "variable")` block (around line 109). Replace its body in full so it reads:

```ts
if (expr.type === "variable") {
    const variable = variables[expr.variableId]
    let claimId: string | null = null
    let claimTitle = ""
    let claimBody = ""
    let claimType: TClaimType = "normal"
    if (variable && "claimId" in variable) {
        claimId = variable.claimId
        const claim = claims[variable.claimId]
        if (claim) {
            claimType = claim.type
            if (isNormalClaim(claim)) {
                claimTitle = claim.title
                claimBody = claim.body
            }
            // Citation and Axiomatic claims have no user-authored title or
            // body in this schema; rendering for those variants is a follow-up.
        }
    }
    items.push({
        type: "claim",
        expressionId: expr.id,
        variableId: expr.variableId,
        claimId,
        claimTitle,
        claimBody,
        claimType,
        negated,
        isConclusion,
        depth,
    })
    return
}
```

- [ ] **Step 7: Run the test file and the typecheck**

Run: `pnpm exec vitest run src/engine/__tests__/text-tree.test.ts`
Expected: PASS (all three variant cases pass).

Run: `pnpm run typecheck`
Expected: No more errors in `text-tree.ts`. Other files (fixture helpers, etc.) may still have errors — those come in later tasks.

- [ ] **Step 8: Commit**

```bash
git add src/engine/text-tree.ts src/engine/__tests__/text-tree.test.ts
git commit -m "fix(text-tree): narrow claim variant via isNormalClaim; widen claimType to TClaimType"
```

---

### Task 5: Update `mutations/__tests__/helpers.ts:mkTestClaim`

**Files:**

- Modify: `src/engine/mutations/__tests__/helpers.ts:25-39`

`mkTestClaim` currently returns a partial `TClaim` cast with `as TClaim`. Under the new schema it must return a complete `TNormalClaim` with all the new null fields and a non-null `titleContentHash`. Also note: the existing helper has `forkId: null`, but the actual field name on `TClaim` is `claimForkId` — a pre-existing typo masked by the `as TClaim` cast. Fix it as part of the same edit.

- [ ] **Step 1: Replace `mkTestClaim`**

```ts
export function mkTestClaim(overrides?: Partial<TClaim>): TClaim {
    const normalDefault: TClaim = {
        id: crypto.randomUUID(),
        argumentId: "test-arg-id",
        version: 1,
        creatorId: "test-user-id",
        createdOn: new Date("2026-01-01"),
        title: "Test claim",
        body: "",
        titleContentHash: "test-hash",
        digest: "test-digest",
        kind: "claim",
        type: "normal",
        parentId: null,
        claimForkId: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: null,
    }
    return { ...normalDefault, ...overrides } as TClaim
}
```

(Keep the `as TClaim` final cast for now — `overrides` is `Partial<TClaim>` over a union, which TypeScript can't always re-discriminate after a spread.)

- [ ] **Step 2: Run mutation tests**

Run: `pnpm exec vitest run src/engine/mutations`
Expected: PASS (or any remaining failures are due to test bodies that explicitly pass `forkId` rather than `claimForkId` — fix those inline if surfaced).

- [ ] **Step 3: Commit**

```bash
git add src/engine/mutations/__tests__/helpers.ts
git commit -m "test(mutations): update mkTestClaim helper for new ClaimSchema shape"
```

---

### Task 6: Update `engine/__tests__/engine.test.ts:makeClaim`

**Files:**

- Modify: `src/engine/__tests__/engine.test.ts:46-62` (the inner `makeClaim` factory)

- [ ] **Step 1: Update the `makeClaim` factory**

Find the `function makeClaim(overrides: Partial<TClaim> = {}): TClaim {` at around line 46. Update its return literal so it includes all the new null fields and a non-null `titleContentHash`:

```ts
function makeClaim(overrides: Partial<TClaim> = {}): TClaim {
    const normalDefault: TClaim = {
        id: v4(),
        argumentId,
        version: argumentVersion,
        title: "Test Claim",
        body: "Test body",
        titleContentHash: "test-hash",
        kind: "claim" as const,
        type: "normal" as const,
        creatorId,
        createdOn: now,
        digest: "stmt-digest",
        parentId: null,
        claimForkId: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: null,
    }
    return { ...normalDefault, ...overrides } as TClaim
}
```

- [ ] **Step 2: Run engine tests**

Run: `pnpm exec vitest run src/engine/__tests__/engine.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/engine/__tests__/engine.test.ts
git commit -m "test(engine): update inline makeClaim factory for new ClaimSchema shape"
```

---

### Task 7: Update `review/__tests__/fixtures.ts:makeClaim`

**Files:**

- Modify: `src/engine/review/__tests__/fixtures.ts:83-98`

- [ ] **Step 1: Update the `makeClaim` factory**

Find `function makeClaim(id: string, title: string): TClaim {` at line 83. Replace with:

```ts
function makeClaim(id: string, title: string): TClaim {
    return {
        id,
        argumentId: ARGUMENT_ID,
        version: ARGUMENT_VERSION,
        title,
        body: `Body of ${title}`,
        titleContentHash: `hash-of-${id}`,
        kind: "claim",
        type: "normal",
        creatorId: CREATOR_ID,
        createdOn: NOW,
        digest: `digest-${id}`,
        parentId: null,
        claimForkId: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: null,
    }
}
```

- [ ] **Step 2: Run review tests**

Run: `pnpm exec vitest run src/engine/review`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/engine/review/__tests__/fixtures.ts
git commit -m "test(review): update makeClaim factory for new ClaimSchema shape"
```

---

### Task 8: Full typecheck + test sweep

**Files:** none modified directly; verifies downstream consumers.

- [ ] **Step 1: Run the full typecheck**

Run: `pnpm run typecheck`
Expected: PASS. If there are remaining errors, they're in test fixtures or downstream code not yet swept. For each error: open the file, add the four missing null fields and a non-null `titleContentHash` to the offending claim literal. Commit each fix with a `test: ...` or `fix: ...` message.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm run test`
Expected: PASS.

- [ ] **Step 3: Run the full lint**

Run: `pnpm run lint`
Expected: PASS.

- [ ] **Step 4: If any fixes were needed in Step 1, commit them now**

```bash
# Example — only run if the previous steps surfaced extra files:
git add <files>
git commit -m "test: update remaining claim fixtures for new ClaimSchema shape"
```

If no fixes were needed, skip the commit.

---

### Task 9: Update `docs/release-notes/upcoming.md` and `docs/changelogs/upcoming.md`

**Files:**

- Modify: `docs/release-notes/upcoming.md`
- Modify: `docs/changelogs/upcoming.md`

Both files have in-flight edits from the brainstorming session. The current content describes the proposit-core v0.12 upgrade plus the earlier `ClaimTypeSchema` widening — but now the bump also includes the full discriminated-union refactor. The release notes need a new section, and the changelog needs a new breaking-changes subsection.

- [ ] **Step 1: Add a new section to `docs/release-notes/upcoming.md`**

Find the existing `### ClaimTypeSchema / TClaimType widened to core's union` subsection. Append a new subsection immediately below it:

```markdown
### `ClaimSchema` discriminated union

`ClaimSchema` is now a `Type.Union` of three per-variant schemas:

- `NormalClaimSchema` — `type: "normal"`, required `title` / `body` / `titleContentHash`, all citation/axiom fields are `null`.
- `CitationClaimSchema` — `type: "citation"`, all `MutableClaimFields` and `kind` are `null`, required `url` / `citation` / `citationContentHash`.
- `AxiomaticClaimSchema` — `type: "axiomatic"`, all `MutableClaimFields` / `kind` / citation fields are `null`, required `axiom` (one of six `TAxiomKind` literals).

The wire format guarantees every claim carries every field; inapplicable fields serialize as JSON `null`. Consumers must not strip nulls before sending or validating.

New exports from `@proposit/shared/schemas`:

- Variant schemas: `NormalClaimSchema`, `CitationClaimSchema`, `AxiomaticClaimSchema`.
- Variant types: `TNormalClaim`, `TCitationClaim`, `TAxiomaticClaim`.
- Axiom-kind schema and type: `AxiomKindSchema`, `TAxiomKind`.
- Type guards: `isNormalClaim`, `isCitationClaim`, `isAxiomaticClaim`.

Renames (breaking):

| Before              | After                           |
| ------------------- | ------------------------------- |
| `ClaimKinds`        | `NormalClaimKinds`              |
| `ChildClaimKinds`   | `NormalClaimChildKindsSchema`   |
| `LogicalClaimKinds` | `NormalClaimLogicalKindsSchema` |
| `ClaimKindsSchema`  | `NormalClaimKindsSchema`        |
| `TClaimKindsSchema` | `TNormalClaimKinds`             |

`MutableClaimFieldsSchema` is now Normal-only with non-null `title` / `body` / `titleContentHash`. `TClaimUpdateFields` therefore requires `titleContentHash: string` — every caller of the api-client's `updateClaim` must compute and pass the title hash, or `strictFetch` rejects the request body client-side. The orchestrator's per-repo briefings for server and mobile call this out as an explicit caller-update item.

`ClaimWithChildrenSchema` is re-based on `NormalClaimSchema` (server's `getClaims` filters by `type='normal'`).

A new `@proposit/shared/consts` module — `AXIOM_KIND_LABELS` and `AXIOM_KIND_DESCRIPTIONS` — ships human-readable strings for the six axiom kinds.

Engine-side axiomatic support (`axiomsMap`, `getAxiomsForClaim`, `addAxiom`, `removeAxiom` on `PropositArgumentEngine`; `axioms` slot on `FullArgumentSchema` / `ArgumentDiffSchema`) is still deferred to a later bump.
```

Also update the existing "Out of scope (deferred)" section of `upcoming.md` if it still says shared has no axiomatic schema slot — it does now (`AxiomaticClaimSchema` is concrete). Replace the relevant bullet so it only mentions the engine-side and wire-level axiom accessors as deferred.

- [ ] **Step 2: Add a new section to `docs/changelogs/upcoming.md`**

Find the existing `## Breaking changes — ClaimTypeSchema widened to core's union` subsection. After it, add:

```markdown
## Breaking changes — `ClaimSchema` discriminated union

- `ClaimSchema` is now `Type.Union([NormalClaimSchema, CitationClaimSchema, AxiomaticClaimSchema])`. Each variant is a `Type.Interface` with the `type` field as the literal discriminant and every variant-specific field declared (with `Type.Null()` on inapplicable fields).
- New exports: `NormalClaimSchema`, `CitationClaimSchema`, `AxiomaticClaimSchema`, `AxiomKindSchema`, `TNormalClaim`, `TCitationClaim`, `TAxiomaticClaim`, `TAxiomKind`, `isNormalClaim`, `isCitationClaim`, `isAxiomaticClaim`.
- Renames: `ClaimKinds` → `NormalClaimKinds`, `ChildClaimKinds` → `NormalClaimChildKindsSchema`, `LogicalClaimKinds` → `NormalClaimLogicalKindsSchema`, `ClaimKindsSchema` → `NormalClaimKindsSchema`, `TClaimKindsSchema` → `TNormalClaimKinds`. Note: the renamed `*ChildKindsSchema` / `*LogicalKindsSchema` symbols were previously module-internal `const`s; the rename only affects users who had grepped into `claims.ts` for them.
- `MutableClaimFieldsSchema` is now Normal-only with non-null `title: string`, `body: string`, `titleContentHash: string`. This makes `titleContentHash` required on every `TClaimUpdateFields` PATCH body.
- `ClaimWithChildrenSchema` re-based on `NormalClaimSchema`.
- `digest` deduplicated via a new internal `ClaimMetadataFieldsSchema` parent inherited by both `ClaimUpdateRequestSchema` and `ClaimSharedFieldsSchema`.
- `kind` is now `Type.Null()` on Citation and Axiomatic variants.
- New module `src/consts/axioms.ts` exports `AXIOM_KIND_LABELS` and `AXIOM_KIND_DESCRIPTIONS`.

## Breaking changes — caller updates required

- Every caller of the api-client's `updateClaim` must compute and pass `titleContentHash: string` on the PATCH body. Previously implicit-optional; now required by `MutableClaimFieldsSchema`. Affected callers: `proposit-server` internal call sites, `proposit-mobile` claim-edit UI.

## Internal

- `src/engine/text-tree.ts` narrows `claim` via `isNormalClaim` before reading `title` / `body`; `claimType` local and `TTextTreeItem.claimType` widened from `"normal" | "citation"` to `TClaimType`. Citation and Axiomatic claims fall back to empty `claimTitle` / `claimBody` in this bump — proper rendering for those variants is a follow-up.
- Test fixtures updated in `src/engine/__tests__/engine.test.ts`, `src/engine/__tests__/text-tree.test.ts`, `src/engine/mutations/__tests__/helpers.ts`, `src/engine/review/__tests__/fixtures.ts`, and `src/schemas/__tests__/claims.test.ts`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/release-notes/upcoming.md docs/changelogs/upcoming.md
git commit -m "docs(release-notes): document ClaimSchema discriminated-union refactor"
```

---

### Task 10: Run the full pipeline and offer the version cut

**Files:** none modified directly until/unless the user approves the version cut.

- [ ] **Step 1: Run the full check pipeline**

Run: `pnpm run check`
Expected: PASS. If anything fails, fix and re-run.

- [ ] **Step 2: Verify nothing is uncommitted**

Run: `git status`
Expected: clean working tree (other than possibly the spec doc and plan file themselves, depending on whether those were committed earlier).

- [ ] **Step 3: Ask the user before cutting the version**

Do **not** run `pnpm version` autonomously. Present the user with a summary of what shipped in this bump and ask whether to cut `v0.8.0`. Suggested phrasing:

> "Refactor implementation complete. `pnpm run check` is clean. Want me to cut `v0.8.0` now? That would: bump `package.json` to `0.8.0`, rename `docs/release-notes/upcoming.md` → `docs/release-notes/0.8.0.md` and `docs/changelogs/upcoming.md` → `docs/changelogs/0.8.0.md`, create fresh empty `upcoming.md` files, commit, and tag `v0.8.0`."

- [ ] **Step 4: If the user approves, cut the version**

The repo uses pnpm. `pnpm version minor` auto-commits and auto-tags by default — pass `--no-git-tag-version` so the bump is staged without a commit, then everything goes in one commit + one tag.

```bash
pnpm version minor --no-git-tag-version
git mv docs/release-notes/upcoming.md docs/release-notes/0.8.0.md
git mv docs/changelogs/upcoming.md docs/changelogs/0.8.0.md
```

Create fresh empty `upcoming.md` files. Use the Write tool (not `echo`), with this content for `docs/release-notes/upcoming.md`:

```markdown
# Upcoming release notes
```

And this content for `docs/changelogs/upcoming.md`:

```markdown
# Upcoming changelog
```

Then:

```bash
git add package.json docs/release-notes docs/changelogs
git commit -m "chore(release): cut v0.8.0"
git tag v0.8.0
```

- [ ] **Step 5: Do not push the tag**

Per the repo's CLAUDE.md, tag publishing is a user-initiated step. Tell the user the tag is in place locally; do not run `git push` or `git push --tags`.

---

## Notes for the executing agent

- The repo's `CLAUDE.md` says commit messages must not include `Co-Authored-By` or other co-authoring trailers. The commit-message templates above are clean — keep them that way.
- The repo's `CLAUDE.md` also requires `brain-style` naming. The new identifiers in this plan (`NormalClaimSchema`, `TNormalClaim`, etc.) follow that style. If you find yourself naming a new helper, check the skill before committing.
- ESM imports in `src/` must end in `.js`. All examples in this plan follow that.
- `lib: ["ES2022"]` is enforced in `tsconfig.json` — no Node-only or DOM globals in code that ships to `dist/`.
- Don't add features beyond what each task specifies. If you notice unrelated improvements, leave them for a follow-up — this plan is already a coordinated breaking-changes refactor.
