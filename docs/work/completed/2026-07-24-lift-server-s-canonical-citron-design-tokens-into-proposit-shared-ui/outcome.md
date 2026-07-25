# Outcome

Lifted the canonical Proposit citron tokens from `proposit-server/src/ui/`
(source of truth) into `@proposit/shared/ui`, per the delegated token delta.

## Source files changed

- `src/ui/colors.ts` — replaced every light + dark value with the citron
  palette; added three `TColorPalette` members (`backgroundElevated`,
  `primaryAsText`, `warningAsText`). Preserved the shared-only exports
  `TColorScheme` + `colorSchemeFor`. Hex values lowercased to match shared's
  existing lowercase-hex convention (same colours as server's uppercase).
- `src/ui/radii.ts` — `sm: 4 → 6`. Kept `md`/`lg`/`xl`/`full` and the export
  name `radius` (server's file is named `radii` and drops `xl`/`full`; shared
  keeps them because mobile imports them).
- `src/ui/__tests__/colors.test.ts` — ported the server's WCAG-AA assertions
  (`primaryAsText`/`warningAsText` ≥4.5:1 against background/backgroundElevated/
  muted in both schemes). Removed the outdated `warningForeground !== "#ffffff"`
  assertion — the canonical citron palette deliberately uses white ink on the
  darkened amber fill, so the old-palette assertion no longer holds.

Not changed (already matched server): `typography.ts`, `spacing.ts`,
`shadows.ts` (kept `shadows.native`), `motion.ts`. Fonts stay as the RN-friendly
numeric scale (not converted to CSS vars — a correct per-platform difference).

## Strict-superset confirmation

Server's `TColorPalette` is a strict superset of shared's: every one of shared's
34 previous members is retained, plus the 3 new members. `pnpm run typecheck`
green confirms no member mobile could import was dropped. No member had to be
kept that server dropped in `colors.ts` (radii is the only place server dropped
members — `xl`/`full` — and those were kept).

## Verification

`pnpm run check` fully green: typecheck ✓, lint ✓, **992 tests passed**, build ✓.

AA test line:
`✓ src/ui/__tests__/colors.test.ts > colors > primaryAsText and warningAsText clear AA against every background they land on`

No `*AsText` value needed darkening — server's values already clear AA against
all three backgrounds in both schemes.

## Recommended version

**Minor** (pre-1.0 policy §4). Interface change is additive but the value swap
is visually breaking for mobile — called out in `release-notes/upcoming.md`.
Version bump / publish is gated at the orchestrator root — NOT applied here.
