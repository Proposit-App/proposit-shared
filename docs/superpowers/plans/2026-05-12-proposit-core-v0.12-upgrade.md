# `proposit-core` v0.12 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `@proposit/shared` from `0.7.2` consuming `@proposit/proposit-core ^0.11.2` to a v0.12-compatible state consuming `@proposit/proposit-core ^0.12.0`. Land all forced API/signature changes and rename shared's citation-edge vocabulary to track core's new `claim` / `supportingClaim` / `citations` naming, per the core-is-authoritative naming rule.

**Architecture:** One coherent breaking-change commit, single-PR-shaped. Two layers of work: (1) forced typecheck-breaking changes — the `ArgumentEngine` constructor dropped its `claimCitationLookup` parameter, `EMPTY_CLAIM_CITATION_LOOKUP` is gone, and `TCoreClaimCitation`/`CoreClaimCitationSchema` field names changed (`citingClaimId` → `claimId`, `sourceClaimId` → `supportingClaimId`, version fields similarly). (2) naming-authority-driven renames — shared's own `PropositArgumentEngine.getSourceClaimsForCitingClaim`/`addClaimCitation`/`removeClaimCitation`/`getClaimCitations` accessors and the `claimCitationsMap` field, plus the wire-format wrapper field `claimCitations` on `FullArgumentSchema` and `ArgumentDiffSchema`, all rename to track core's new `citations` / `getConnectionsForClaim` vocabulary. The `ClaimAxiomLibrary` and the `"axiomatic"` claim-type union widening are explicitly **deferred** to a follow-up sub-project (server isn't yet using axiomatic claims; widening today forces UI exhaustive-switch work that's out of scope for a dependency bump).

**Tech Stack:** TypeScript 6.0, pnpm 10.23, vitest 4.1, TypeBox 1.1, prettier 3.8, eslint 9.39, `@proposit/proposit-core` ^0.12.0 (peer + dev dep).

**Naming rules in force (from memory `feedback_core_schema_naming_authority`):**

1. **Shared yields to core for naming.** Where core renames, shared follows. Concrete instances in this upgrade: `core.claimCitations` → `core.citations` ⇒ shared renames its own `claimCitations` field/methods/snapshot keys to `citations`-vocabulary. `citingClaimId`/`sourceClaimId` → `claimId`/`supportingClaimId` ⇒ shared updates every field access.

2. **Vocabulary is `claim` / `supportingClaim` (v0.12).** Never `citingClaim`, never `sourceClaim`, never `citedClaim`. See updated memory `feedback_citation_terminology`.

**Explicit out-of-scope (deferred to a follow-up plan):**

- Widening `ClaimTypeSchema` from `"normal" | "citation"` to `"normal" | "citation" | "axiomatic"`. Server has no axiomatic claim flow, mobile has no axiomatic UI, and widening triggers exhaustive-switch work in `src/engine/text-tree.ts` and `src/engine/engine.ts` that should be planned with product input.
- Adding a parallel `axiomCitationsMap` / `getAxiomsForClaim` / `addAxiom` / `removeAxiom` accessor pair to `PropositArgumentEngine` and a parallel `axioms` array slot to `FullArgumentSchema` / `ArgumentDiffSchema`. Same reasoning — no consumer is asking for it yet.
- Bumping `proposit-shared` version. The user explicitly asked to stop before version bump.

---

## Pre-flight

### Task 0: Branch and baseline verification

**Files:** none (git operations only)

- [ ] **Step 1: Create the feature branch from a clean `main`**

```bash
cd /Users/brian/Projects/Proposit-App/proposit-shared
git checkout main
git pull
git checkout -b feature/core-v0.12-upgrade
```

- [ ] **Step 2: Verify baseline is green against current core `^0.11.2`**

Run: `pnpm run check`
Expected: typecheck + lint + test + build all pass. If red, stop and fix the baseline first — do not start the upgrade on a red baseline.

- [ ] **Step 3: Note current versions**

Run: `pnpm list @proposit/proposit-core`
Expected: shows `@proposit/proposit-core 0.11.2` (or later 0.11.x). This is the starting point.

---

## Commit 1 — Core dep bump and forced API changes

