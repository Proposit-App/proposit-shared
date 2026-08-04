# Plan — Add `isPlatformDisabled(tier)` predicate for platform-disabled user tiers

Small, single-file change. Four ordered tasks: a failing test, the
implementation, the documentation block, then closeout. TDD — task 1 must be red
for the right reason before task 2 exists.

## 1. Write the failing test

**Changes:** new `src/consts/__tests__/platform-disabled.test.ts`.

Follows the conventions of `src/consts/__tests__/quota.test.ts` and
`axioms.test.ts`: `import { describe, expect, it } from "vitest"`, imports the
subject from `"../index.js"` (the barrel, which is what
`@proposit/shared/consts` resolves to — importing through it proves the export
path, not just the module).

Contents:

- One `it` per tier value, seven in total, each asserting the expected boolean
  against `UserTiers.<NAME>` rather than a bare integer:
  `BANNED` → `true`, `DEACTIVATED` → `true`, and `UNVERIFIED`, `FREE`, `PREMIUM`,
  `ENTERPRISE`, `NO_ASSIST` → `false`. `NO_ASSIST` carries a comment naming it as
  the carve-out the shared definition exists for.
- One `it` asserting the asserted key set equals `Object.keys(UserTiers)`, so a
  tier added later fails until someone decides which side it is on
  (spec criterion 4, and the mitigation for the "new tier in the 100-block" risk).
- One `it` pinning `PLATFORM_DISABLED_TIERS` to
  `[UserTiers.BANNED, UserTiers.DEACTIVATED]` (spec criterion 3).

**Verification:** `pnpm exec vitest run src/consts/__tests__/platform-disabled.test.ts`
fails — and fails because `isPlatformDisabled` / `PLATFORM_DISABLED_TIERS` do not
exist, not because of an import-path or syntax error. Confirm the failure text
before writing task 2.

Ordered first because the assertions are the specification of the predicate; a
predicate this small is trivially written to match whatever it does.

## 2. Implement the predicate

**Changes:** `src/consts/user-tiers.ts` only. Append after `UserTierLimits`:

```ts
export const PLATFORM_DISABLED_TIERS = [
    UserTiers.BANNED,
    UserTiers.DEACTIVATED,
] as const

export function isPlatformDisabled(tier: number): boolean {
    return (PLATFORM_DISABLED_TIERS as readonly number[]).includes(tier)
}
```

with the doc comment on the predicate stating: `NO_ASSIST` (103) is deliberately
not platform-disabled — it withholds AI assist only, not platform access — and
that `tier > 100` is therefore wrong and would lock out a paying user. Per
`spec.md` → "The doc comment", the *why* is the load-bearing part; the set of
disabled tiers is already visible in the constant above it.

`src/consts/index.ts` needs **no** edit: line 1 is already
`export * from "./user-tiers.js"`.

**Verification:** the task-1 test goes green; `pnpm exec tsc --noEmit` clean.

Ordered second and alone: it is the only behavior change in the item, so keeping
it in its own commit makes the adoption slice's blame trivial.

## 3. Documentation Sync

Evaluated per the `documentation-sync` skill. **This repo's `AGENTS.md` has no
`## Documentation Sync` section** — a gap noted in `spec.md` → Notes and reported
at closeout, not fixed here (adding one is a repo-governance change, out of scope
for a two-export addition). The entries below are the ones this repo maintains in
practice (`docs/changelogs/`, `docs/release-notes/`, and the versioning
instruction at `AGENTS.md:37`), evaluated against their conventional triggers:

| File | Trigger | Fires? |
|---|---|---|
| `docs/changelogs/upcoming.md` | `Any-Code-Change` | **Yes** — a new behavior-bearing export. |
| `docs/release-notes/upcoming.md` | `Public-API` | **Yes** — two new public exports on `@proposit/shared/consts`. |
| `README.md` | `Public-API` | **No** — it describes sub-entry structure, not the per-symbol surface; `./consts` is already listed and unchanged. |
| `AGENTS.md` | repo guidance | **No** — no new convention, layer, or rule for future agents. |
| `docs/capabilities/**` | capability delta | **No** — spec's Capability changes is None; epic criterion 11 forbids touching one. |

**Changes:** `docs/changelogs/upcoming.md` gets a developer entry (what was added,
the `number` signature and why, the `NO_ASSIST` carve-out, that it is purely
additive and no existing export moved). `docs/release-notes/upcoming.md` gets a
short section framed for the consuming developer: one definition of
platform-disabled, and the `tier > 100` trap it exists to prevent.

**Verification:** both files render as valid Markdown under
`pnpm exec prettier --check`, which `pnpm run lint` runs.

Scheduled as one block after the code tasks, per `stage-plan.md` step 4 — a
changelog written before the diff exists describes a shape the diff no longer has.

**Commit boundary:** tasks 2 and 3 land in **one** commit. The task instruction
for this item names four ordered commits (`spec.md`, `plan.md`, *the
implementation*, `outcome.md`), and the doc updates are part of the
implementation commit by that instruction. Task 1's test is included in the same
commit rather than committed red — the tree must be green at every commit
boundary.

## 4. Closeout

**Changes:** `outcome.md`, committed on its own.

**Verification:** `pnpm run check` (test + typecheck + lint + build) passes
*before* `outcome.md` is written. No `pnpm version`, no tag, no publish — release
is root-coordinated and explicitly out of this item's scope, so the version stays
`0.50.1` and `upcoming.md` is **not** rotated.

## Blockers

None. This slice has no cross-node dependency — the epic's dependency arrow runs
the other way (slice 2, `proposit-server`, is blocked on this slice
*publishing*). Nothing is recorded with `tcw work edit --blocked-by`.

## Verification (beyond the suite)

The suite cannot check these; they are checked by reading the diff:

- **The doc comment says why, not just what.** No test asserts prose. Read the
  final comment and confirm it names `NO_ASSIST`, states it is not
  platform-disabled, and names the `tier > 100` generalization as the mistake
  (spec criterion 5). A comment that only restates the array has failed the item's
  main purpose.
- **The export really is reachable as `@proposit/shared/consts`.** The test
  importing from `"../index.js"` covers the barrel; `pnpm run build` covers the
  `dist/` emit. What neither covers is `package.json`'s `exports` map — verify by
  reading that `./consts` is already declared there with `types`/`import`/`default`
  (it is; no new subpath is added, so no exports-map edit is needed).
- **Signature parity with the server's local predicate.** Confirm by eye that the
  new signature is `(tier: number): boolean`, matching
  `proposit-server/src/model/user.ts:44`, so slice 2's adoption is an import swap.
  Nothing in this repo compiles against the server.
- **Nothing outside the four allowed files changed** (spec criterion 6):
  `git show --stat` on the implementation commit.

## Notes

- No `bllm-agent` delegation. The whole implementation is ~10 lines in one file
  and the judgment (signature, comment wording) is the entire content of the task.
- `pnpm run check` runs `build`, which writes `dist/`. `dist/` is git-ignored;
  confirm `git status` is clean after the check so no build output rides into a
  commit.
