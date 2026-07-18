# new engine derive/render/algebra/overlay layer

Slice S of cross-node epic `2026-07-18-shared-derived-view-layer-core-barrel-hygiene`.

## Problem / root cause

Shared exposes the *math* (`buildTextTree`, `skeleton-inference`, `argument-metrics`)
but not the *derivations and render policy* built on top of it. So `proposit-server`
and `proposit-mobile` each re-implemented that layer independently and are drifting
(several mobile files literally comment "mirroring the web app"). This slice gives the
category a canonical home so both clients consume instead of re-derive.

## Product changes

None user-facing directly; enables server + mobile to consume one canonical derived-view
layer instead of drifting re-implementations.

## Technical changes

New `@proposit/shared/engine/*` submodules (narrow subpaths), each a pure, runtime-agnostic
projection/derivation consuming core 3.0.0 re-exports where relevant:

- `engine/derive/` — counterargument/tab partition, lone-conclusion detection,
  repair-code detection (`REPAIRABLE_CODES` + `detectRepairs`). Proof-state already lives in
  `engine/argument-metrics` — reuse, don't duplicate.
- `engine/render/` — symbolic-formula rendering + legend, markdown serialization,
  argument→plain-text serialization, AND citation display projection (`describeSource`,
  byline parsing, IEEE reference-type humanization).
- `engine/algebra/` — changeset merge (`mergeWithAddedModifiedReconciliation`, lifted from
  server `src/model/claim.ts`), variable-symbol generator (`nextVariableSymbol`).
- `engine/overlay/` — platform-neutral overlay / render-map item model.

Correctness bar: BYTE-IDENTICAL derived output vs the existing canonical (server) impls,
locked by golden fixtures that SV/MV reuse to prove their swap is safe.

## Meta changes

- Bump core peerDependency to `^3.0.0`; install core 3.0.0 publish-candidate tarball as devDep.
- Taxonomy note (doc-only): ratify *import = user-facing verb; ingestion = internal pipeline
  vocabulary*. No code rename.
- Normalize two bare `crypto.randomUUID()` sites to `globalThis.crypto`.
- `pnpm version minor` (0.43.0 → 0.44.0), rotate release-notes/changelog upcoming → v0.44.0,
  tag `v0.44.0`, pack tarball. No publish / no push (orchestrator-gated).
