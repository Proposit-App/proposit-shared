# proposit-shared — Server UI Improvements wave 2: assign-axiom mutation + api-client

**Origin:** Orchestrator session 2026-05-19. Wave 2 of the cross-repo `server-ui-improvements` initiative (workspace-root spec at `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-05-19-server-ui-improvements-overview.md`). The user approved Path A on the architect's Q5: ship the full assign-axiom path including a coordinated `@proposit/shared` minor version. This cycle is the shared side of that coordination; the server side (S3) consumes after this publishes.

**Status:** Ready for `proposit-shared-dev`. Branch `wave-2-axiom-mutation` cut from current `proposit-shared/main` (`174e3f9`, version 0.11.1) at the start of the cycle.

## Capability changes

Shared has no `capabilities.md` files (per the capabilities-SDLC skill's two-layer model — shared is the library layer, not the user-facing layer; capability docs live in consuming repos). The user-facing capability flips for this cycle happen on the server side post-consume. **This cycle's planning-gate notation is therefore null** — surface-level documentation lives in shared's changelog + release notes.

## Operating posture

Standard `<repo>-dev` baseline — assume, don't re-state:

- `superpowers:using-superpowers` at session start.
- `superpowers:test-driven-development` — failing test before any implementation code.
- `superpowers:systematic-debugging` before proposing fixes.
- `superpowers:verification-before-completion` before claiming done.
- `brain-style` (TypeScript sub-skill) for any new identifiers; LSP for type verification.
- `documentation-sync` at end of cycle — release-notes + changelog updates.
- `pnpm run check` MUST be green before reporting done (shared's standard pre-commit gate).

## Scope (per the S3 spec at `proposit-server/docs/superpowers/specs/2026-05-19-server-ui-improvements-s3-claim-details-proof-state-design.md`)

Read the **S3 spec** before starting. It's authored on the server side but documents the shared-side contract precisely. Sections most relevant to you: the `## Capability changes` table; the cross-repo coordination table; the architect's resolution of Q5 (assign-axiom mutation helper) and the locked signature for `populateDerivationFromAxiom`.

### Item 1 — New mutation helper `populateDerivationFromAxiom`

Location: `src/engine/mutations/claims.ts` (or `derivation.ts` if the codebase has a dedicated file — survey first).

Signature (locked by architect, per S3 spec scope item 11):

```typescript
populateDerivationFromAxiom(
  engine: ArgumentEngine,
  derivationPremiseId: string,
  axiomaticClaim: TAxiomaticClaim
): ProjectMutationResult
```

Behavior:

- Inserts the `axiomaticClaim` as the antecedent of the named derivation premise.
- Mirrors the `populateDerivationFromCitations` composition pattern — `clearDerivationAntecedent` first to guarantee an empty antecedent slot, then bind the axiomatic claim as the single antecedent variable.
- Returns the standard `ProjectMutationResult` shape (changeset + post-state snapshot).
- Idempotent: calling on a derivation premise already carrying the same axiomatic claim is a no-op.

Test coverage (per S3 spec — minimum):

1. **Happy path:** empty derivation premise → axiomatic claim becomes antecedent; root expression matches the engine's standard `IMPLIES(<axiom_var>, <Q>)` shape; engine validation passes.
2. **Replacing existing antecedent:** derivation with a citation-backed antecedent → axiom replaces (existing antecedent cleared first, axiom inserted; resulting changeset includes the clear + the add).
3. **Idempotent:** same axiom already assigned → no-op (changeset is empty or only the clear-and-re-add cycle, depending on engine semantics; spec the choice).

Add to `src/engine/mutations/index.ts`'s re-exports if that's the canonical surface.

### Item 2 — New api-client method `createClaimAxiomImpl`

Location: `src/api-client/argument/claims.ts` (or wherever `createClaimImpl` lives — survey first).

Signature (locked by architect):

```typescript
createClaimAxiomImpl: (args: {
    argumentId: string
    version: number
    claimId: string
    axiom: TAxiomaticClaim
}) => Promise<TAxiomAssignmentResponse>
```

Implementation:

- Uses `strictFetch` per the project's internal-API-client rules.
- Target: `POST /api/v1/argument/[argumentId]/[version]/claims/[claimId]/axiom`. The server-side route handler is in S3's scope (server-dev cycle); this api-client method is the shared-side contract.
- Request schema: new `AxiomAssignmentRequestSchema` in `src/schemas/api/claims.ts` (or wherever the claim request schemas live — survey).
- Response schema: new `AxiomAssignmentResponseSchema` matching the locked shape `{ axiomClaim, derivationPremise }` per S3 spec.

Register in `src/api-client/factory.ts`'s `impls` object if that's the canonical wiring point.

Test coverage (per S3 spec — minimum):

1. **Happy path:** POST with valid axiomatic claim → returns parsed `{ axiomClaim, derivationPremise }`.
2. **Schema validation:** missing required field → `strictFetch` throws appropriately.
3. **Wire-format compat:** response shape passes TypeBox validation.

### Item 3 — Schemas

Two new schemas in `src/schemas/api/claims.ts` (or sibling — match precedent):

- `AxiomAssignmentRequestSchema` — `{ axiom: TAxiomaticClaim }` (claimId + arg coordinates are URL params).
- `AxiomAssignmentResponseSchema` — `{ axiomClaim: TClaim, derivationPremise: TPremise }`.

Both must round-trip cleanly: `Value.Check`, `Value.Cast` work, derived TS types match the api-client signature.

### Item 4 — Version bump + publish prep

- Bump `package.json` from `0.11.1` to **`0.12.0`** (minor bump — new mutation helper + new api-client method are additive features, not breaking changes).
- Rename `docs/release-notes/upcoming.md` → `docs/release-notes/v0.12.0.md` (user-facing wording: "Adds the assign-axiom mutation helper and api-client method consumed by the upcoming claim-justification UI in the server's argument view.").
- Rename `docs/changelogs/upcoming.md` → `docs/changelogs/v0.12.0.md` (dev-facing detail: helper signature, api-client method, schemas, test coverage). Start fresh `upcoming.md` files for subsequent work.
- Create the version-bump commit (`chore: cut 0.12.0`) per repo convention.
- Tag: do NOT create the `v0.12.0` git tag in this cycle — that's an orchestrator coordination step after reviewer Green.
- Do NOT run `pnpm publish` — orchestrator publishes after merge to main + tag.

## Commit structure

Recommended (TDD-driven):

- Commit 1 — schemas + types (failing test for the new helper).
- Commit 2 — `populateDerivationFromAxiom` implementation passes the failing test; idempotency + replace-existing tests added.
- Commit 3 — `createClaimAxiomImpl` api-client method + schema-validation tests.
- Commit 4 — release-notes + changelog + version-bump (`pnpm version minor` produces this commit; you may rename it post-`version` to match repo convention).

Adjust per discovery. Each commit must leave `pnpm run check` green if practical (or at least the final SHA on the branch must).

## Coordination (orchestrator-managed)

The S3 server slice depends on `@proposit/shared@0.12.0` being published. The orchestrator handles the publish + tag + dep-flip checkpoint after this cycle's reviewer Green. **Do not push** your branch or publish; the orchestrator does that.

## Return shape

≤500 word summary covering:

1. **Branch + final commit SHA range** (`174e3f9..<final-sha>`).
2. **Files touched** — schemas, mutation helper, api-client, tests, release-notes, changelog, package.json.
3. **`pnpm run check` outcome** — test counts, lint, typecheck, build status.
4. **Surprises / deviations from this briefing** — anything you encountered that required a judgment call.
5. **Behavioral notes for review** — anything the reviewer should focus on (idempotency semantics, wire-format gotchas, schema validation edge cases).

## What NOT to do

- Don't push the branch.
- Don't tag.
- Don't publish to npm.
- Don't touch propositional-table writes or any other unrelated engine surface.
- Don't bump to `0.12.1` or anything else — `0.12.0` is the canonical minor for this cycle.

## References

- **S3 spec (canonical contract):** `/Users/brian/Projects/Proposit-App/proposit-server/docs/superpowers/specs/2026-05-19-server-ui-improvements-s3-claim-details-proof-state-design.md`
- **S3 spec dual-review synthesis:** `/Users/brian/Projects/Proposit-App/docs/reviews/proposit-server/2026-05-19-a2d00b85-s3-spec.md`
- **Initiative overview:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-05-19-server-ui-improvements-overview.md`
- **Recent shared-cycle precedent:** `proposit-shared/docs/superpowers/briefings/grammar-tiers-shared-agenda.md` (different scope, same shape) — for tonal precedent on briefing style + commit shape.
- **`@proposit/proposit-core@1.0.x` engine mutation surface** — `populateDerivationFromCitations` is the closest existing helper. Mirror its composition pattern; consult its tests for shape precedent.
