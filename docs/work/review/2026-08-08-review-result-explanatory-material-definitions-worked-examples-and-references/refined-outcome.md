# Refined outcome — accepted

Accepted at the publish window for `@proposit/shared` v0.65.1.

## Decision

Accepted as delivered — the explainer module as first cut in v0.61.0, plus every
follow-up the item absorbed while its client slices were being built: the
worked-example framing copy (v0.61.1), the tenth entry and the single concept
(v0.62.0), the two review passes (v0.63.0, v0.64.0), the fourth path (v0.65.0),
and the coded 4xx envelope in `parseResponse` (v0.65.1).

The v0.65.1 fix is worth naming: it is the third instance of a coded-envelope
shape the response normalizer did not recognise, and the two earlier near-copies
were collapsed into one `??` chain over a `coded(status, envelope)` helper, so
the fourth is a one-line branch. An audit of `src/api-client/**` in the same pass
found two further latent instances (409 `already_exists`, 402
`TOKEN_BUDGET_EXCEEDED`), both now detected and both pinned by tests that drive
real `Response` objects rather than schemas.

## Evidence

- `pnpm run check` on merged `main` (`1de1c52`): **1202 passed across 124
  files**, plus typecheck, lint and build.
- The material is rendered by both client slices of the same epic, each verified
  on its own surface — the server results stage in a real browser in both colour
  schemes, mobile in the simulator in both schemes.

## Deferred follow-ups

- **The "no review yet" 404 itself.** A reader with no review is an empty state;
  `200 { review: null }` would model it without every client having to know that
  one 404 is not a failure. The contract belongs to the server and the web app
  depends on it, so this was raised, not acted on.

## Closeout

- Shipped across v0.61.0–v0.65.1; no further cut for this item.
- Capabilities: the five entries under `reviews/results/` stay `Missing` in the
  shared master, which is the federation convention here — the nodes that ship
  the surface carry the `Supported` override, and the server and mobile slices
  did exactly that.
