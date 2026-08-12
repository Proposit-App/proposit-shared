---
from: proposit-app
---

# Add a dark surface-elevation token with a usable contrast step

> Escalated by `proposit-server` on 2026-08-08; routed here by the orchestrator on 2026-08-12. Original entry title: *dark surface elevation token with a usable contrast step*.

**Route to:** `proposit-shared` (`@proposit/shared/ui` palette tokens).
**Do not** treat this as a server-side fix — the server has already
established that no combination of existing tokens solves it (see "Why a
border can't solve it").

## Problem

`proposit-server` v0.49.4 flattens MUI's dark-mode elevation overlay
globally (`MuiPaper.styleOverrides.root.backgroundImage: "none"`). That
overlay was painting an untokenized white wash over every `Paper` in
proportion to its elevation, so an elevated surface no longer meant the
palette token that named it: at elevation 24 (every dialog) the paper lifted
from `#191a15` to `rgb(63,64,60)` and dropped `mutedForeground` to 3.17:1
against a 4.5:1 body-text floor, across the whole dialog, while every
palette-level check still measured 5.29:1 because the wash lives in
`background-image` rather than `background-color`.

Removing it fixes the text failure and makes an elevated surface mean its
token. The cost: **dark-mode elevation is now conveyed by shadow alone**, and
a dark shadow on `#191a15` is very nearly invisible. Floating Papers that have
no backdrop behind them now have essentially no boundary against the surface
they float over.

### Measured, before → after

| Surface pairing | Before (overlay) | After (flat) |
| --- | --- | --- |
| Menu / popover over another `Paper` | 1.42:1 | **1.00:1** |
| Menu / popover over `background.default` | 1.57:1 | **1.11:1** |
| Dialog vs. its backdrop | 1.93:1 | 1.15:1 |

Affected surfaces are the non-backdropped floating ones: menus, the gear
popovers, the `Autocomplete` listbox, and
`src/app/view/[argumentId]/[version]/components/excerpt-popover.tsx:105`.
Backdropped surfaces (dialogs, drawers) still read, because the scrim does the
separating.

**Light mode is unaffected** — MUI applies no elevation overlay in light, so
the light numbers do not move at all. Light has in fact always had the same
1.00:1 condition for a `Paper` over a `Paper`; nothing regressed there, it is
simply now true in both schemes.

This is **accepted for now** on the server side: 1.00:1 on a surface *edge* is
a worse-looking but lesser defect than 3.17:1 on *text* across every dark
dialog, and it is the pre-existing light-mode condition. It still needs a real
fix upstream.

## Root cause

The shared palette has no dark surface-elevation step. It defines exactly two
dark surface levels, and they are not far enough apart to express elevation:

- `background` → `backgroundElevated` is **1.11:1**. That is the whole ladder.
- There is no third level, so a floating surface has nothing to be raised *to*.

MUI filled that gap with its own untokenized model (the white wash), which is
precisely the second elevation model the server just removed.

## Why a border can't solve it (server-side fix ruled out)

The obvious local workaround — outline the floating surface with `divider` —
does not clear any meaningful floor either: `divider` is `#2a2b24` on
`#191a15` = **1.22:1**. Substituting `backgroundElevated` as a border colour is
worse (1.11:1). So there is no existing token pairing in the dark palette that
can draw a perceptible edge, which is why this is a palette request and not a
component change in the consumer.

## Requested change

A dark **surface-elevation token** (or a small ordered set of them) with a
usable contrast step against both `background` and `backgroundElevated` —
enough that a floating surface reads as separated from whatever it floats
over. WCAG 1.4.11 non-text contrast is 3:1; a boundary that merely needs to be
seen rather than operated may reasonably target less, but 1.00:1 is not a
boundary at all.

Either shape works for the consumer:

- an additional surface level (e.g. a `backgroundFloating`) that a floating
  `Paper` can paint, or
- a dark-specific surface *border* token tuned to be perceptible against the
  two existing grounds.

Whichever is chosen should be paired with the corresponding light values so
the consumers can reference one token name in both schemes.

## Consumer impact

- `proposit-server` would repoint the floating surfaces (menus, popovers,
  `Autocomplete` listbox, `excerpt-popover.tsx`) at the new token and keep the
  global overlay flattening, which is what protects the dialog text.
- `proposit-mobile` consumes the same `@proposit/shared/ui` tokens and has the
  same dark floating-surface condition; a shared token fixes both.
- Additive to the palette, so no consumer breaks by not adopting it.

## Test cases

- Contrast assertion in the shared token tests: the new token clears the chosen
  floor against **both** `background` and `backgroundElevated` in dark, and its
  light counterpart does the same against the light grounds.
- A regression assertion that `background` → `backgroundElevated` alone does
  *not* clear that floor (1.11:1), so the new token cannot later be "simplified
  away" back onto the existing pair.
- Consumer-side: a rendered menu over a `Paper` measures above the floor in
  dark, and the light numbers are unchanged.

## Constraint

`@proposit/shared` is frozen clean at 0.65.1 and the server branch
(`explain-review-result-results-stage`) is frozen; nothing here was changed in
shared. Schedule this as its own publish window — a palette change reopens the
four-repo review chain.

