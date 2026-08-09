# Refined outcome — accepted

Accepted at the publish window for `@proposit/shared` v0.65.1.

## Decision

Accepted as delivered, including the two follow-ups the item absorbed after it
entered review: v0.60.1 (the duplicated operator-decision identity rule, found by
driving the web app) and v0.60.2 (the decision target now reaches the record).

## Evidence

- `pnpm run check` on merged `main` (`1de1c52`): **1202 passed across 124
  files**, plus typecheck, lint and build.
- The consumer slices that were red by construction while this landed are all
  green and closing in this same window: server two-axis persistence and the
  premise-header control row, mobile client parity.
- `blocked` now round-trips: `proposit-server` shipped the
  `argumentReviews_phase_check` change, so the state is no longer client-local.

## Deferred follow-ups

- **A rejection of the conclusion premise still does nothing.** Core never
  strikes the conclusion premise, but the operator queue offers a decision on one
  that has a decidable operator. Deliberately out of scope; unchanged.
- **`createReview` seeds `expressionId: null`** server-side, so a review's
  initial rows carry no decision target even though the wizard's updates now do.
  Server-side, routed separately.

## Closeout

- Shipped across v0.60.0–v0.60.2 and folded forward into the v0.65.1 publish.
- Capabilities: none declared by this item; the review-results entries it feeds
  are flipped by the server and mobile slices that render them.
