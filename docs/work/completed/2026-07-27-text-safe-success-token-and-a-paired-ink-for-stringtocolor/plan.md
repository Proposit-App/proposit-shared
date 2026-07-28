# Plan

Two files change, plus their tests. No stage DAG — this is one sitting.

## 1. `src/ui/colors.ts`

- Add `successAsText: string` to `TColorPalette`, doc-commented like its two siblings.
- `colors.light.successAsText = "#557232"`, `colors.dark.successAsText = "#82a857"`.
- The header comment already explains the fills-vs-text split generically; no edit needed beyond
  the interface docstring.

## 2. `src/ui/__tests__/colors.test.ts`

- Extend the existing `*AsText` sweep to include `scheme.successAsText`, and rename the test to
  drop the enumerated token list so the next token added does not need a title edit.
- New test: the raw `success` fill fails AA as text against `background` and `muted` in light. This
  is a *negative* assertion on purpose — it fails the day someone "fixes" contrast by darkening the
  fill.

## 3. `src/utils/utils.ts`

- `stringToColor(str)` returns `{ fill, ink }`.
- Add a module-private `relativeLuminance(hex)` and derive `ink` from the 0.1791 crossover.
- Comment carries the two non-obvious constraints from the spec: absolute inks (not palette
  tokens), and why pure black/white rather than the palette's darkest ink.
- `"?"` returns `{ fill: "#bdbdbd", ink }` through the same pairing — no special-cased ink.

## 4. `src/utils/__tests__/utils.test.ts`

- Sweep: for a few thousand generated names plus `qa_manual`, `f`, `a`, `Brian`, and `""`, assert
  `contrastRatio(fill, ink) >= 4.5`.
- Assert `stringToColor("?").fill === "#bdbdbd"`.
- Keep the existing fill-shape assertions, adapted to `.fill`.

## 5. Docs

- `docs/changelogs/upcoming.md` + `docs/release-notes/upcoming.md`: the additive token, and the
  `stringToColor` return-shape break with the one-line migration (`stringToColor(n)` →
  `stringToColor(n).fill`).
- Check `README.md` / `AGENTS.md` for a `stringToColor` mention and update if present.

## Verification

`pnpm run check` (test + typecheck + lint + build). Then a consumer smoke: typecheck
`proposit-server` against the built `dist` is **not** run here — the server is pinned to the
published version and repins on its own schedule; publishing is gated on consumer validation at the
workspace root either way.

## Risks

- **Only real risk is the return-shape break.** Contained: one consumer, one call site, one test
  file, all named in the spec, and it is a compile error rather than a silent behaviour change.
