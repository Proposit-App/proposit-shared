# Refine add-a-claim-to-a-premise master wording for related-claim + inferred-operator support

Optional, non-blocking follow-up from the completed cross-node epic
`2026-07-18-add-claims-with-relationships-on-mobile-lift-operator-inference-to-proposit-shared`.

The shared-master capability `authoring/add-a-claim-to-a-premise` (cap-1792cc) still
reads "Add a new claim to a premise in an argument you are editing." Both consumers
now support adding a claim **relative to a selected claim, with the joining operator
inferred from structure** (server via `skeleton-overlay`, mobile via the shared
`skeleton-inference`). Refine the master `description.md` to reflect the related-claim
+ inferred-operator ability. Status stays Supported; consumers already broadened.
Low priority — wording only.
