---
from: proposit-app
initiative: 2026-07-24-synchronize-mobile-and-server-look-and-feel-via-a-shared-design-system
---

# Lift server's canonical citron design tokens into @proposit/shared/ui

Epic: [Synchronize mobile and server look-and-feel via a shared design system](tcw://W/proposit-app/2026-07-24-synchronize-mobile-and-server-look-and-feel-via-a-shared-design-system)

## Problem

`@proposit/shared/ui` is out of date: it still carries the generic blue-slate
shadcn/Tailwind palette (`primary #2563eb`). The canonical Proposit look now
lives in `proposit-server/src/ui/` (the "Proposit citron" system — warm-neutral
canvas, one loud citron action per screen, sage/clay/amber/slate status hues),
authored during the 2026-07-02 reskin as a temporary local copy. Mobile is the
**only** consumer of `@proposit/shared/ui` (~21 files) and is stuck on the old
palette. This slice is the foundation: lift the canonical tokens into shared and
publish so mobile can adopt them.

## Root cause

The server reskin iterated in a server-local `src/ui/` copy to avoid the
shared publish/repin cycle; the shared module was never updated, so the two
design systems diverged.

## Proposed fix (canonical token delta — server `src/ui/` is source of truth)

Diff server `src/ui/` against current `@proposit/shared/ui`:

- **`colors.ts` — replace all values (the interface change is additive).**
  Server = Proposit citron (light `background #F5F4EE`, `primary #AEDA2E`
  citron, sage/clay/amber/slate status; dark mirrors). Shared = blue-slate.
  Server's `TColorPalette` is a strict **superset** of shared's — every current
  member name is retained, none removed — so this is a value swap plus three
  added members, not a shape change. **Confirm before publishing that no member
  mobile imports today is dropped** (a removed member breaks mobile's
  type-check). The three added members:
  - `backgroundElevated` — elevated surface (`#FFFFFF` light / `#191A15` dark).
  - `primaryAsText` — `primary` darkened to clear AA as text on the pale ground
    (bright citron is ~1.48:1 as text — unreadable; the raw fill is for behind
    `primaryForeground`, not for painting text on the page).
  - `warningAsText` — same treatment for `warning` (amber).
  Preserve the shared-only exports mobile depends on: `TColorScheme`,
  `colorSchemeFor`.
- **`radii.ts` — `sm: 4 → 6`** (server's tighter structural feel). Confirm
  whether server also drops `xl`/`full`; **keep any member mobile still imports.**
- **No change:** `typography.ts`, `spacing.ts`, `shadows.ts`, `motion.ts` —
  server seeded these verbatim; fonts (Roboto / Fira Code) and scales already
  match. Keep the RN-relevant numeric scales and `shadows.native`. (Server
  expresses fonts as CSS vars for MUI; shared keeps the numeric scale — that is
  a correct per-platform difference, **not** a divergence to lift.)

## Test cases

- Port server's `tokens.test.ts` AA assertions: unit-test that `primaryAsText`
  and `warningAsText` clear WCAG AA (≥4.5:1 body / ≥3:1 large) against **every**
  background they can land on, in **both** schemes.
- `pnpm run check` green (typecheck confirms no member removed that mobile imports).

## Consumer impact

The value swap is a **visual-breaking** change for mobile even though the
interface is additive — acceptable under shared's pre-1.0 minor policy (§4), but
the release note **must** call it out. Adding `backgroundElevated`/`*AsText` to
`TColorPalette` is a breaking token-interface change mobile's theme adapter must
thread (handled in the mobile slice). Server does **not** consume `shared/ui`
yet, so server is unaffected by this slice.

## Deliverable / docs-sync

Published shared **minor**. Release-notes + changelog `upcoming.md` (call out the
visual-breaking palette swap); offer the version bump. This is the foundation
slice — S2 (mobile) and S3 (server) both consume the published tokens.
