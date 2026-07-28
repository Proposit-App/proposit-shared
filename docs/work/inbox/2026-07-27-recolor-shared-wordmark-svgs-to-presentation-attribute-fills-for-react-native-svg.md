---
from: .
---

# Recolor shared wordmark SVGs to presentation-attribute fills for react-native-svg

Originally escalated by `proposit-mobile`; routed here by the orchestrator
because the asset lives in this repo.

> **Re-confirmed 2026-07-27 against the new logo art.** The new-logo rollout
> replaced `src/ui/assets/proposit-logo-white.ts` and it **carries the same
> defect**: a `<style>` block with 11 `class="cls-1"` paths and **zero** `fill=`
> attributes. Fixing this in the source art (and in `gen_code.mjs`, which
> generates these modules) prevents it recurring on the next art refresh.

## Problem

The wordmark asset `propositLogoWhite` (`src/ui/assets/proposit-logo-white.ts`,
source `proposit-server/public/Proposit_Logo-white.svg`) sets its fill **only**
through a CSS `<style>` block:

```xml
<defs><style>.cls-1 { fill: #fff; }</style></defs>
<path class="cls-1" .../>
```

`react-native-svg` (v15, used by `proposit-mobile`) does **not** apply
class-based `<style>` rules. The paths therefore have no effective fill and fall
back to the default **black**, so the "white" wordmark renders black —
unreadable on a dark-mode background. (`propositLogoBlack` happens to render
correctly only because black is the default fill; it carries no fill attribute
either.)

Browsers *do* apply the `<style>` rule, so the server web UI renders correctly
and the defect is invisible on web — verified again on the new art.

## Root cause

The asset relies on a coloring mechanism (`<style>` + class selector) that is
valid in browsers but unsupported by react-native-svg. It is a cross-consumer
asset carrying a browser-only assumption.

## Proposed fix

Recolor the shared wordmark SVGs to use **presentation attributes** instead of a
`<style>` class — e.g. `fill="#ffffff"` on the paths, or on the root `<svg>`
where it cascades. Presentation attributes render identically in the browser and
in react-native-svg.

Audit `src/ui/assets/*` for the same pattern. The letter-logo assets use inline
`style="fill:…"`, which react-native-svg **does** honor, so those are fine; the
`<style>`-block assets are the risk.

## Consumer impact

- **proposit-mobile** — already ships a local mitigation: `PropositLogo`
  (`src/components/proposit-logo.tsx`) tints the wordmark with the theme
  foreground token via `SvgXml`'s `fill` prop, and its code comment documents
  this exact bug. The fix is still wanted so the asset is correct for any React
  Native consumer standalone. The two compose without conflict: an explicit path
  fill simply wins over the inherited one, still matching the scheme.
- **proposit-server** — no visible change; the browser already applied the
  `<style>` block.

## Test cases

- Render `propositLogoWhite` through react-native-svg with no fill override →
  paths are white, not black.
- Snapshot/attribute check that the shared wordmark SVGs contain no `<style>`
  element and carry an explicit `fill` on their paths or root.
- Server web UI wordmark unchanged (visual/DOM regression).
