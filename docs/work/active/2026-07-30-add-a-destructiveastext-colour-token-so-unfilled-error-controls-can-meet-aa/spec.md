# Spec: `destructiveAsText`

Request: [`initial-request.md`](./initial-request.md).

Written compressed, and after the fact: the change is one additive token following an
established convention, and it shipped in `f7f3b4b` before the spine was written. Every
number below was recomputed in this repo rather than copied from the request.

## Capability changes

None. Design tokens sit under no entry in this node's capability ledger, and no
user-facing capability changes state here — the visible delta lands when
`proposit-server` adopts the token. Same call as the `successAsText` sibling item.

## Problem

`src/ui/colors.ts` gives three accents a text-safe sibling — `primaryAsText`,
`successAsText`, `warningAsText` — because the fill tokens are tuned to sit *behind*
their `*Foreground` ink, not to be painted onto the page. `destructive` has no such
sibling, so a consumer that paints it as text (an outlined or text `color="error"`
button) has no AA-safe value to reach for.

Measured against the three grounds an accent can land on (`background` /
`backgroundElevated` / `muted`), the raw fill as text:

| Scheme | Fill | Ratios | Floor 4.5 |
| --- | --- | --- | --- |
| light | `#b25545` | 4.45 / 4.91 / 4.23 | fails page + muted |
| dark | `#c56a5b` | 5.15 / 4.66 / 4.32 | fails muted |

## Goals

- `destructive` gains an AA-safe text variant, following the existing `*AsText`
  convention exactly (interface member, both palettes, doc comment).
- The new token is covered by the existing contrast guard without new scaffolding.

## Non-goals

- **Darkening the `destructive` fill.** It is correct as a fill; changing it repaints
  every filled destructive surface in both apps. The whole point of the `*AsText` family
  is that these are two different jobs.
- The server-side adoption — its `ACCENTS_USABLE_AS_TEXT` allowlist and the seven call
  sites. Tracked as `proposit-server/2026-07-30-adopt-destructiveastext-and-bring-the-six-unfilled-error-controls-up-to-aa`.
- `proposit-mobile`. It does not consume these tokens as MUI-style accents; nothing to do
  on repin.

## Design

Add `destructiveAsText` to `TColorPalette` and to both palettes:

- light `#a75041` → 4.93 / 5.43 / 4.67
- dark `#c87263` → 5.57 / 5.04 / 4.67

Unlike `primaryAsText` / `successAsText` / `warningAsText`, this token differs from its
fill in **dark** mode too — the clay fill measures 4.32:1 on the muted ground, under the
floor — so the header comment's "in dark mode the `*AsText` token is generally the fill
itself" needs the exception spelled out, both in the header and at the dark value.

No test changes: `src/ui/__tests__/colors.test.ts:61` enumerates `*AsText` tokens by key
suffix, so it picks the new one up. That must be *verified* going red, not assumed.

## Acceptance criteria

1. `colors.light.destructiveAsText` and `colors.dark.destructiveAsText` exist and clear
   4.5:1 against `background`, `backgroundElevated`, and `muted` in their own scheme.
2. The suffix-enumerating guard covers the new token — demonstrated by setting it to the
   raw fill and watching the suite fail.
3. The raw `destructive` fill is unchanged in both palettes.
4. `pnpm run check` passes.

## Risks

- **The guard silently not covering it.** Mitigated by criterion 2 — an added token that
  no assertion reaches is worse than no token, because it reads as verified.
- **A later "simplification" collapsing the dark token back to the fill**, on the theory
  that dark `*AsText` always equals the fill. Mitigated by the comment at the dark value
  naming the 4.32:1 measurement.
