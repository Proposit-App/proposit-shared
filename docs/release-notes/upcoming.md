---
date: TBD
---

# Release notes — upcoming

## Design tokens: the Proposit citron palette lands in `@proposit/shared/ui`

`@proposit/shared/ui` now ships the canonical **Proposit citron** colour system
— a quiet warm-neutral canvas with a single loud citron action per screen and
sage/clay/amber/slate status hues — replacing the old blue-slate palette. Three
palette members are added: `backgroundElevated` (elevated surface) and the
text-safe accent variants `primaryAsText` / `warningAsText`. `radii.sm` tightens
from 4 to 6.

> **Visual-breaking for mobile.** Every colour value changes. The token
> _interface_ is additive (no member was removed, so type-checks still pass),
> but any UI reading these tokens will look different. Adopt deliberately and
> re-verify screens in both light and dark mode. Acceptable under the pre-1.0
> minor policy (semver §4) — pin with a caret knowing a `0.x+1.0` may reskin you.
