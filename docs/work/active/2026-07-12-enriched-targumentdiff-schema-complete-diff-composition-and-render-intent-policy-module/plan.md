# Enriched TArgumentDiff + composition + render-policy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give `@proposit/shared` the lossless four-state `TArgumentDiff` wire
schema, a runtime-agnostic claim+citation composition module, and a render-intent
policy module — so server and mobile render argument diffs from one contract with
no reimplemented semantics.

**Architecture:** Mirror `@proposit/proposit-core@2.5.0`'s diff shape
(`TCoreArgumentDiff`, four-state `state`, nested `expressions.modified`, `roles`)
in TypeBox, specialized to shared's app-level entity schemas; add two
platform-agnostic engine modules (`composeArgumentDiff`, `buildDiffRenderMaps`)
that lift the claim/citation fold + `buildDiffMaps` out of `proposit-server`.

**Tech Stack:** TypeScript (ESM, `.js` import suffixes), TypeBox (`typebox`),
Vitest, pnpm. `@proposit/proposit-core@2.5.0` (peer + dev dep).

**Reference:** spec.md (this folder); design doc
`docs/design/2026-07-12-argument-diff-modification-semantics.md`.

## Global Constraints

- **Runtime-agnostic.** No DOM, no Node-only APIs, no `react`/`next`/`expo`/DB/
  `console` in `src/`. `lib: ["ES2022"]` (`CLAUDE.md`). Composition/render inputs
  are plain arrays/maps the caller supplies.
- **ESM imports** in `src/` end in `.js`; directory imports use explicit
  `index.js` (`CLAUDE.md`).
- **TypeBox conventions** (`skill-cefailures:typebox`): schemas `PascalCaseSchema`,
  derived types `T`-prefixed via `Static<>`.
- **brain-style** naming/casing (TypeScript sub-skill); ESLint-enforced.
- **No planning-language in shipped code** (workspace `CLAUDE.md`): no
  slice/phase/epic labels, review-finding codes, or `docs/work/**` paths in
  comments, test titles, or strings. Explain behavior/invariants, not roadmap.
- **Diff-stability expectation:** composing an unchanged before/after ⇒ an empty
  diff (no `added`/`removed`/`modified` anywhere); a single entity edit ⇒ exactly
  one `modified-own` origin. Each module carries a test asserting this.
- **Consumers must not reimplement diff semantics.** Composition + render policy
  live here; server/mobile only orchestrate + paint.
- **Wire break rides a MINOR bump** (pre-1.0 policy, `CLAUDE.md`).
- **Exports:** new files under `src/engine/*.ts` resolve via the `./engine/*`
  wildcard (`package.json:171`) — no exports-map edit. Adding a new subpath dir
  would require all three of `types`/`import`/`default`.
- Commit messages carry no co-authoring/trailers.

---

### Task 1: Bump the core dep to 2.5.0

**Files:**
- Modify: `package.json:210` (peerDep), `package.json:218` (devDep)

**Interfaces:**
- Produces: `@proposit/proposit-core@2.5.0` resolvable in the workspace — exposes
  `TCoreArgumentDiff`, `TCoreDiffState`, `TCoreEntitySetDiff`, `TCoreRoleDiff`,
  `TCoreFieldChange`.

**Complexity: low** (mechanical). NOT a `bllm-agent` candidate — needs a network
`pnpm install`; do it yourself (workspace `CLAUDE.md`: network installs are not
headless-safe).

- [ ] **Step 1: Edit the two ranges**

`package.json`: peerDependencies `"@proposit/proposit-core": "^2.3.0"` →
`"^2.5.0"`; devDependencies `"@proposit/proposit-core": "^2.3.1"` → `"^2.5.0"`.

- [ ] **Step 2: Install**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared install`
Expected: lockfile updates; `@proposit/proposit-core@2.5.0` linked.

- [ ] **Step 3: Verify the four-state types resolve**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec tsc --noEmit -e 'import type { TCoreArgumentDiff, TCoreDiffState } from "@proposit/proposit-core"'`
(or add a throwaway `import type` line to a scratch `.ts` and typecheck).
Expected: no "has no exported member" error.

