# Outcome — Add `isPlatformDisabled(tier)` predicate for platform-disabled user tiers

Shipped as planned. Four tasks, no design changes between plan and code.

## What shipped

**Task 1 + 2 + 3 — one commit, `fd8cedd`**
`feat(consts): add isPlatformDisabled predicate and PLATFORM_DISABLED_TIERS`

- `src/consts/user-tiers.ts` (+34) — `PLATFORM_DISABLED_TIERS` and
  `isPlatformDisabled(tier: number): boolean`, appended after `UserTierLimits`.
  The predicate is derived from the constant (`.includes` over a widened
  `readonly number[]`) so the exported set and the exported predicate cannot
  drift.
- `src/consts/__tests__/platform-disabled.test.ts` (new, 65 lines) — 9 tests: one
  per `UserTiers` member, one pinning `PLATFORM_DISABLED_TIERS`, one asserting the
  covered name list still equals `Object.keys(UserTiers)`.
- `docs/changelogs/upcoming.md`, `docs/release-notes/upcoming.md` — Documentation
  Sync (see below).
- `src/consts/index.ts` — **unchanged**, as predicted: line 1 already re-exports
  the module, so `@proposit/shared/consts` picks both symbols up with no barrel or
  `exports`-map edit.

Preceding commits: `e545124` (link the item to the epic), `0bc4b5a` (`spec.md`),
`9536e64` (`plan.md`), `64cd831` (TCW's own `→ active` transition).

## Exported signature

```ts
export declare const PLATFORM_DISABLED_TIERS: readonly [101, 102]
export declare function isPlatformDisabled(tier: number): boolean
```

Read back out of the build output (`dist/consts/user-tiers.d.ts:10,32`), not from
source.

## Verification

`pnpm run check` — **passed**, run to completion after the final edit:

- `typecheck` (`tsc --noEmit`) clean
- `lint` (`prettier --check` + `eslint .`) clean
- `test` — **1006 passed / 1006, 103 files**
- `build` — fixtures codegen + `tsc -p tsconfig.build.json`, `dist/` emitted

**TDD red-green confirmed.** The test was written first and run before the
implementation existed: 8 failed / 1 passed, failing with
`TypeError: isPlatformDisabled is not a function` — a missing-export failure, not
an import-path or syntax error. After the implementation: 9 passed.

**Mutation check on the load-bearing assertion.** The doc comment claims
`tier > 100` is the mistake this predicate prevents, so the predicate body was
temporarily replaced with `return tier > 100` and the suite re-run: exactly one
test failed — "does NOT report NO_ASSIST as platform-disabled". The carve-out is
genuinely pinned, not merely asserted in prose. File restored byte-for-byte from a
scratchpad copy and re-verified green; `git status` clean afterwards.

**Plan's non-suite checks** (`plan.md` → Verification), all confirmed:

- Doc comment names `NO_ASSIST`, states it is not platform-disabled, gives the
  reason (AI assist withheld, limits otherwise equal to `FREE`), and names
  `tier > 100` as the wrong generalization.
- `package.json` already declares `./consts` with `types`/`import`/`default` — no
  new subpath, no exports-map edit.
- Signature parity with `proposit-server/src/model/user.ts:44`
  (`(tier: number): boolean`) — slice 2's adoption is an import swap.
- `git show --stat fd8cedd` — exactly the four files spec criterion 6 allows.

**Acceptance criteria** — all eight of `spec.md` met at the implementation commit
`fd8cedd`: the version was `0.50.1`, no tag pointed at `HEAD`, nothing was
published, and neither `upcoming.md` had been rotated.

> **Corrected 2026-07-28 (verify stage).** Criterion 8 describes this slice's
> commit, not the repo's present state. The three commits after `c61b076` — where
> this document was first written — cut and shipped the release: `c1508f6`
> (`0.51.0`, tag `v0.51.0`) and `388b658` (rotating both `upcoming.md` files into
> `docs/changelogs/v0.51.0.md` and `docs/release-notes/v0.51.0.md`). **`0.51.0` is
> published on npm as `latest`.** The cut is epic-level work, not this slice's —
> but epic acceptance criterion 1 requires the two symbols to be importable *from a
> published version*, so the release is a precondition of the epic closing and not
> something that was skipped. See `refined-outcome.md`.

## Documentation Sync

Evaluated over the finished diff. **This repo's `AGENTS.md` has no
`## Documentation Sync` section** — flagged in `spec.md` → Notes and reported at
handoff; adding one is repo governance, not this item's scope. The two files this
repo maintains by established practice were evaluated and both fired:

- `docs/changelogs/upcoming.md` (`Any-Code-Change`) — developer entry: what was
  added, the `number` signature and why, the `NO_ASSIST` carve-out, and that the
  change is purely additive.
- `docs/release-notes/upcoming.md` (`Public-API`) — consumer-facing section framed
  around the trap rather than the API: the exclusion is the reason the definition
  is shared.

Not fired: `README.md` (documents sub-entry structure, not per-symbol surface;
`./consts` already listed), `AGENTS.md` (no new convention), `docs/capabilities/**`
(no capability delta — epic criterion 11).

## What the plan and spec got wrong

Nothing material. Two notes:

- **A prettier round-trip on the changelog was needed.** The first `pnpm run check`
  failed at `prettify:check` on `docs/changelogs/upcoming.md` (list-continuation
  indentation), fixed with `prettier --write` and re-run clean. The plan named
  prettier as the verification for task 3 but assumed hand-written Markdown would
  already satisfy it.
- **The pre-existing staged edit.** The item folder arrived with an uncommitted,
  staged `state.yaml` change adding the `initiative:` link. It was committed on its
  own (`e545124`) before any lifecycle artifact, so it could not ride into the
  spec commit or be disturbed by `tcw work start`'s folder move.

The spec's two design decisions both survived contact with the code. Grounding
added during implementation rather than assumed: `proposit-server`'s knex
augmentation really does type `users.tier` as the full `AllUserTiers` union
(`proposit-server/src/types/module-overrides.ts:134` → `TUserLocal` →
`src/schemas/model/users.ts:56`), which is what makes the `number` choice a
deliberate widening rather than a default.

## Notes

- **Out of scope for this slice:** `pnpm version`, `git tag`, `pnpm publish` — none
  of them were done *by this slice*. They were done afterwards, as epic-level work
  riding along with the release: `0.51.0` is cut, tagged `v0.51.0`, and published to
  npm. Slice 2 (`proposit-server`) was blocked on this slice *publishing*, not on
  this commit — that gate is the root-coordinated consumer-side validation in
  `ORCHESTRATOR-AGENTS.md`, and it has now cleared.
- **No consumer in this repo.** `isPlatformDisabled` is exported and unreferenced
  here by design; adoption is slice 2's.
- All work is on `main`. No branch, no worktree — the change is one file plus one
  test.
