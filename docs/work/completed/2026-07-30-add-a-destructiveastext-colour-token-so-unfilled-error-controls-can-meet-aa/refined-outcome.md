# Verification: `destructiveAsText` — accepted

Accepted by the user on 2026-08-03, on the assessment below.

## Evidence

- **Acceptance criterion 1** — both values exist and clear the 4.5:1 floor on all three
  grounds of their own scheme: light `#a75041` → 4.93 / 5.43 / 4.67, dark `#c87263` →
  5.57 / 5.04 / 4.67. Recomputed in this repo during the pass, not copied from the request.
- **Criterion 2** — the suffix-enumerating guard demonstrably reaches the new token:
  setting both values to their raw fills fails with `destructiveAsText #b25545 on #f5f4ee:
  expected 4.454396987687217 to be greater than or equal to 4.5`. Reverted; tree clean.
- **Criterion 3** — the `destructive` fills are unchanged (`#b25545` / `#c56a5b`).
- **Criterion 4** — `pnpm run check` green: 116 files, 1137 tests, lint and build clean.

## Capabilities

Nothing to reconcile. The spec declared no capability delta — design tokens sit under no
entry in this node's ledger, and the user-visible change is the consumer's to make. No
sidecar written.

## Closeout choices

- **Route:** committed directly on `main`, no PR. Three ordered artifact commits —
  `c04bc8f` (spec), `087759a` (plan), `48f0675` (outcome) — on top of the code commit
  `f7f3b4b` from 2026-07-30.
- **Version:** none. The code already released in v0.54.0 and the package is published at
  v0.56.0; these are docs-only commits, so there is nothing to cut and nothing to publish.
- **Push:** left local, per the standing preference against pushing docs-only commits.
- **Documentation:** already current (`docs/changelogs/v0.54.0.md:105-110`,
  `docs/release-notes/v0.54.0.md:36-39`). Nothing added at closeout.

## Follow-up

Completing this unblocks
`proposit-server/2026-07-30-adopt-destructiveastext-and-bring-the-six-unfilled-error-controls-up-to-aa`,
which the user is picking up immediately. The server is already pinned to `^0.56.0`, so no
repin is involved — only extending `ACCENTS_USABLE_AS_TEXT` (`src/ui/mui-theme.ts:35`) and
clearing the local overrides at the seven `color="error"` call sites.

## Notes

The spine was written after the code shipped. That is a process gap worth naming, not a
defect in the work: the token, its comments, and its release documentation were all
correct and complete before this pass began, and the one thing that could have been
wrong — a guard that enumerates tokens by suffix but never actually reaches this one — was
re-tested here rather than accepted on the original commit message's claim.