Goal: shared compiles and tests pass against core `^0.12.0`. Everything in this single commit; smaller staged commits are not worth the merge friction here because the constructor-signature change, the dropped `EMPTY_CLAIM_CITATION_LOOKUP`, and the schema-field renames are tightly interlocked — splitting them would leave intermediate states that don't typecheck.

### Task 1.1: Bump core dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Edit `peerDependencies` and `devDependencies`**

Change both occurrences of `@proposit/proposit-core` from `"^0.11.2"` to `"^0.12.0"`:

```json
"peerDependencies": {
    "@proposit/proposit-core": "^0.12.0"
},
"devDependencies": {
    ...
    "@proposit/proposit-core": "^0.12.0",
    ...
}
```

- [ ] **Step 2: Install the new core**

Run: `pnpm install`
Expected: `node_modules/@proposit/proposit-core/package.json` reports version `0.12.0`.

- [ ] **Step 3: Confirm the new core exports the symbols we'll reach for**

Run:

```bash
grep -E "emptyClaimConnectionLookup|CoreClaimCitationSchema|ClaimCitationLibrary|ArgumentEngine" node_modules/@proposit/proposit-core/dist/lib/index.d.ts | head
```

Expected: at least one match per symbol. If `emptyClaimConnectionLookup` or `CoreClaimCitationSchema` is missing, stop — the dep didn't actually land.

- [ ] **Step 4: Run typecheck and capture the failure surface**

Run: `pnpm run typecheck 2>&1 | tee /tmp/v0.12-baseline-errors.log | head -60`
Expected: errors related to (a) the `ArgumentEngine` constructor accepting only 3 args now, (b) `EMPTY_CLAIM_CITATION_LOOKUP` no longer exported, and (c) `citingClaimId`/`sourceClaimId` properties not existing on `TClaimCitation`.

This list of errors becomes our checklist for the remaining tasks. Do not move on until it matches the categories above.

### Task 1.2: Replace `EMPTY_CLAIM_CITATION_LOOKUP` with the factory

**Files:**

- Modify: `src/engine/library-adapters.ts`

The constant is gone from core; `emptyClaimConnectionLookup<TConn>()` is the replacement factory. However, the bigger v0.12 change is that `ArgumentEngine` no longer takes a `claimCitationLookup` argument at all (Task 1.3 below). After Task 1.3 lands, shared has **zero** callers that need an empty citation lookup. So the right move is to delete the re-export entirely, not replace it.

- [ ] **Step 1: Replace `src/engine/library-adapters.ts` contents**

```ts
import type { TClaimLookup } from "@proposit/proposit-core"
import { createLookup, EMPTY_CLAIM_LOOKUP } from "@proposit/proposit-core"

export function createClaimLookup(
    claims: { id: string; version: number }[]
): TClaimLookup {
    const inner = createLookup(claims, (c) => `${c.id}:${c.version}`)
    const latestById = new Map<string, { id: string; version: number }>()
    for (const c of claims) {
        const existing = latestById.get(c.id)
        if (!existing || c.version > existing.version) {
            latestById.set(c.id, c)
        }
    }
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        get: (id, version) => inner.get(id, version) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        getCurrent: (id) => latestById.get(id) as any,
    }
}

export { EMPTY_CLAIM_LOOKUP }
```

Diff vs. existing file: removes the import of `EMPTY_CLAIM_CITATION_LOOKUP` and removes it from the trailing `export` line.

### Task 1.3: Strip `claimCitationLookup` from `PropositArgumentEngine`'s constructor and `fromServerData`

**Files:**

- Modify: `src/engine/engine.ts`

Core's `ArgumentEngine` constructor is now `(argument, claimLibrary, options?)` — three parameters. `PropositArgumentEngine` currently destructures four (`argument, claimLookup, claimCitationLookup, options`) from `ConstructorParameters<typeof ArgumentEngine<...>>`. The TypeScript inference will now produce a 3-tuple, so the destructure shrinks.

- [ ] **Step 1: Update the constructor destructure and the `super()` call**

Find the constructor (`engine.ts:90-155`). Change:

```ts
const [argument, claimLookup, claimCitationLookup, options] = args
```

to:

```ts
const [argument, claimLookup, options] = args
```

