# Plan

1. Consume core 3.1.0 tarball (`pnpm add <tgz>`; `file:` pin is temporary
   local-validation state, reverts to `^3.1.0` at publish).
2. TDD `src/engine/review/__tests__/inline-overlay.test.ts`:
   precedence, provenance, reaction trivalent mapping, lazy fallback,
   propagated `unknown → true`, grade surfaced.
3. `types.ts`: `TAssignmentProvenance` + additive `TReviewOverlay` fields.
4. `overlay.ts`: `buildInlineReviewOverlay` (merge + axiom-strip/citation-keep +
   operators-accepted evaluate + grade + claim-keyed propagated).
5. Declare inline-review capabilities (`Missing`), `Planning doc=` this slug.
6. Documentation Sync (release notes + changelog) + `pnpm run check`.
7. `pnpm version minor` (→ 0.46.0), rotate upcoming docs, `pnpm run build && pnpm pack`.
   No tag, no publish, no `tcw work complete`.
