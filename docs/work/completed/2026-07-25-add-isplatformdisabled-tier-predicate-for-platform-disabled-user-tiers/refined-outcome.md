# Refined outcome — Add `isPlatformDisabled(tier)` predicate for platform-disabled user tiers

**Accepted.** Resolution: `done`. No rework, no code defect found.

## Decision

Independent verification checked every acceptance criterion in `spec.md` and
found all of them met. Nothing in the implementation was changed at this stage —
the only edits made during verify were to this item's own records, described
under "Documentation corrections" below.

## Evidence

**The published artifact was verified, not just the source.** The check that
mattered was made against the registry, because epic acceptance criterion 1 asks
for the symbols to be importable *from a published version* — source alone cannot
answer that. The published `0.51.0` tarball really does export both
`isPlatformDisabled` and `PLATFORM_DISABLED_TIERS` from `@proposit/shared/consts`,
and both behave correctly at runtime and at the type level. `npm view
@proposit/shared version` → `0.51.0`; the repo is at `0.51.0` with tag `v0.51.0`
pointing at `HEAD`.

**Gates, re-run at verify:**

- `pnpm run check` — **green**. `typecheck` clean, `prettify:check` clean,
  `eslint` clean, **1006 tests passed / 1006, 103 files**, `build` emitted `dist/`.
- `tcw capabilities check` — `capabilities OK`.
- The 9-test tier suite (`src/consts/__tests__/platform-disabled.test.ts`) passes,
  including the `NO_ASSIST` carve-out and the key-set assertion that fails if a
  `UserTiers` member is added without a decision.

The implementation-stage evidence in `outcome.md` — TDD red-green, the
`tier > 100` mutation check that isolated exactly the `NO_ASSIST` test, signature
parity with `proposit-server/src/model/user.ts` — was reviewed and stands.

## Documentation corrections made during verify

Two records disagreed with the repo's own git history. Both were corrected before
closeout; neither reflects a defect in the shipped code.

**1. `outcome.md` predated the release** (commit `0bbbfad`). It was written at
`c61b076`, before the three commits that followed it, and asserted that the
version was unchanged at `0.50.1`, that `git tag --points-at HEAD` was empty, that
nothing was published, that `upcoming.md` was not rotated, and that
`pnpm version` / `git tag` / `pnpm publish` were deliberately not done. Every one
of those was true when written and false by the time verification ran: `c1508f6`
cut `0.51.0` and tagged `v0.51.0`, `388b658` rotated both `upcoming.md` files into
`docs/changelogs/v0.51.0.md` and `docs/release-notes/v0.51.0.md`, and `0.51.0` is
on npm as `latest`. The corrections keep the original statement scoped to the
implementation commit `fd8cedd` — where it was accurate, and where spec criterion 8
was in fact satisfied — and record that the release landed after it as epic-level
work. The record must not read as though publication never happened, since epic
criterion 1 depends on it.

**2. The capability commit is epic-owned, not this slice's** (this commit).
`72f5642` in this repo extends the body of
`docs/capabilities/moderation/remove-an-abusive-user/description.md` to state that
removal locks the account out so the removed user cannot sign back in. The epic's
plan assigns that edit to the epic itself — "a `## Capability changes` body edit on
the shared master's `moderation/remove-an-abusive-user`, **not a slice**" — and the
epic's spec scopes it to "body only, no status change". This item's `spec.md`
correctly says its own capability changes are none, which left a commit in this
repo that the item appeared to disown; a pointer was added there so a reader of
this item alone is not misled.

Deliberately **not** done: no capability status flipped, no capability minted, no
change to the epic's ownership of that edit. `tcw capabilities check` passes as-is.

## Deferred / not this item

- **Slice 2 (`proposit-server`) adoption** — deleting the server-local predicate
  and repointing its call sites. It was blocked on this slice publishing; that gate
  has cleared with `0.51.0`. Note the epic records that slice 2's call-site count is
  no longer two and must be re-inventoried at implementation time.
- **`proposit-shared`'s `AGENTS.md` has no `## Documentation Sync` section.**
  Observed at spec time and still true. Formalizing it is repo governance, not this
  item's scope.
- **Closeout version cut** — not offered, because the release this work belongs to
  is already cut, tagged, and published.

## Notes

- All work is on `main`. The predicate is exported and unreferenced in this repo by
  design; adoption is slice 2's.
