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
- No planning-language in shipped code/comments/test titles.

## Finalize round (post-review)

Commit `95109c8` (items 1–2) + the docs commit below. `pnpm run check` exits 0 (696 tests).

1. **Premise fallback hardened.** The silent `?? m.before`/`?? m.after` (and added/removed) fallbacks that emitted an identity-only, schema-invalid premise on a missing id are replaced by `requirePremise`, which throws naming the missing id and the array it should be in (`premisesBefore`/`premisesAfter`). Derivation premises are filtered before the lookup, so they never trigger it. Test: `throws when a core-referenced premise is missing from the supplied arrays` (asserts `toThrow(/pX/)`).

2. **Variable passthrough — NO FIX NEEDED (confirmed).** Root cause of the premise bug is core's `PremiseEngine.toPremiseData()` narrowing to the core premise type (`role` is not a core field). Variables do not have this problem: `PremiseEngine.getVariables()` returns `sortedCopyById(this.variables.toArray())` — copies of the stored variable objects, app-level fields intact — and the existing server passes `coreDiff.variables` straight to the wire in production. Added one confirming test: `passes core variables through as schema-valid app-level variables` (feeds an app-level `PropositionalVariable` through `coreDiff.variables.modified` and asserts the composed `.after` passes `Value.Check(PropositionalVariableSchema, …)`). The composition does not touch variable objects, so validity is the caller's responsibility, same as expressions.

3. **Documentation sync done.** `docs/changelogs/upcoming.md` — developer entry for the enriched `TArgumentDiff`, `composeArgumentDiff`, `buildDiffRenderMaps`, and the core `^2.5.0` bump, with commit range `8adea7d..95109c8`. `docs/release-notes/upcoming.md` — user-facing note (in-place edits, conclusion reassignment, and citation version changes now render; two shared engine modules). No public-API reference doc exists in this repo (README "What's in it" is a coarse sub-entry list, already stale, and does not enumerate functions/schemas), and `package.json` `exports` already covers `./engine/*` via wildcard — so nothing else to update. No version bump / publish.
