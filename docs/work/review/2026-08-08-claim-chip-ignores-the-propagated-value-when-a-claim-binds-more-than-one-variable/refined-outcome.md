# Refined outcome — accepted

Accepted at the publish window for `@proposit/shared` v0.65.1.

## Decision

Accepted as delivered, including the two extensions beyond the reported symptom:
resolving across every bound variable at **both** read sites (the propagated chip
and the usage-based default carried the same latent defect), and reporting a
claim asserted both ways on `TReviewOverlay.conflictedClaimIds` rather than
letting an ordering pick a side.

## Evidence

- `pnpm run check` on merged `main` (`1de1c52`): **1202 passed across 124
  files**, plus typecheck, lint and build.
- **The pending browser check is done.** `/view/019fbb25-deee-7347-9350-8a0dedc1cea5/2`
  driven against the local server with the 0.65.1 tarball installed: the
  conclusion claim — the one bound to two variables — now reads
  `Unknown → True`, agreeing with the header's `True` / `Reaches its conclusion`.
  That is the reported defect: the propagated half was previously unresolved
  because the lowest variable id won and carried no value. Checked in both
  colour schemes; the chip is legible on either ground.

## Deferred follow-ups

- **`getVariableIdForClaim`** in `@proposit/proposit-core` has the same
  singular-by-construction contract. No consumer calls it, so it was raised, not
  changed: `docs/work/inbox/2026-08-08-getvariableidforclaim-returns-one-variable-for-a-claim-that-binds-several.md`
  at the workspace root.

## Closeout

- Shipped in v0.65.1, folded into this publish window with the explainer slice —
  unrelated changes, one release.
- Capabilities: none declared; the fix corrects an existing surface rather than
  adding one.
