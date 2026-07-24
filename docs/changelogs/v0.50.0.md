# Changelog — upcoming

- **ui: lift the canonical Proposit citron tokens from `proposit-server` into
  `@proposit/shared/ui`.** `colors.ts` swaps every light + dark value from the
  old blue-slate palette to the citron system and adds three `TColorPalette`
  members — `backgroundElevated`, `primaryAsText`, `warningAsText`. The
  interface change is a strict superset (no member removed), so consumer
  type-checks pass; the value swap is visually breaking. `radii.sm` 4 → 6.
  `typography`/`spacing`/`shadows`/`motion` unchanged (already matched). Ported
  the server's WCAG-AA assertions: `primaryAsText`/`warningAsText` clear AA
  (≥4.5:1) against every background they can land on in both schemes.
  (a167ad2..HEAD)
