# Plan — Add the shared review copy and icon-name modules under ui/argument/review

Four commits: two code, one for the stance labels the sibling epic owns the
words for, one documentation block. Nothing in this repo consumes the new
module, so every task is verified by `tcw` on `pnpm run check` rather than by a
render.

## Tasks

1. **Add `src/ui/argument/review/icons.ts` and its duplicate test.**
   `REVIEW_ICON_NAMES = ["conclusionAxis", "argumentAxis"] as const` plus
   `TReviewIconName`, and one test in
   `src/ui/__tests__/argument-review-icons.test.ts` asserting the array has no
   duplicate entry (`new Set(REVIEW_ICON_NAMES).size === REVIEW_ICON_NAMES.length`).
   The module and its only test land together — a test committed before the
   module it imports leaves the suite red at a commit boundary.
   *Verify:* `pnpm run test` and `pnpm run typecheck`.

2. **Add `src/ui/argument/review/consts.ts`** with the header restating the
   three wording constraints, the two engine re-exports, `REVIEW_PILL_LABELS`,
   `REVIEW_DEFAULT_VALUE_ORIGIN`, `REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP` and
   `REVIEW_PROVENANCE_TOOLTIPS` — signatures per `spec.md` → *Design*.
   *Verify:* `pnpm run typecheck` proves the `Record<TAssignmentPill, string>`
   and `Record<TAssignmentProvenance, string>` annotations are satisfied; read
   back that the composed tooltip's first letter after the em dash is lowercase.

3. **Add `REVIEW_STANCE_LABELS`** to `consts.ts`, on its own.
   Last, and separate, because the words come from the reaction-relabel epic
   that runs first; the server still reads `"Support"` / `"Counter"`. Reverting
   this one commit leaves the rest of the module intact.
   *Verify:* `pnpm run typecheck`.

4. **Documentation Sync block** (see below), then `pnpm run check` in full.

`outcome.md` is written and committed after task 4, as its own commit.

## Documentation Sync

`AGENTS.md` has **no `## Documentation Sync` section**, so there are no triggers
to evaluate. Adding one is a repo-hygiene item of its own and is out of scope
here. The four entries below are inferred from the sibling repos' sections and
from what this repo maintains (`docs/changelogs/`, `docs/release-notes/`); each
is judged against what a `[Public-API]` / `[Any-Code-Change]` trigger would ask.

- `docs/changelogs/upcoming.md` — **fires.** New public sub-path with new
  exports. Note the import path, the export list, and why `package.json` is
  untouched.
- `docs/release-notes/upcoming.md` — **fires.** This library's "user" is a
  consuming app author; a new import path is user-facing to them. Short entry:
  where review copy and the review icon vocabulary now live.
- `AGENTS.md` → `## Package structure` — **fires.** The representative sub-path
  list names `./ui`, `./ui/assets`; the review sub-path joins it.
- `AGENTS.md` → `## Key design rules` — **fires.** Record the
  `src/ui/<feature-conceptual-path>/<purposeful-filename>.ts` layout, no barrel,
  and state explicitly that a path under an existing wildcard needs **no**
  `exports` entry — otherwise the standing "include all three conditions" rule
  invites someone to add a redundant one.

Version cross-check before appending: `package.json` is at 0.66.0,
`docs/changelogs/v0.66.0.md` and `docs/release-notes/v0.66.0.md` both exist, and
both `upcoming.md` files hold only their title line. No drift, no rotation.

## Verification

- `pnpm run check` (typecheck + lint + test + build) after task 4.
- `git diff main --stat` shows only: two source files, one test, the two
  `upcoming.md` files, `AGENTS.md`, and `docs/work/**`. Any hit on
  `package.json` or `src/ui/index.ts` fails the item.
- Confirm the epic's flagged-unverified assumption — that the change is additive
  and needs no `@proposit/proposit-core` change — from the build output and the
  new files' imports, and state it in `outcome.md`.
- Not checkable here: that the sub-path resolves from an installed tarball in
  both consumers. That is the orchestrator's criterion, run at the root node.
