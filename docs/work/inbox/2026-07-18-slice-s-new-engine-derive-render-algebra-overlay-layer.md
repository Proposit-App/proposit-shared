---
from: .
initiative: 2026-07-18-shared-derived-view-layer-core-barrel-hygiene
---

# Slice S: new engine/derive|render|algebra|overlay layer

Slice of cross-node epic `2026-07-18-shared-derived-view-layer-core-barrel-hygiene`
(root node). Full epic scope + dependency DAG live in the root epic's `spec.md`.
Adopt with `tcw work new --initiative 2026-07-18-shared-derived-view-layer-core-barrel-hygiene`
(NOT `inbox accept`).

## Problem / root cause

Shared exposes the *math* (`buildTextTree`, `skeleton-inference`,
`argument-metrics`) but not the *derivations and render policy* built on top of
it. So `proposit-server` and `proposit-mobile` each re-implemented that layer
independently and are drifting (several mobile files literally comment "mirroring
the web app"). This slice gives the category a canonical home so both clients
consume instead of re-derive.

## Scope (this slice)

New submodules under `@proposit/shared/engine`, exported as narrow subpaths, each
consuming core's post-Slice-C re-exports where relevant:

- `engine/derive/` — counterargument/tab partition, lone-conclusion detection,
  repair-code detection (`REPAIRABLE_CODES` + `detectRepairs`), proof-state
  (partly present via `argument-metrics`).
- `engine/render/` — symbolic-formula rendering + legend, markdown serialization,
  argument→plain-text serialization.
- `engine/algebra/` — changeset merge (`mergeWithAddedModifiedReconciliation`,
  lifted from server `claim.ts`), variable-symbol generator.
- `engine/overlay/` — **platform-neutral overlay / render-map model** (highest
  leverage: shared owns the item model; RN + web supply only presentational
  leaves). This is why mobile hand-rebuilds skeleton overlays today.

Also in this slice (both resolved 2026-07-18):

- **Citation display projection** → **here, in `engine/render`** (not core). Ship
  the pure formatting — `describeSource`, byline parsing, IEEE type humanization —
  as a projection over the IEEE reference schema. Server + mobile currently each
  carry their own copy; server's `citation-display.ts` even has a "lift to
  `@proposit/shared`" TODO. Clients keep only their render shells (server MUI
  component, mobile RN text) and consume this.
- **Naming-convention note** (doc-only, this node's taxonomy): ratify that
  *import = the user-facing capability/verb; ingestion = the internal pipeline
  vocabulary*. **No code rename** — the two terms are a consistent, deliberate
  split. Core retires its outlier "Argument Ingestion" Feature in Slice C.

Keep the module runtime-agnostic (feature-gate any platform global via
`globalThis`, per this repo's discipline). Normalize the two bare
`crypto.randomUUID()` sites to `globalThis.crypto` while here (low-cost nit).

## Consumer impact / ordering

**Depends on Slice C** (core re-exports + published major). **Blocks** server
(SV) and mobile (MV), which repin the post-S release. Publish after the
consumer-side tarball validation gate.

## Test cases

- Golden the derived output the clients currently produce (formula text,
  counterargument partition, repair set, generated variable symbols) and prove
  the new shared functions reproduce them byte-identically — this is the epic's
  correctness bar.
- Subpath exports resolve from both a Node and an RN-style consumer.
- `pnpm run check` green.