- [ ] **Step 4: Full check green**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared run check`
Expected: PASS (baseline before any code change).

- [ ] **Step 5: Commit**

```bash
git -C /Users/brian/Projects/Proposit-App/proposit-shared add package.json pnpm-lock.yaml
git -C /Users/brian/Projects/Proposit-App/proposit-shared commit -m "chore: bump @proposit/proposit-core to ^2.5.0 (four-state diff)"
```

---

### Task 2: Enriched `TArgumentDiff` wire schema

**Files:**
- Modify: `src/schemas/model/arguments.ts:73-102` (replace `ArgumentDiffSchema`)
- Test: `src/schemas/model/__tests__/argument-diff-schema.test.ts` (create)

**Interfaces:**
- Consumes: `ClaimSchema` (`schemas/model/claims.ts`), `ClaimCitationSchema`
  (`schemas/model/citations.ts:5`), `PropositionalVariableSchema` /
  `PropositionalExpressionSchema` / `PropositionalPremiseSchema`
  (`schemas/logic.ts:98,59,112`), `Nullable`/`UUID` (`schemas/common.ts`).
- Produces: `ArgumentDiffSchema`, `type TArgumentDiff`, and exported primitives
  `DiffStateSchema`, `type TDiffState`, `entitySetDiff`, `entityFieldDiff`
  (consumed by Tasks 3–4). Shape per spec.md §1:
  `{ claims: EntitySetDiff<Claim>, variables: EntitySetDiff<Var>, premises:
  {added,removed,modified: (EntityFieldDiff<Premise> & {expressions:
  EntitySetDiff<Expr>})[]}, citations: EntitySetDiff<Citation>, roles:
  {conclusion:{before,after}} }`.

**Complexity: standard** (schema design + generic factories; single file).

- [ ] **Step 1: Write the failing test**

```ts
// src/schemas/model/__tests__/argument-diff-schema.test.ts
import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import { ArgumentDiffSchema } from "../arguments.js"

const emptyDiff = {
    claims: { added: [], removed: [], modified: [] },
    variables: { added: [], removed: [], modified: [] },
    premises: { added: [], removed: [], modified: [] },
    citations: { added: [], removed: [], modified: [] },
    roles: { conclusion: { before: null, after: null } },
}