And change the `super(...)` call (currently `engine.ts:152`):

```ts
super(argument, mutableLookup, claimCitationLookup, options)
```

to:

```ts
super(argument, mutableLookup, options)
```

- [ ] **Step 2: Update `fromServerData` to drop the `EMPTY_CLAIM_CITATION_LOOKUP` argument**

Find `fromServerData` (`engine.ts:367-453`). Remove the `EMPTY_CLAIM_CITATION_LOOKUP` import line at the top of the file (line ~23) and update the `new PropositArgumentEngine(...)` call (currently `engine.ts:373-383`) to drop the third argument:

```ts
const engine = new PropositArgumentEngine(snapshot.argument, claimLookup, {
    checksumConfig: CHECKSUM_CONFIG,
    positionConfig: snapshot.config?.positionConfig,
    grammarConfig: RUNTIME_GRAMMAR,
    generateId: () => crypto.randomUUID(),
})
```

- [ ] **Step 3: Drop the `EMPTY_CLAIM_CITATION_LOOKUP` import line at the top of `engine.ts`**

Currently:

```ts
import {
    createClaimLookup,
    EMPTY_CLAIM_CITATION_LOOKUP,
} from "./library-adapters.js"
```

becomes:

```ts
import { createClaimLookup } from "./library-adapters.js"
```

### Task 1.4: Update `TClaimCitation` field accesses in the engine map

**Files:**

- Modify: `src/engine/engine.ts`

`CoreClaimCitationSchema` v0.12 carries `claimId` / `claimVersion` / `supportingClaimId` / `supportingClaimVersion`. Every `cc.citingClaimId` and `cc.sourceClaimId` reference fails typecheck. We use `claimId` (the dependent endpoint) for keying — same semantic as the old `citingClaimId`.

- [ ] **Step 1: Rename internal field accesses inside the citation-edge methods**

Replace every occurrence of `.citingClaimId` with `.claimId` and every occurrence of `.sourceClaimId` with `.supportingClaimId` inside `engine.ts`. The locations are:

- `engine.ts:272` (`addClaimCitation`): `this.claimCitationsMap.get(cc.citingClaimId)` → `this.claimCitationsMap.get(cc.claimId)`
- `engine.ts:273`: `this.claimCitationsMap.set(cc.citingClaimId, ...)` → `this.claimCitationsMap.set(cc.claimId, ...)`
- `engine.ts:447`: `engine.claimCitationsMap.get(cc.citingClaimId)` → `engine.claimCitationsMap.get(cc.claimId)`
- `engine.ts:449`: `engine.claimCitationsMap.set(cc.citingClaimId, existing)` → `engine.claimCitationsMap.set(cc.claimId, existing)`

The loop variable `citingClaimId` in `removeClaimCitation` (`engine.ts:280-290`) is purely internal — rename the binding name to `claimId` for consistency with the new vocabulary:

```ts
for (const [claimId, edges] of this.claimCitationsMap.entries()) {
    const filtered = edges.filter((e) => e.id !== edgeId)
    if (filtered.length !== edges.length) {
        if (filtered.length > 0) {
            this.claimCitationsMap.set(claimId, filtered)
        } else {
            this.claimCitationsMap.delete(claimId)
        }
        removed = true
    }
}
```

