# Upcoming release notes

### New features

- New `@proposit/shared/ui` sub-entry providing design tokens shared between `proposit-server` and `proposit-mobile`. Exports semantic color palettes (light + dark), a typography scale, spacing, radii, shadows (dual CSS + native shape for React Native), motion durations and easing, z-index layers, breakpoints, sizing, and three Proposit brand-logo SVG assets as inline strings. Consumers add the dependency on `^0.4.0` and read tokens directly; see the spec at `docs/superpowers/specs/2026-05-05-shared-ui-tokens-design.md` for the full surface.
