# Implementation report — shared slice of the argument-diff epic

**Status:** DONE
**Commit range:** `9111e90..3547efa` (base is the plan commit; six commits on `main`).
**Verification:** `pnpm run check` exits 0 — typecheck + lint + 694 tests (84 files) + build all pass. `dist/engine/diff.js` and `dist/engine/diff-render.js` emit and resolve via the `./engine/*` wildcard export (no exports-map edit needed).

## Commits

- `26e2b19` tcw: start (status move backlog → active), committed before any code.
- `8adea7d` chore: bump `@proposit/proposit-core` peerDep `^2.3.0`→`^2.5.0`, devDep `^2.3.1`→`^2.5.0`; `pnpm install`; `node_modules/@proposit/proposit-core` linked at 2.5.0.
- `8f0af94` Task 2 — enriched four-state `ArgumentDiffSchema` (drops the `propositionalLogic` wrapper + `updated`; adds `DiffStateSchema`/`TDiffState`, `FieldChangeSchema`, `entityFieldDiff`, `entitySetDiff`, nested `premises.modified.expressions`, and `roles.conclusion`). api-client round-trips the schema opaquely — no logic break.
- `e28cac7` Task 3 — `composeArgumentDiff` (claim four-state fold + derivation filter + premise `role` re-attach).
- `d0e8fad` Task 4 — citation four-state by endpoint-pair identity.
- `3547efa` Task 5 — `buildDiffRenderMaps` (state→cue policy) + lint/format fixes to the composition module.

## Authoritative corrections — each has a passing test

1. **Claim `modified-within` carried by the composition.** `composeArgumentDiff` runs a within-pass over matched-and-own-unchanged claims after composing citations: a claim is marked `modified-within` when a citation edge it owns lands in `citations.added/removed/modified`, OR one of its citations' `supportingClaimId` resolves to a `modified-own` claim. `modified-own` wins (own-modified claims are never re-marked).
   Test: `composeArgumentDiff — citations › a claim citing an edited claim is modified-within` (asserts the cited claim is `modified-own` and the citing claim is `modified-within`).

2. **Premise `role`/`title` re-attach.** Added `premisesBefore`/`premisesAfter` (app-level) to the composition input; added/removed/modified premises are re-sourced from these by id (before-side for `.before`/removed, after-side for `.after`/added) so output satisfies `PropositionalPremiseSchema` (`role` required). The fixture's *core* diff premise deliberately lacks `role`.
   Test: `composeArgumentDiff › re-attaches role so a role-less core premise becomes schema-valid` — control asserts the raw core premise fails `PropositionalPremiseSchema`; the composed `.after` and `.before` pass. Verified against the real `core.diffArguments` shape (`toPremiseData()` emits core premises without `role`; `CorePremiseSchema` has no `role` field).

3. **Citation pin-change keys ONLY on the supporting referent.** `citationReferentChanges` compares only `supportingClaimVersion` + `checksum`; the citing-side `claimVersion` is excluded so a citing claim's own head-bump never flips its edges to `modified-within`.
   Test: `composeArgumentDiff — citations › a citing-side claimVersion bump alone is NOT a citation change` (asserts an empty citation diff).

## Notes / concerns

- Runtime-agnostic: no `react`/`next`/`expo`/DB/DOM/`console` in `src/`; inputs are plain arrays/maps the caller supplies.
- Public engine type names carry the repo's ESLint-enforced `T` prefix: `TComposeArgumentDiffInput`, `TDiffCue`, `TDiffRenderMaps` (the plan/spec wrote `ComposeArgumentDiffInput`/`DiffCue`/`DiffRenderMaps`; the lint rule governs). Function names `composeArgumentDiff`/`buildDiffRenderMaps` and the `DiffState`/`entitySetDiff` schema exports match the plan.
- Task 6 (docs-sync + version cut) intentionally NOT done — no changelog/release-notes/version edits, no publish (handled separately).
- No planning-language in shipped code/comments/test titles.