describe("ArgumentDiffSchema", () => {
    it("accepts an empty four-bucket diff", () => {
        expect(Value.Check(ArgumentDiffSchema, emptyDiff)).toBe(true)
    })

    it("requires state on a modified variable entry", () => {
        const bad = structuredClone(emptyDiff)
        // a modified entry missing `state` must be rejected
        ;(bad.variables.modified as unknown[]).push({
            before: {},
            after: {},
            changes: [],
        })
        expect(Value.Check(ArgumentDiffSchema, bad)).toBe(false)
    })

    it("accepts modified-own / modified-within states and nested expression diffs", () => {
        const ok = structuredClone(emptyDiff)
        ;(ok.premises.modified as unknown[]).push({
            before: { id: "p1", role: "supporting" },
            after: { id: "p1", role: "supporting" },
            changes: [],
            state: "modified-within",
            expressions: {
                added: [],
                removed: [],
                modified: [
                    {
                        before: { id: "e1", type: "operator", operator: "and" },
                        after: { id: "e1", type: "operator", operator: "or" },
                        changes: [{ field: "operator", before: "and", after: "or" }],
                        state: "modified-own",
                    },
                ],
            },
        })
        // structural presence check only — entity sub-schemas validated elsewhere
        expect(
            Value.Check(ArgumentDiffSchema.properties.premises, ok.premises)
        ).toBe(true)
    })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec vitest run src/schemas/model/__tests__/argument-diff-schema.test.ts`
Expected: FAIL — current `ArgumentDiffSchema` has `updated`, no `state`, no
`premises.modified`.

- [ ] **Step 3: Rewrite `ArgumentDiffSchema`**

In `src/schemas/model/arguments.ts`, add `TSchema` to the `typebox` import and
replace lines 73-102 with:

```ts
export const DiffStateSchema = Type.Union([
    Type.Literal("modified-own"),
    Type.Literal("modified-within"),
])
export type TDiffState = Static<typeof DiffStateSchema>

export const FieldChangeSchema = Type.Object({
    field: Type.String(),
    before: Type.Unknown(),
    after: Type.Unknown(),
})

export const entityFieldDiff = <T extends TSchema>(schema: T) =>
    Type.Object({
        before: schema,
        after: schema,
        changes: Type.Array(FieldChangeSchema),
        state: DiffStateSchema,
    })

export const entitySetDiff = <T extends TSchema>(schema: T) =>
    Type.Object({
        added: Type.Array(schema),
        removed: Type.Array(schema),
        modified: Type.Array(entityFieldDiff(schema)),
    })

export const ArgumentDiffSchema = Type.Object({
    claims: entitySetDiff(ClaimSchema),
    variables: entitySetDiff(PropositionalVariableSchema),
    premises: Type.Object({
        added: Type.Array(PropositionalPremiseSchema),
        removed: Type.Array(PropositionalPremiseSchema),
        modified: Type.Array(
            Type.Intersect([
                entityFieldDiff(PropositionalPremiseSchema),
                Type.Object({
                    expressions: entitySetDiff(PropositionalExpressionSchema),
                }),
            ])
        ),
    }),
    citations: entitySetDiff(ClaimCitationSchema),
    roles: Type.Object({
        conclusion: Type.Object({
            before: Nullable(UUID),
            after: Nullable(UUID),
        }),
    }),
})
export type TArgumentDiff = Static<typeof ArgumentDiffSchema>
```

`Nullable` and `UUID` are already imported (`arguments.ts:8`); `Static` is
imported (`arguments.ts:1`) — add `type TSchema` to that import.

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec vitest run src/schemas/model/__tests__/argument-diff-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck (surfaces the api-client + downstream break)**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared run typecheck`
Expected: PASS — `src/api-client/argument/index.ts:135` only validates against
the schema, so no type break there; if any shared code destructured `.updated`,
fix it now (grep `\.updated` under `src/`).

- [ ] **Step 6: Commit**

```bash
git -C /Users/brian/Projects/Proposit-App/proposit-shared add src/schemas/model/arguments.ts src/schemas/model/__tests__/argument-diff-schema.test.ts
git -C /Users/brian/Projects/Proposit-App/proposit-shared commit -m "feat: four-state lossless TArgumentDiff wire schema"
```

---

### Task 3: Composition module — core structural fold + claim four-state

**Files:**
- Create: `src/engine/diff.ts`
- Test: `src/engine/__tests__/diff.test.ts`

**Interfaces:**
- Consumes: `TArgumentDiff` + `entitySetDiff` types (Task 2);
  `TCoreArgumentDiff`, `TCoreFieldChange` from `@proposit/proposit-core`;
  `TClaim` (`schemas/model/claims.ts`), `TClaimCitation`
  (`schemas/model/citations.ts`), `TPropositional*` (`schemas/logic.ts`).
- Produces: `composeArgumentDiff(input): TArgumentDiff` with the signature in
  spec.md §2. Task 4 extends the same function's citation branch.

**Complexity: high** (the semantic core; multi-entity fold + filtering).

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/__tests__/diff.test.ts
import { describe, it, expect } from "vitest"
import { composeArgumentDiff } from "../diff.js"

// minimal TCoreArgumentDiff-shaped fixture (unchanged structural diff)
const emptyCore = {
    argument: { before: {}, after: {}, changes: [], state: "modified-within" },
    variables: { added: [], removed: [], modified: [] },
    premises: { added: [], removed: [], modified: [] },
    roles: { conclusion: { before: "p1", after: "p1" } },
} as const

const claim = (id: string, digest: string) =>
    ({ id, digest, type: "normal" }) as unknown as Parameters<
        typeof composeArgumentDiff
    >[0]["claimsAfter"][number]

describe("composeArgumentDiff", () => {
    it("unchanged inputs produce an empty diff (diff-stability)", () => {
        const c = claim("c1", "d1")
        const out = composeArgumentDiff({
            coreDiff: emptyCore as never,
            claimsBefore: [c],
            claimsAfter: [c],
            citationsBefore: [],
            citationsAfter: [],
            derivationPremiseIds: new Set(),
        })
        expect(out.claims).toEqual({ added: [], removed: [], modified: [] })
        expect(out.roles.conclusion).toEqual({ before: "p1", after: "p1" })
    })

    it("a claim digest change is exactly one modified-own origin", () => {
        const out = composeArgumentDiff({
            coreDiff: emptyCore as never,
            claimsBefore: [claim("c1", "OLD")],
            claimsAfter: [claim("c1", "NEW")],
            citationsBefore: [],
            citationsAfter: [],
            derivationPremiseIds: new Set(),
        })
        expect(out.claims.added).toEqual([])
        expect(out.claims.removed).toEqual([])
        expect(out.claims.modified).toHaveLength(1)
        expect(out.claims.modified[0].state).toBe("modified-own")
        expect(out.claims.modified[0].after.id).toBe("c1")
    })

    it("filters derivation-premise expressions", () => {
        const coreWithDeriv = {
            ...emptyCore,
            premises: {
                added: [{ id: "dp", type: "derivation", role: "supporting" }],
                removed: [],
                modified: [],
            },
        }
        const out = composeArgumentDiff({
            coreDiff: coreWithDeriv as never,
            claimsBefore: [],
            claimsAfter: [],
            citationsBefore: [],
            citationsAfter: [],
            derivationPremiseIds: new Set(["dp"]),
        })
        expect(out.premises.added).toEqual([])
    })
})
```

- [ ] **Step 2: Run test — expect FAIL** (`composeArgumentDiff` undefined)

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec vitest run src/engine/__tests__/diff.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement composition (claim + structural + filter; citations stubbed empty)**

```ts
// src/engine/diff.ts
import type {
    TCoreArgumentDiff,
} from "@proposit/proposit-core"
import type { TArgumentDiff } from "../schemas/model/arguments.js"
import type { TClaim } from "../schemas/model/claims.js"
import type { TClaimCitation } from "../schemas/model/citations.js"
import type {
    TPropositionalVariable,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
} from "../schemas/logic.js"

export interface ComposeArgumentDiffInput {
    coreDiff: TCoreArgumentDiff<
        { id: string; version: number },
        TPropositionalVariable,
        TPropositionalPremise,
        TPropositionalExpressionCombined
    >
    claimsBefore: TClaim[]
    claimsAfter: TClaim[]
    citationsBefore: TClaimCitation[]
    citationsAfter: TClaimCitation[]
    derivationPremiseIds: ReadonlySet<string>
    claimForkMap?: ReadonlyMap<string, string>
}

/**
 * Folds app-level claim + citation diffs onto core's structural argument diff,
 * producing the lossless four-state wire shape. Claims and citations are not
 * part of the engine's structural graph, so their diffs are composed here from
 * the entity arrays the caller supplies (the caller owns data access).
 */
export function composeArgumentDiff(
    input: ComposeArgumentDiffInput
): TArgumentDiff {
    const { coreDiff, derivationPremiseIds } = input

    // Claims: match after -> before by id (through the fork map when a fork
    // renamed the entity). A digest change is the entity's own content change.
    const beforeById = new Map(input.claimsBefore.map((c) => [c.id, c]))
    const matchedBefore = new Set<string>()
    const claimsAdded: TClaim[] = []
    const claimsModified: TArgumentDiff["claims"]["modified"] = []
    for (const after of input.claimsAfter) {
        const beforeId = input.claimForkMap?.get(after.id) ?? after.id
        const before = beforeById.get(beforeId)
        if (!before) {
            claimsAdded.push(after)
            continue
        }
        matchedBefore.add(before.id)
        if (before.digest !== after.digest) {
            claimsModified.push({
                before,
                after,
                changes: [{ field: "digest", before: before.digest, after: after.digest }],
                state: "modified-own",
            })
        }
    }
    const claimsRemoved = input.claimsBefore.filter(
        (c) => !matchedBefore.has(c.id)
    )

    // Premises / expressions: carry core's four-state through, dropping
    // engine-synthesized derivation premises (and their expressions) — they are
    // auto-managed model state, not authored content.
    const keepPremise = (p: { id: string }) => !derivationPremiseIds.has(p.id)
    const keepExprSet = <E extends { premiseId?: string }>(set: {
        added: E[]
        removed: E[]
        modified: { before: E; after: E; changes: unknown[]; state: string }[]
    }) => ({
        added: set.added.filter((e) => !derivationPremiseIds.has(e.premiseId ?? "")),
        removed: set.removed.filter(
            (e) => !derivationPremiseIds.has(e.premiseId ?? "")
        ),
        modified: set.modified.filter(
            (m) => !derivationPremiseIds.has(m.after.premiseId ?? "")
        ),
    })

    const premises: TArgumentDiff["premises"] = {
        added: coreDiff.premises.added.filter(keepPremise) as TArgumentDiff["premises"]["added"],
        removed: coreDiff.premises.removed.filter(keepPremise) as TArgumentDiff["premises"]["removed"],
        modified: coreDiff.premises.modified
            .filter((m) => keepPremise(m.after))
            .map((m) => ({
                before: m.before,
                after: m.after,
                changes: m.changes,
                state: m.state,
                expressions: keepExprSet(m.expressions),
            })) as TArgumentDiff["premises"]["modified"],
    }

    return {
        claims: {
            added: claimsAdded,
            removed: claimsRemoved,
            modified: claimsModified,
        },
        variables:
            coreDiff.variables as unknown as TArgumentDiff["variables"],
        premises,
        citations: composeCitations(input), // Task 4 fills this in
        roles: {
            conclusion: {
                before: coreDiff.roles.conclusion.before ?? null,
                after: coreDiff.roles.conclusion.after ?? null,
            },
        },
    }
}

// Placeholder until Task 4 — returns an empty citation diff so the module
// compiles and the claim/structural tests run in isolation.
function composeCitations(
    _input: ComposeArgumentDiffInput
): TArgumentDiff["citations"] {
    return { added: [], removed: [], modified: [] }
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec vitest run src/engine/__tests__/diff.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/brian/Projects/Proposit-App/proposit-shared add src/engine/diff.ts src/engine/__tests__/diff.test.ts
git -C /Users/brian/Projects/Proposit-App/proposit-shared commit -m "feat: composeArgumentDiff — fold claim four-state onto core structural diff"
```

---

### Task 4: Citation four-state in the composition (resolves OQ4)

**Files:**
- Modify: `src/engine/diff.ts` (replace `composeCitations`)
- Test: `src/engine/__tests__/diff.test.ts` (add cases)

**Interfaces:**
- Consumes: `ComposeArgumentDiffInput.citationsBefore/After` (Task 3).
- Produces: fully-populated `citations: entitySetDiff(ClaimCitation)` —
  `added`/`removed` by endpoint-pair membership; `modified-within` when a matched
  edge's version pins or checksum changed. Identity = `(claimId,
  supportingClaimId)` (spec.md §4; NOT row `id`, NOT `checksum`).

**Complexity: standard** (single function; clear rule).

- [ ] **Step 1: Write the failing tests**

```ts
// append to src/engine/__tests__/diff.test.ts
import type { TClaimCitation } from "../../schemas/model/citations.js"

const cite = (
    claimId: string,
    supportingClaimId: string,
    supportingClaimVersion: number,
    checksum = "k"
): TClaimCitation =>
    ({
        id: `row-${Math.random()}`, // deliberately unstable — must NOT be identity
        claimId,
        claimVersion: 0,
        supportingClaimId,
        supportingClaimVersion,
        checksum,
        argumentId: "a1",
        createdOn: new Date().toISOString(),
    }) as unknown as TClaimCitation

const base = {
    coreDiff: {
        argument: { before: {}, after: {}, changes: [], state: "modified-within" },
        variables: { added: [], removed: [], modified: [] },
        premises: { added: [], removed: [], modified: [] },
        roles: { conclusion: { before: null, after: null } },
    } as never,
    claimsBefore: [],
    claimsAfter: [],
    derivationPremiseIds: new Set<string>(),
}

describe("composeArgumentDiff — citations", () => {
    it("new endpoint pair is added; dropped pair is removed", () => {
        const out = composeArgumentDiff({
            ...base,
            citationsBefore: [cite("c1", "s1", 0)],
            citationsAfter: [cite("c1", "s2", 0)],
        })
        expect(out.citations.added.map((c) => c.supportingClaimId)).toEqual(["s2"])
        expect(out.citations.removed.map((c) => c.supportingClaimId)).toEqual(["s1"])
        expect(out.citations.modified).toEqual([])
    })

    it("same endpoint pair with a bumped supporting version is modified-within", () => {
        const out = composeArgumentDiff({
            ...base,
            citationsBefore: [cite("c1", "s1", 0)],
            citationsAfter: [cite("c1", "s1", 1)],
        })
        expect(out.citations.added).toEqual([])
        expect(out.citations.removed).toEqual([])
        expect(out.citations.modified).toHaveLength(1)
        expect(out.citations.modified[0].state).toBe("modified-within")
        expect(out.citations.modified[0].after.supportingClaimVersion).toBe(1)
    })

    it("identical citation sets produce no citation diff (stability)", () => {
        const out = composeArgumentDiff({
            ...base,
            citationsBefore: [cite("c1", "s1", 0, "same")],
            citationsAfter: [cite("c1", "s1", 0, "same")],
        })
        expect(out.citations).toEqual({ added: [], removed: [], modified: [] })
    })
})
```

Note the `after` in `base` diff is `citationsAfter`/`citationsBefore` supplied
per-test. (`citationsBefore`/`citationsAfter` are omitted from `base` on purpose.)

- [ ] **Step 2: Run — expect FAIL** (current stub returns empty, so the
  add/remove and modified cases fail).

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec vitest run src/engine/__tests__/diff.test.ts -t citations`
Expected: FAIL.

- [ ] **Step 3: Implement `composeCitations`**

Replace the placeholder in `src/engine/diff.ts`:

```ts
// A citation is a directional support edge; its identity is the endpoint pair
// (claimId, supportingClaimId). The row id is minted fresh when an edge is
// carried across versions/forks, and the checksum is the edge's content — so
// neither can serve as identity. A matched edge whose version pins or checksum
// moved reflects that a referenced claim advanced: modified-within, never
// modified-own (changing an endpoint is a different edge).
const citationKey = (c: TClaimCitation) => `${c.claimId}:${c.supportingClaimId}`

function composeCitations(
    input: ComposeArgumentDiffInput
): TArgumentDiff["citations"] {
    const beforeByKey = new Map(
        input.citationsBefore.map((c) => [citationKey(c), c])
    )
    const matched = new Set<string>()
    const added: TClaimCitation[] = []
    const modified: TArgumentDiff["citations"]["modified"] = []

    for (const after of input.citationsAfter) {
        const key = citationKey(after)
        const before = beforeByKey.get(key)
        if (!before) {
            added.push(after)
            continue
        }
        matched.add(key)
        const changes = citationPinChanges(before, after)
        if (changes.length > 0) {
            modified.push({ before, after, changes, state: "modified-within" })
        }
    }
    const removed = input.citationsBefore.filter(
        (c) => !matched.has(citationKey(c))
    )
    return { added, removed, modified }
}

function citationPinChanges(before: TClaimCitation, after: TClaimCitation) {
    const changes: { field: string; before: unknown; after: unknown }[] = []
    for (const field of ["claimVersion", "supportingClaimVersion", "checksum"] as const) {
        if (before[field] !== after[field]) {
            changes.push({ field, before: before[field], after: after[field] })
        }
    }
    return changes
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec vitest run src/engine/__tests__/diff.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git -C /Users/brian/Projects/Proposit-App/proposit-shared add src/engine/diff.ts src/engine/__tests__/diff.test.ts
git -C /Users/brian/Projects/Proposit-App/proposit-shared commit -m "feat: citation four-state via endpoint-pair identity (modified-within on pin bump)"
```

---

### Task 5: Render-intent policy module

**Files:**
- Create: `src/engine/diff-render.ts`
- Test: `src/engine/__tests__/diff-render.test.ts`

**Interfaces:**
- Consumes: `TArgumentDiff` (Task 2); `TClaim`, `TPropositionalVariable`,
  `TClaimCitation`, `TPremiseRoleType` (`schemas/logic.ts:109`).
- Produces: `type DiffCue = "added" | "removed" | "origin" | "touched"`;
  `interface DiffRenderMaps`; `buildDiffRenderMaps(diff): DiffRenderMaps` — shape
  in spec.md §3. Server's `diff-context.tsx` and mobile consume this.

**Complexity: standard** (mechanical lift of `buildDiffMaps` + state→cue mapping;
single file, pure Maps).

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/__tests__/diff-render.test.ts
import { describe, it, expect } from "vitest"
import { buildDiffRenderMaps } from "../diff-render.js"

const empty = {
    claims: { added: [], removed: [], modified: [] },
    variables: { added: [], removed: [], modified: [] },
    premises: { added: [], removed: [], modified: [] },
    citations: { added: [], removed: [], modified: [] },
    roles: { conclusion: { before: null, after: null } },
}

describe("buildDiffRenderMaps", () => {
    it("maps modified-own to origin and modified-within to touched", () => {
        const diff = structuredClone(empty) as never as Parameters<
            typeof buildDiffRenderMaps
        >[0]
        diff.premises.modified.push({
            before: { id: "p1", role: "supporting" } as never,
            after: { id: "p1", role: "supporting" } as never,
            changes: [],
            state: "modified-within",
            expressions: {
                added: [],
                removed: [],
                modified: [
                    {
                        before: { id: "e1", type: "operator" } as never,
                        after: { id: "e1", type: "operator" } as never,
                        changes: [{ field: "operator", before: "and", after: "or" }],
                        state: "modified-own",
                    },
                ],
            },
        })
        const maps = buildDiffRenderMaps(diff)
        expect(maps.premiseDiffMap.get("p1")).toBe("touched")
        expect(maps.edgeDiffMap.get("e1")).toBe("origin")
    })

    it("added/removed premises get added/removed cues and removed lookup", () => {
        const diff = structuredClone(empty) as never as Parameters<
            typeof buildDiffRenderMaps
        >[0]
        diff.premises.added.push({ id: "pa", role: "supporting" } as never)
        diff.premises.removed.push({ id: "pr", role: "conclusion", title: null } as never)
        const maps = buildDiffRenderMaps(diff)
        expect(maps.premiseDiffMap.get("pa")).toBe("added")
        expect(maps.premiseDiffMap.get("pr")).toBe("removed")
        expect(maps.removedPremises.get("pr")?.role).toBe("conclusion")
    })
})
```

- [ ] **Step 2: Run — expect FAIL** (`buildDiffRenderMaps` undefined).

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec vitest run src/engine/__tests__/diff-render.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `buildDiffRenderMaps`**

Lift `buildDiffMaps` from
`proposit-server/.../contexts/diff-context.tsx:15-133`, replacing the
`DiffStatus` vocabulary with `DiffCue` and adding the four-state mapping. Key
differences from the server original: iterate `.modified` (new) mapping
`state` → `origin`/`touched`; keep `.added`/`.removed` → `added`/`removed`;
keep the derivation belt-and-braces filter; add citation `modified` handling.

```ts
// src/engine/diff-render.ts
import type { TArgumentDiff } from "../schemas/model/arguments.js"
import type { TClaim } from "../schemas/model/claims.js"
import type { TClaimCitation } from "../schemas/model/citations.js"
import type {
    TPropositionalVariable,
    TPremiseRoleType,
} from "../schemas/logic.js"

/** Visual intent for one entity, keyed on diff state rather than edge type. */
export type DiffCue = "added" | "removed" | "origin" | "touched"

export interface DiffRenderMaps {
    nodeDiffMap: Map<string, DiffCue>
    premiseDiffMap: Map<string, DiffCue>
    edgeDiffMap: Map<string, DiffCue>
    citationDiffMap: Map<string, DiffCue>
    removedClaims: Map<string, TClaim>
    removedVariables: Map<string, TPropositionalVariable>
    removedPremises: Map<string, { role: TPremiseRoleType; title: string | null }>
    removedCitations: Map<string, TClaimCitation[]>
}

const stateToCue = (state: "modified-own" | "modified-within"): DiffCue =>
    state === "modified-own" ? "origin" : "touched"

export function buildDiffRenderMaps(diff: TArgumentDiff): DiffRenderMaps {
    const nodeDiffMap = new Map<string, DiffCue>()
    const premiseDiffMap = new Map<string, DiffCue>()
    const edgeDiffMap = new Map<string, DiffCue>()
    const citationDiffMap = new Map<string, DiffCue>()

    // Belt-and-braces: derivation premises must never surface here even though
    // the composition already filtered them.
    const derivationPremiseIds = new Set(
        [...diff.premises.added, ...diff.premises.removed]
            .filter((p) => p.type === "derivation")
            .map((p) => p.id)
    )

    for (const p of diff.premises.added) {
        if (p.type === "derivation") continue
        premiseDiffMap.set(p.id, "added")
    }
    for (const p of diff.premises.removed) {
        if (p.type === "derivation") continue
        premiseDiffMap.set(p.id, "removed")
    }
    for (const m of diff.premises.modified) {
        if (derivationPremiseIds.has(m.after.id)) continue
        premiseDiffMap.set(m.after.id, stateToCue(m.state))
        const setExpr = (
            e: { id: string; type: string; premiseId?: string },
            cue: DiffCue
        ) => {
            if (derivationPremiseIds.has(e.premiseId ?? "")) return
            if (e.type === "operator") edgeDiffMap.set(e.id, cue)
            else nodeDiffMap.set(e.id, cue)
        }
        for (const e of m.expressions.added) setExpr(e, "added")
        for (const e of m.expressions.removed) setExpr(e, "removed")
        for (const em of m.expressions.modified) setExpr(em.after, stateToCue(em.state))
    }

    for (const c of diff.claims.added) nodeDiffMap.set(`claim:${c.id}`, "added")
    for (const c of diff.claims.removed) nodeDiffMap.set(`claim:${c.id}`, "removed")
    for (const m of diff.claims.modified) nodeDiffMap.set(`claim:${m.after.id}`, stateToCue(m.state))

    for (const v of diff.variables.added) nodeDiffMap.set(`variable:${v.id}`, "added")
    for (const v of diff.variables.removed) nodeDiffMap.set(`variable:${v.id}`, "removed")
    for (const m of diff.variables.modified) nodeDiffMap.set(`variable:${m.after.id}`, stateToCue(m.state))

    for (const cc of diff.citations.added) citationDiffMap.set(`${cc.claimId}:${cc.supportingClaimId}`, "added")
    for (const cc of diff.citations.removed) citationDiffMap.set(`${cc.claimId}:${cc.supportingClaimId}`, "removed")
    for (const m of diff.citations.modified) citationDiffMap.set(`${m.after.claimId}:${m.after.supportingClaimId}`, stateToCue(m.state))

    const removedClaims = new Map(diff.claims.removed.map((c) => [c.id, c]))
    const removedVariables = new Map(diff.variables.removed.map((v) => [v.id, v]))
    const removedPremises = new Map(
        diff.premises.removed.map((p) => [p.id, { role: p.role, title: p.title ?? null }])
    )
    const removedCitations = new Map<string, TClaimCitation[]>()
    for (const cc of diff.citations.removed) {
        const list = removedCitations.get(cc.claimId)
        if (list) list.push(cc)
        else removedCitations.set(cc.claimId, [cc])
    }

    return {
        nodeDiffMap,
        premiseDiffMap,
        edgeDiffMap,
        citationDiffMap,
        removedClaims,
        removedVariables,
        removedPremises,
        removedCitations,
    }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared exec vitest run src/engine/__tests__/diff-render.test.ts`
Expected: PASS.

- [ ] **Step 5: Full check**

Run: `pnpm -C /Users/brian/Projects/Proposit-App/proposit-shared run check`
Expected: PASS (typecheck + lint + build + all tests).

- [ ] **Step 6: Commit**

```bash
git -C /Users/brian/Projects/Proposit-App/proposit-shared add src/engine/diff-render.ts src/engine/__tests__/diff-render.test.ts
git -C /Users/brian/Projects/Proposit-App/proposit-shared commit -m "feat: buildDiffRenderMaps — origin+affected-containers render policy"
```

---

### Task 6: Documentation sync + version cut prep

**Files:**
- Modify: `docs/changelogs/upcoming.md`, `docs/release-notes/upcoming.md`
  (create if absent, per `skill-cefailures:documentation-sync`)
- Modify: `README.md` "What's in it" (note the diff modules, if the file lists
  engine sub-entries)

**Complexity: low** (docs only). `bllm-agent` candidate — fully-scoped, single
repo, file edits only.

- [ ] **Step 1: Run the documentation-sync check**

Invoke `skill-cefailures:documentation-sync` against the diff to confirm which
tracked files fire. At minimum: changelog (Any-Code-Change) + release-notes
(the new wire schema + render module are user/consumer-facing).

- [ ] **Step 2: Write changelog + release-notes entries**

`docs/changelogs/upcoming.md`: entry describing the four-state `TArgumentDiff`,
`composeArgumentDiff`, `buildDiffRenderMaps`, and the core `^2.5.0` bump, with
the commit-hash range from Tasks 1–5.
`docs/release-notes/upcoming.md`: plain-language note that argument diffs now
carry in-place edits, conclusion reassignment, and citation version changes
losslessly for consumers. No planning-doc/epic jargon.

- [ ] **Step 3: Commit**

```bash
git -C /Users/brian/Projects/Proposit-App/proposit-shared add docs/changelogs/upcoming.md docs/release-notes/upcoming.md README.md
git -C /Users/brian/Projects/Proposit-App/proposit-shared commit -m "docs: changelog + release notes for four-state argument diff"
```

- [ ] **Step 4: Offer the version cut**

Do NOT self-publish (workspace root gates library publishes on consumer
validation). Offer `pnpm version minor` + rename `upcoming.md` → `v{version}.md`
+ tag, to be executed at the epic's shared-publish gate.

---

## Self-review

- **Spec coverage:** §1 → Task 2; §2 → Tasks 3–4; §3 → Task 5; §4 → Task 4;
  §5 (dep bump) → Task 1. Docs-sync + version → Task 6. All spec sections mapped.
- **Type consistency:** `TArgumentDiff`, `entitySetDiff`/`entityFieldDiff`,
  `DiffStateSchema`/`TDiffState` (Task 2) consumed by Tasks 3–5;
  `composeArgumentDiff`/`ComposeArgumentDiffInput` (Task 3) extended in Task 4;
  `buildDiffRenderMaps`/`DiffCue`/`DiffRenderMaps` (Task 5) named consistently.
- **Diff-stability:** asserted in Task 3 (unchanged → empty; single claim edit →
  one modified-own) and Task 4 (identical citations → empty).
- **Casting note:** the fixtures use `as never`/`as unknown` to keep tests
  focused on diff structure, not full entity schemas — the schema itself is
  validated in Task 2. Real callers pass typed core output.

## Risks / open items for the implementer

- The `coreDiff.variables`/`premises` pass-through in Task 3 assumes core's
  entity objects already satisfy the app-level schemas (they are the same
  generic `TArgument`/`TPropositional*` core+local intersection the server feeds
  in). If a core `modified` premise object lacks `role` (see `forks.ts:783-790`),
  the caller must pass app-level premise entities — document this in
  `composeArgumentDiff`'s contract; consider a `role`-reattach guard if a test
  surfaces a gap.
- Wire-schema break is consumer-visible: server + mobile slices adopt after this
  publishes. Do not repin consumers here.
