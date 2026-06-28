# Claim schema decoupling — version-as-trunk, originArgumentId, published state, expose ClaimForkSchema

## Product changes

No user-facing UX this round (the picker / "newer version available" prompt / fork
alerts are explicitly deferred in the epic spec). The product capability — "Claims
are first-class, independently-versioned entities that can be referenced across
multiple arguments" (backend) — is owned and worded at the **orchestrator product
layer** and realized jointly by proposit-server (API + model) and proposit-shared
(schemas). This shared slice carries only the type/shape contract; it does not
itself add a user-observable behavior, so no per-node capability is declared here.
Product-layer wording is coordinated by the orchestrator and is non-blocking.

## Technical changes

`@proposit/shared` owns the `ClaimSchema` contract, so the decoupling type/shape
changes land here first (the server slice depends on these types):

- `version` documented/typed as the claim's **own trunk version** (independent of
  any argument version) — no longer a denormalized argument version.
- `argumentId` → nullable `originArgumentId` (provenance only; a shared claim is no
  longer owned by one argument). Renames the field on `ClaimSharedFieldsSchema`,
  which flows to all three variant schemas + derived types.
- Add `published` (boolean) + `publishedOn` (nullable timestamp) — per-claim-version
  publish state — to `ClaimSharedFieldsSchema`.
- Re-export the already-defined `ClaimForkSchema` / `TClaimFork`
  (`src/schemas/model/forks.ts`) through the package index so consumers can import
  the claim-fork provenance type (parallels the existing `ArgumentForkSchema`
  re-export through `model/arguments.ts`).

Runtime-agnostic; no DOM/Node APIs; relative imports end in `.js`.

## Meta changes

Breaking schema change → **minor** bump per shared's pre-1.0 policy
(`^0.x` consumers expect `0.x+1.0` may break). Rotate
`docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md` to the new version.
Release is **gated on consumer-side validation** (orchestrator coordinates the
shared → validate → server sequence) — do **not** `pnpm publish`, tag, or push.
Item stays `active` after implementation; it is not truly complete until
published + validated.

# Original assignment (inbox doc)

# Claim schema decoupling — version-as-trunk, originArgumentId, published state, expose ClaimForkSchema

**Slice 1 of the cross-node epic** `independently-versioned-claims-publish-propagation-forking-searchability`. Full design (read first): `/Users/brian/Projects/Proposit-App/docs/work/backlog/2026-06-23-independently-versioned-claims-publish-propagation-forking-searchability/spec.md`. This slice is the schema/type half; the server slice depends on it.

## Why

Claims are becoming first-class, independently-versioned entities shared by reference across arguments (today `claims.version` mirrors the _argument_ version). `@proposit/shared` owns the `ClaimSchema` contract, so the type/shape changes land here first.

## Scope

In `src/schemas/model/claims.ts` (and package exports):

- **`version`** — document/type as the claim's _own_ trunk version (independent of argument version). No longer a denormalized argument version.
- **`argumentId` → nullable `originArgumentId`** — provenance only; a shared claim is no longer owned by one argument.
- **Add `published` (bool) + `publishedOn` (nullable)** — per-claim-version publish state.
- **Re-export `ClaimForkSchema`** (`src/schemas/model/forks.ts`) from the package index — it exists but isn't exported.

## Notes

- This is a **breaking** schema change → **minor** bump per shared's pre-1.0 policy (`^0.x` consumers expect `0.x+1.0` may break). Offer the version bump on completion.
- The full publish/fork/search behavior lives in the **server** slice — shared only carries the contract.
- Release is **gated on consumer-side validation** (see `ORCHESTRATOR-AGENTS.md`); don't `pnpm publish` solo — the orchestrator coordinates the shared→validate→server sequence.

## Next step for this node

Run process-inbox → `tcw work new --initiative 2026-06-23-independently-versioned-claims-publish-propagation-forking-searchability` to adopt the slice, then write `spec.md`/`plan.md` in the work-item folder (invoke `writing-plans` for the bite-sized plan).
