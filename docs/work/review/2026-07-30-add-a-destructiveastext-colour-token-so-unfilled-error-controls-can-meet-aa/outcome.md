# Outcome: `destructiveAsText`

Plan: [`plan.md`](./plan.md). Spec: [`spec.md`](./spec.md).

The code shipped in `f7f3b4b` (2026-07-30) and released in **v0.54.0**, ahead of this
spine being written; `spec.md` and `plan.md` were reconstructed against the committed diff
and the numbers were recomputed rather than copied. Current version is v0.56.0, published,
so the token is already available to consumers.

## What shipped

**Tasks 1–2 — the token** (`f7f3b4b`, `src/ui/colors.ts`, +15 / −5):

- `destructiveAsText` added to `TColorPalette` (:42-43) with the sibling doc comment.
- `colors.light.destructiveAsText = "#a75041"` (:95) — 4.93 / 5.43 / 4.67 against
  `background` / `backgroundElevated` / `muted`.
- `colors.dark.destructiveAsText = "#c87263"` (:147) — 5.57 / 5.04 / 4.67.
- The file header (:10-16) now names clay as the exception to "in dark mode the `*AsText`
  token is generally the fill itself", and a comment at the dark value (:143-146) records
  the 4.32:1 muted measurement that forces it.
- The `destructive` fills are untouched: `#b25545` light, `#c56a5b` dark.

No test file changed, as planned — the guard at `src/ui/__tests__/colors.test.ts:61`
enumerates `*AsText` tokens by key suffix.

**Task 3 — proving the guard reaches it.** Re-run during this pass, not taken on the
commit message's word: setting both values to their raw fills turns the suite red with
`destructiveAsText #b25545 on #f5f4ee: expected 4.454396987687217 to be greater than or
equal to 4.5`. Reverted; tree clean.

**Task 4 — Documentation Sync.** Already answered by the v0.54.0 release:
`docs/changelogs/v0.54.0.md:105-110` carries the values and measurements,
`docs/release-notes/v0.54.0.md:36-39` carries the plain-language version. Nothing left to
write.

## Test result

`pnpm run check` green — 116 files, 1137 tests, lint and build clean, tree clean after.

## What the plan and spec got wrong

Nothing material. One note: the request estimated the shared change at "interface + both
palettes"; the header-comment amendment was needed too, because the existing text asserted
a dark-mode rule this token breaks. Recorded in the plan as part of task 2.

## Not done here, by design

The consumer adoption — `ACCENTS_USABLE_AS_TEXT` in `proposit-server`'s `mui-theme.ts:35`
still reads `["primary", "warning"]`, and the seven `color="error"` call sites the request
enumerates are untouched. That is
`proposit-server/2026-07-30-adopt-destructiveastext-and-bring-the-six-unfilled-error-controls-up-to-aa`,
which is blocked-by this item and unblocks on completion. The server is already pinned to
`^0.56.0`, so no repin is needed there — only the allowlist and the call sites.
