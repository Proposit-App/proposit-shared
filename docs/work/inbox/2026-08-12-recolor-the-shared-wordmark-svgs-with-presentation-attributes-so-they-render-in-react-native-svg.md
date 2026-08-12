---
from: proposit-app
---

# Recolor the shared wordmark SVGs with presentation attributes so they render in react-native-svg

> Escalated by `proposit-mobile` on 2026-07-13; routed here by the orchestrator on 2026-08-12. Original entry title: *proposit wordmark svgs color via style class fill unrenderable in react native svg*.

## Problem

`@proposit/shared`'s wordmark asset `propositLogoWhite`
(`src/ui/assets/proposit-logo-white.ts`, source
`proposit-server/public/Proposit_Logo-white.svg`) sets its fill **only** through
a CSS `<style>` block:

```xml
<defs><style>.cls-1 { fill: #fff; }</style></defs>
<path class="cls-1" .../>
```

`react-native-svg` (v15, used by proposit-mobile) does **not** apply class-based
`<style>` rules. The paths therefore have no effective fill and fall back to the
default **black**, so the "white" wordmark renders black — unreadable on the
dark-mode background. (The `propositLogoBlack` asset happens to render correctly
only because black is the default fill; it has no fill attribute either.)

## Root cause

The asset relies on a coloring mechanism (`<style>` + class selector) that is
valid in browsers (server web UI renders fine) but unsupported by
react-native-svg. It is a cross-consumer asset with a browser-only assumption.

## Proposed fix

Recolor the shared wordmark SVGs to use **presentation attributes** instead of a
`<style>` class — e.g. `fill="#ffffff"` on the paths (or on the root `<svg>`,
which cascades). Presentation attributes render identically in the browser and
in react-native-svg. Apply the same treatment to any other shared SVG asset that
colors via `<style>` (audit `src/ui/assets/*` — the letter-logo assets use inline
`style="fill:…"` which react-native-svg *does* honor, so those are fine; the
`<style>`-block ones are the risk).

## Consumer impact

- **proposit-mobile**: shipped a local mitigation — `PropositLogo` now tints the
  wordmark with the theme foreground token via `SvgXml`'s `fill` prop, so it is
  correct regardless of the asset. This shared fix is still wanted so the asset
  is correct for any RN consumer standalone; the mobile tint and a
  presentation-attribute fill compose without conflict (an explicit path fill
  would simply win over the inherited one, still matching the scheme).
- **proposit-server**: no visible change (browser already applied the `<style>`).

## Test cases

- Render `propositLogoWhite.svg` through react-native-svg with no fill override
  → paths are white, not black.
- Snapshot/attribute check that the shared wordmark SVGs contain no `<style>`
  element and carry an explicit `fill` on their paths or root.
- Server web UI wordmark unchanged (visual/DOM regression).

