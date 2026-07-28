# Text-safe success token and a paired ink for stringToColor

## Product changes

TBD

## Technical changes

TBD

## Meta changes

TBD

## Inbox contents

### Inbox manifest

- `2026-07-27-text-safe-success-token-and-a-paired-ink-for-stringtocolor.md`

### Inbox body

---
from: proposit-app
---

# Text-safe success token and a paired ink for stringToColor

Two contrast defects found by a manual browser-QA sweep of `proposit-server` both root-cause into
`@proposit/shared`. The server has shipped local shims so its users are not left waiting, but the
real fix belongs here — and one of the two affects `proposit-mobile` identically today.

Route both together: they are one small palette/util release.

## Problem

### 1. `success` has no text-safe variant

`colors.light.success` (`#5e7f38`) is a **fill** token. Painted as text on the light ground it
measures:

| Background | Ratio | AA body floor |
| --- | --- | --- |
| `background` `#f5f4ee` | **4.17:1** | 4.5:1 |
| `backgroundElevated` `#ffffff` | 4.60:1 | 4.5:1 |
| `muted` `#f0eee6` | **3.96:1** | 4.5:1 |

`primary` and `warning` already carry `primaryAsText` / `warningAsText` for exactly this reason;
`success` was missed. The dark scheme needs no change — `colors.dark.success` (`#82a857`) measures
7.09 / 6.41 / 5.94 — which is precisely why the defect is invisible to anyone developing in dark.

Found on the argument view's status line, where "Published" is `success.main` and "Draft" is
`warning.main`. Worth noting the Draft branch fails too (`#b08a2c` → 2.92 / 3.22 / 2.77), because the
theme's `*AsText` routing is keyed on the MUI `color` **prop** and that site uses an `sx` colour — so
consumers can bypass the routing without noticing. That is a consumer-side lesson, not a shared bug.

### 2. `stringToColor` returns a fill with no paired foreground

`stringToColor(str)` (`utils/utils`) hashes a name into a background colour. Every consumer then has
to guess a foreground. `proposit-server`'s `UserAvatar` set `bgcolor` and no `color`, so the glyph
fell through to `background.default` — and because the fill is a **username hash** while the
foreground is whichever `background.default` the current scheme has, the pairing is uncontrolled in
*both* directions:

- **light** (`background.default` near-white): a light hash breaks — `qa_manual` →
  `rgb(245,244,238)` on citron `rgb(170,200,2)` = **1.74:1**
- **dark** (`background.default` dark ink): a dark hash breaks — user `f` → `rgb(13,14,11)` on dark
  green `rgb(46,92,70)` = **2.52:1**

So roughly half the user population is unreadable in either theme, and which half flips with the
theme. Switching scheme does not fix it.

## Root cause

Both are the same shape: a token that is only safe as a fill is handed to consumers with no paired
ink, so each consumer independently invents one — or forgets to.

## Proposed fix

1. Add `successAsText` to `colors.light` and `colors.dark`, beside the existing `primaryAsText` /
   `warningAsText`.
   - light: a darkened `success` that clears AA against `background`, `backgroundElevated`, and
     `muted`. The server's shim uses `#557232` (4.96 / 5.47 / 4.71) — the same headroom
     `warningAsText` carries (4.92 / 5.42 / 4.67). Adopt or re-derive as you prefer.
   - dark: `#82a857`, i.e. the fill itself, matching how `primaryAsText` / `warningAsText` are
     defined in the dark scheme.
2. Have `stringToColor` return a paired `{ fill, ink }` rather than a bare fill, with the ink chosen
   from the fill's WCAG relative luminance. Keeping a fill-only overload for compatibility is fine;
   what matters is that a correct pairing is reachable without every consumer re-deriving it.

## Consumer impact

- **`proposit-server`** — carries local shims for both, marked `ponytail:` with this request named as
  the upgrade path: `src/ui/local-tokens.ts` (the green, wired into the MUI palette as
  `success.asText`) and a luminance-derived ink in
  `src/components/client/primitives/user-avatar.tsx`. On repin both collapse into the shared tokens;
  `local-tokens.ts` is deleted outright.
- **`proposit-mobile`** — consumes `stringToColor` and has the **same avatar defect**, unfixed. It
  gains the fix for free on repin. Worth a heads-up to that node either way.
- Neither change is breaking if `successAsText` is additive and the `stringToColor` pairing is
  introduced alongside the existing return shape.

## Test cases

- `successAsText` clears 4.5:1 against `background`, `backgroundElevated`, and `muted`, in **both**
  schemes.
- The raw `success` fill still **fails** that check in light — so darkening the fill is never
  mistaken for the fix. (The server asserts this; it is the guard that keeps the two concepts apart.)
- `stringToColor`'s ink clears 4.5:1 against its own fill, asserted as a sweep over many names rather
  than a couple of samples — the guarantee has to be "every hash". Include the two known victims,
  `qa_manual` and `f`.
- `stringToColor("?")` keeps returning the existing neutral placeholder.

## Origin

`proposit-server` work item `2026-07-27-manual-qa-sweep-accessibility-colour-token-and-content-fixes`
(findings 5 and 6). Measurements above are from that session, taken in-page in both colour schemes.

## Routing note (orchestrator)

Raised by the `proposit-server` agent via `tcw work escalate` during
`2026-07-27-manual-qa-sweep-accessibility-colour-token-and-content-fixes` (now completed), and
routed here because both defects are owned by this repo — the palette and `stringToColor` both live
in `@proposit/shared`.

**Not blocking that item.** The server shipped local shims for both and closed out, so nothing is
waiting on this. Each shim carries a `ponytail:` comment naming this request as its upgrade path,
and `proposit-server/src/ui/local-tokens.ts` is deleted outright when the repin happens.

Publishing this is gated on consumer-side validation per `ORCHESTRATOR-AGENTS.md` — the server and
mobile both consume `stringToColor`, and mobile carries the same avatar defect unfixed, so it is a
consumer to validate as well as a beneficiary.