- [ ] **Step 2: Update the parameter name on the public accessor (forced rename — Task 1.5 below handles this method's full rename)**

Defer until Task 1.5.

### Task 1.5: Rename `PropositArgumentEngine` citation accessors to v0.12 vocabulary

**Files:**

- Modify: `src/engine/engine.ts`

Per the naming-authority rule, shared's accessors mirror core's `citations` / `getConnectionsForClaim` / `add` / `remove` vocabulary. Shared's `PropositArgumentEngine` wraps a `Record<claimId, TClaimCitation[]>` map (keyed by the dependent claim) — different shape than core's flat library, but the same semantic operations.

Rename map:

| Old (`PropositArgumentEngine`)                 | New                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `private claimCitationsMap`                    | `private citationsMap`                                                    |
| `private claimCitationsDirty`                  | `private citationsDirty`                                                  |
| `private cachedClaimCitations`                 | `private cachedCitations`                                                 |
| `private getClaimCitationsRecord()`            | `private getCitationsRecord()`                                            |
| `getSourceClaimsForCitingClaim(citingClaimId)` | `getCitationsForClaim(claimId)` (mirrors core's `getConnectionsForClaim`) |
| `getClaimCitations()`                          | `getCitations()`                                                          |
| `addClaimCitation(cc)`                         | `addCitation(cc)`                                                         |
| `removeClaimCitation(edgeId)`                  | `removeCitation(edgeId)`                                                  |

- [ ] **Step 1: Apply the renames inside `engine.ts`**

Use search-and-replace per row of the table above. Verify each rename doesn't introduce a shadow: `claimCitations` (the local `const claimCitations = this.getClaimCitationsRecord()` inside `buildReactiveSnapshot`, `engine.ts:313`) must rename to `citations`, and the cache comparison on `engine.ts:342` (`claimCitations === this.cachedProjectSnapshot.claimCitations`) becomes `citations === this.cachedProjectSnapshot.citations` — but that depends on Task 1.6 below renaming the snapshot key first. Do Task 1.6 in sequence after this step.

- [ ] **Step 2: Rename the JSDoc and prose**

The block comment at `engine.ts:48-50` and `engine.ts:62-66` calls these "claim-citation edges" / "domain data". Update prose to "citation edges" (singular vocabulary; matches v0.12).

### Task 1.6: Rename `TProjectReactiveSnapshot.claimCitations` to `citations`

**Files:**

- Modify: `src/engine/engine.ts`
- Modify: `src/engine/__tests__/text-tree.test.ts`

`TProjectReactiveSnapshot` is shared's per-snapshot reactive type, exposed via `engine.getSnapshot()`. Renaming this key is a downstream breaking change for any consumer reading `snapshot.claimCitations`. Per the v0.12 vocabulary, it becomes `snapshot.citations`.

- [ ] **Step 1: Update the type definition**

At `engine.ts:52-61`, change:

```ts
export type TProjectReactiveSnapshot = TReactiveSnapshot<...> & {
    claims: Record<string, TClaim>
    claimCitations: Record<string, TClaimCitation[]>
    validationIssues: TCoreValidationIssue[]
}
```

to:

```ts
export type TProjectReactiveSnapshot = TReactiveSnapshot<...> & {
    claims: Record<string, TClaim>
    citations: Record<string, TClaimCitation[]>
    validationIssues: TCoreValidationIssue[]
}
```

- [ ] **Step 2: Update `buildReactiveSnapshot` to emit the new key**

At `engine.ts:310-356`, change the local variable from `claimCitations` to `citations`, change `claimCitations === this.cachedProjectSnapshot.claimCitations` to `citations === this.cachedProjectSnapshot.citations`, and change the spread `claimCitations,` in the returned `snapshot` literal to `citations,`.

- [ ] **Step 3: Update the test fixture for `buildTextTree`**

At `src/engine/__tests__/text-tree.test.ts:25`, change `claimCitations: {},` to `citations: {},`.

### Task 1.7: Rename `ClaimCitationSchema` field accesses in the citation-schema test

**Files:**

- Modify: `src/schemas/__tests__/citations.test.ts`

The test fixture builds an edge with `citingClaimId` / `citingClaimVersion` / `sourceClaimId` / `sourceClaimVersion`. Under v0.12 these are `claimId` / `claimVersion` / `supportingClaimId` / `supportingClaimVersion`.

- [ ] **Step 1: Update the test fixtures and assertions**

Replace the whole file's contents with:

```ts
import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { ClaimCitationSchema } from "../model/citations.js"

describe("ClaimCitationSchema", () => {
    it("accepts an edge with all core + app-level fields", () => {
        const edge = {
            // core fields:
            id: "edge-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            claimId: "claim-uuid-aa-aaaa-aaaa-aaaaaaaaaaaa",
            claimVersion: 1,
            supportingClaimId: "supporting-uuid-aa-aaaa-aaaa-aaaaaaaaaaaa",
            supportingClaimVersion: 1,
            checksum: "sha256-edge-checksum",
            // app-level fields:
            argumentId: "arg-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            createdOn: new Date("2026-05-06T00:00:00Z"),
        }
        expect(Value.Check(ClaimCitationSchema, edge)).toBe(true)
    })

    it("does not require a top-level version field", () => {
        // Citation edges carry claimVersion + supportingClaimVersion (both
        // inherited from CoreClaimCitationSchema); they do NOT have a
        // standalone top-level `version`. The server's citations table
        // similarly has no `version` column. Validation must succeed when
        // the field is absent.
        const edge = {
            id: "edge-uuid-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            claimId: "claim-uuid-bb-bbbb-bbbb-bbbbbbbbbbbb",
            claimVersion: 1,
            supportingClaimId: "supporting-uuid-bb-bbbb-bbbb-bbbbbbbbbbbb",
            supportingClaimVersion: 1,
            checksum: "sha256-edge-checksum-2",
            argumentId: "arg-uuid-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            createdOn: new Date("2026-05-06T00:00:00Z"),
        }
        expect(Value.Check(ClaimCitationSchema, edge)).toBe(true)
    })

    it("rejects an edge missing claimId", () => {
        const edge = {
            id: "edge-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            claimVersion: 1,
            supportingClaimId: "supporting-uuid-aa-aaaa-aaaa-aaaaaaaaaaaa",
            supportingClaimVersion: 1,
            checksum: "sha256-edge-checksum",
            argumentId: "arg-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            version: 1,
            createdOn: new Date("2026-05-06T00:00:00Z"),
        }
        expect(Value.Check(ClaimCitationSchema, edge)).toBe(false)
    })
})
```

### Task 1.8: Rename `claimCitations` wire-format field on `FullArgumentSchema` and `ArgumentDiffSchema`

**Files:**

- Modify: `src/schemas/model/arguments.ts`
- Modify: `src/schemas/api/argument/index.ts`

Per the naming-authority rule, shared's wire format mirrors core's vocabulary. Server response builders that send these payloads will need a coordinated rename when they bump their `@proposit/shared` dep — that's expected for a breaking change.

- [ ] **Step 1: Update `ArgumentDiffSchema`**

At `src/schemas/model/arguments.ts:93-96`, change:

```ts
claimCitations: Type.Object({
    added: Type.Array(ClaimCitationSchema),
    removed: Type.Array(ClaimCitationSchema),
}),
```

to:

```ts
citations: Type.Object({
    added: Type.Array(ClaimCitationSchema),
    removed: Type.Array(ClaimCitationSchema),
}),
```

- [ ] **Step 2: Update `FullArgumentSchema`**

At `src/schemas/api/argument/index.ts:24`, change:

```ts
claimCitations: Type.Array(ClaimCitationSchema),
```

to:

```ts
citations: Type.Array(ClaimCitationSchema),
```

### Task 1.9: Update the verification engine builder

**Files:**

- Modify: `src/engine/optimistic/verification.ts`

`detectDivergence` builds a throwaway `ArgumentEngine` to compute checksums. The constructor argument list shrunk; the `EMPTY_CLAIM_CITATION_LOOKUP` import is also dead.

- [ ] **Step 1: Drop the citation-lookup import**

Remove line 3 (`import { EMPTY_CLAIM_CITATION_LOOKUP } from "../library-adapters.js"`).

- [ ] **Step 2: Drop the citation-lookup argument from the `new ArgumentEngine(...)` call**

At `verification.ts:26-44`, change the `new ArgumentEngine<...>(...)` invocation. Before:

```ts
const serverEngine = new ArgumentEngine<
    TArgument,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
    TPropositionalVariable
>(
    serverSnapshot.argument,
    { get: () => undefined, getCurrent: () => undefined },
    EMPTY_CLAIM_CITATION_LOOKUP,
    {
        checksumConfig: CHECKSUM_CONFIG,
        positionConfig: serverSnapshot.config?.positionConfig,
        grammarConfig: {
            autoNormalize: false,
            enforceFormulaBetweenOperators: true,
        },
    }
)
```

After:

```ts
const serverEngine = new ArgumentEngine<
    TArgument,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
    TPropositionalVariable
>(
    serverSnapshot.argument,
    { get: () => undefined, getCurrent: () => undefined },
    {
        checksumConfig: CHECKSUM_CONFIG,
        positionConfig: serverSnapshot.config?.positionConfig,
        grammarConfig: {
            autoNormalize: false,
            enforceFormulaBetweenOperators: true,
        },
    }
)
```

### Task 1.10: Update the review-engine test fixture

**Files:**

- Modify: `src/engine/review/__tests__/fixtures.ts`

- [ ] **Step 1: Drop the citation-lookup import**

At `fixtures.ts:8-11`, change:

```ts
import {
    EMPTY_CLAIM_CITATION_LOOKUP,
    createClaimLookup,
} from "../../library-adapters.js"
```

to:

```ts
import { createClaimLookup } from "../../library-adapters.js"
```

- [ ] **Step 2: Drop the citation-lookup argument from `new PropositArgumentEngine(...)`**

At `fixtures.ts:159-164`, change:

```ts
const engine = new PropositArgumentEngine(
    makeArgument(),
    claimLookup,
    EMPTY_CLAIM_CITATION_LOOKUP,
    { checksumConfig: CHECKSUM_CONFIG }
)
```

to:

```ts
const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
    checksumConfig: CHECKSUM_CONFIG,
})
```

### Task 1.11: Run typecheck and resolve remaining errors

**Files:** any errors surfaced

- [ ] **Step 1: Run typecheck**

Run: `pnpm run typecheck 2>&1 | tee /tmp/v0.12-after-renames-errors.log | head -60`
Expected: zero errors, OR one or two errors that point at consumers of the renamed `PropositArgumentEngine` accessors / `TProjectReactiveSnapshot.citations` / wire-format fields that the plan didn't anticipate (most likely in `src/engine/mutations/` or `src/engine/optimistic/reconciliation.ts`).

- [ ] **Step 2: Fix any straggler renames in-place**

For each remaining error, the fix is mechanical: an old call site of `engine.getSourceClaimsForCitingClaim(id)` becomes `engine.getCitationsForClaim(id)`, `engine.addClaimCitation(cc)` becomes `engine.addCitation(cc)`, etc. Apply per the rename table from Task 1.5. Re-run typecheck after each fix until zero errors.

### Task 1.12: Run the full check pipeline

**Files:** none

- [ ] **Step 1: Run the full pipeline**

Run: `pnpm run check`
Expected: typecheck + lint + test + build all pass.

- [ ] **Step 2: If tests fail, diagnose**

A test failure here most likely means a rename in the source isn't matched by a rename in a test fixture or assertion. Search for the failing test's literal strings; apply the same rename rules.

A lint failure here most likely means a rename left a JSDoc reference pointing at the old name. Update the prose.

### Task 1.13: Commit the upgrade

**Files:** none

- [ ] **Step 1: Stage and review the diff**

Run:

```bash
git status
git diff --stat
```

Expected: ~10–12 modified files, no untracked files except `docs/release-notes/upcoming.md` and `docs/changelogs/upcoming.md` (those come in Commit 2).

- [ ] **Step 2: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml src/
git commit -m "feat(deps): upgrade @proposit/proposit-core to ^0.12.0

Tracks core's v0.12 rename of citation edge endpoints
(citingClaimId/sourceClaimId -> claimId/supportingClaimId), the
ArgumentEngine constructor's dropped claimCitationLookup parameter, the
removal of EMPTY_CLAIM_CITATION_LOOKUP, and the corresponding
claimCitations -> citations renames across PropositArgumentEngine
accessors and FullArgumentSchema / ArgumentDiffSchema wire fields.

Axiomatic-claim-type support (widening ClaimTypeSchema, adding a
parallel axioms accessor on PropositArgumentEngine, adding an axioms
slot to FullArgumentSchema) is deferred to a follow-up plan once a
consumer needs it."
```

---

## Commit 2 — Release notes and changelog

Goal: capture the breaking-change surface for server's and mobile's future dependency bumps.

### Task 2.1: Write the upcoming release notes

**Files:**

- Modify: `docs/release-notes/upcoming.md`

- [ ] **Step 1: Replace the placeholder file**

Replace the contents of `docs/release-notes/upcoming.md` (currently just the header `# Upcoming release notes`) with the v0.12-upgrade release-notes draft below.

```markdown
# Upcoming release notes

Tracks `@proposit/proposit-core` v0.12.0 — the rename of citation-edge endpoint
vocabulary (`citingClaim*` / `sourceClaim*` → `claim*` / `supportingClaim*`),
the rename of `core.claimCitations` to `core.citations`, and the
`ArgumentEngine` constructor's dropped `claimCitationLookup` parameter. Shared
follows core's vocabulary throughout — the rename surfaces are listed under
"Breaking changes" below so server and mobile can sequence their own bumps.

## What changed

### Dependency

- `peerDependencies` and `devDependencies` for `@proposit/proposit-core`
  bumped from `^0.11.2` to `^0.12.0`.

### `PropositArgumentEngine` accessor renames

| Before                                         | After                           |
| ---------------------------------------------- | ------------------------------- |
| `getSourceClaimsForCitingClaim(citingClaimId)` | `getCitationsForClaim(claimId)` |
| `getClaimCitations()`                          | `getCitations()`                |
| `addClaimCitation(cc)`                         | `addCitation(cc)`               |
| `removeClaimCitation(edgeId)`                  | `removeCitation(edgeId)`        |

The internal `claimCitationsMap` field is now `citationsMap`. (Private — listed
for completeness only.)

### `TProjectReactiveSnapshot` snapshot key

`snapshot.claimCitations` → `snapshot.citations`. Code reading
`engine.getSnapshot().claimCitations` must rename.

### Wire-format renames

- `FullArgumentSchema.claimCitations` → `FullArgumentSchema.citations`
- `ArgumentDiffSchema.claimCitations` → `ArgumentDiffSchema.citations`

The values inside these fields are still `TClaimCitation[]` and
`{ added: TClaimCitation[]; removed: TClaimCitation[] }` respectively. Only
the wrapper key changed.

### Citation-edge field renames

Inherited from core: `TClaimCitation` (`Static<typeof ClaimCitationSchema>`)
field names changed from `citingClaim*`/`sourceClaim*` to
`claim*`/`supportingClaim*`. Concretely:

| Before               | After                    |
| -------------------- | ------------------------ |
| `citingClaimId`      | `claimId`                |
| `citingClaimVersion` | `claimVersion`           |
| `sourceClaimId`      | `supportingClaimId`      |
| `sourceClaimVersion` | `supportingClaimVersion` |

The `argumentId` and `createdOn` app-level fields are unchanged.

### `ArgumentEngine` constructor

Core's `ArgumentEngine` no longer accepts a `claimCitationLookup` argument —
the field was vestigial in v0.11 and never read. Direct callers of
`new ArgumentEngine(...)` (notably `detectDivergence` in
`src/engine/optimistic/verification.ts`) drop the third argument.
`PropositArgumentEngine` similarly drops the parameter from its constructor —
external callers don't pass a citation lookup anymore.

The `EMPTY_CLAIM_CITATION_LOOKUP` re-export is gone from
`src/engine/library-adapters.ts`. Shared no longer has any callers that need
it; consumers who imported it via `@proposit/proposit-core` should use core's
new `emptyClaimConnectionLookup<TCoreClaimCitation>()` factory.

## Why the wire-format rename is in this bump

The naming-authority rule (`@proposit/shared` follows
`@proposit/proposit-core` for any name it consumes) requires the
wire-wrapper rename. Server's response builders will need a coordinated
rename when they bump their `@proposit/shared` dep — see "Migration impact"
below.

## Migration impact

### `proposit-server`

After bumping `@proposit/shared` past this release, server's TypeScript code
that builds `FullArgument` and `ArgumentDiff` responses must rename the
`claimCitations` field on the response object to `citations`. Likely
locations: the API route handlers that load an argument with its claim
citations and the diff-computation utility. Engine callers that read
`engine.getSourceClaimsForCitingClaim` etc. rename per the table above.

### `proposit-mobile`

Likely no engine-accessor callers today, but verify any code that reads
`reactiveSnapshot.claimCitations` from the project store — that key is now
`citations`.

## Out of scope (deferred)

- **Axiomatic claim type support.** Core v0.12 adds a third
  `ClaimTypeSchema` member (`"axiomatic"`) plus a parallel `ClaimAxiomLibrary`.
  Shared's `ClaimTypeSchema` is unchanged in this release (still
  `"normal" | "citation"`). Once a server flow or mobile UI needs axiomatic
  claims, a follow-up bump will widen the union and add parallel
  `axiomsMap` / `getAxiomsForClaim` / `addAxiom` / `removeAxiom` accessors
  on `PropositArgumentEngine` plus an `axioms` slot on
  `FullArgumentSchema` / `ArgumentDiffSchema`. The follow-up plan also
  decides how `text-tree.ts` should render axiomatic claims.

## Versioning intent

Pre-1.0 minor bump (`0.7.2` → `0.8.0`) per the policy in `CLAUDE.md`. Multiple
breaking renames; consumers should pin caret and expect a coordinated update.

## See also

- `proposit-core` v0.12.0 release notes — full upstream rename and the
  axiomatic-claim feature this upgrade chooses not to surface yet.
```

### Task 2.2: Write the upcoming changelog

**Files:**

- Modify: `docs/changelogs/upcoming.md`

- [ ] **Step 1: Replace the placeholder file**

Replace the contents of `docs/changelogs/upcoming.md` with:

```markdown
# Upcoming changelog

## Dependencies

- Bumped `@proposit/proposit-core` peer + dev dependency from `^0.11.2` to
  `^0.12.0`.

## Breaking changes — engine accessor renames

- `PropositArgumentEngine.getSourceClaimsForCitingClaim(id)` →
  `getCitationsForClaim(id)`.
- `PropositArgumentEngine.getClaimCitations()` → `getCitations()`.
- `PropositArgumentEngine.addClaimCitation(cc)` → `addCitation(cc)`.
- `PropositArgumentEngine.removeClaimCitation(edgeId)` →
  `removeCitation(edgeId)`.
- `PropositArgumentEngine` constructor no longer accepts a citation-lookup
  argument (3rd parameter dropped); callers update to the 3-argument form
  `(argument, claimLookup, options)`.

## Breaking changes — type renames

- `TProjectReactiveSnapshot.claimCitations` → `TProjectReactiveSnapshot.citations`.

## Breaking changes — wire-format renames

- `FullArgumentSchema.claimCitations` → `FullArgumentSchema.citations`.
- `ArgumentDiffSchema.claimCitations` → `ArgumentDiffSchema.citations`.

## Breaking changes — inherited from `@proposit/proposit-core` v0.12

- `TClaimCitation` field renames (`Static<typeof ClaimCitationSchema>`):
  `citingClaimId` → `claimId`, `citingClaimVersion` → `claimVersion`,
  `sourceClaimId` → `supportingClaimId`,
  `sourceClaimVersion` → `supportingClaimVersion`.
- `EMPTY_CLAIM_CITATION_LOOKUP` is no longer re-exported from
  `src/engine/library-adapters.ts`. Core's replacement is
  `emptyClaimConnectionLookup<TConn>()`, but `proposit-shared` has zero
  callers and does not re-export it.

## Internal

- `PropositArgumentEngine`'s private `claimCitationsMap` and related
  cache/dirty fields renamed to `citationsMap` / `citationsDirty` /
  `cachedCitations`.
- JSDoc and code comments updated to use the `claim` / `supportingClaim`
  vocabulary throughout.
```

### Task 2.3: Commit the docs

**Files:** none

- [ ] **Step 1: Stage and commit**

Run:

```bash
git add docs/release-notes/upcoming.md docs/changelogs/upcoming.md
git commit -m "docs: release notes and changelog for proposit-core v0.12 upgrade"
```

---

## Stop point

Per the user's instruction, do **not** run `pnpm version minor`, do not rename `docs/release-notes/upcoming.md` to a version file, do not tag, do not publish. The branch sits at the second commit, ready for human review.

Final verification:

- [ ] **Step 1: Final check pipeline**

Run: `pnpm run check`
Expected: green.

- [ ] **Step 2: Inspect the branch**

Run:

```bash
git log --oneline main..HEAD
git diff --stat main..HEAD
```

Expected: 2 commits, ~12 files changed.

Report back to the user with: branch name, commits, file count, and the green `pnpm run check` exit. They'll choose what to do next (PR, version bump, or further iteration).
