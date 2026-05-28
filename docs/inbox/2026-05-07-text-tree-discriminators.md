# Expose claim/premise type discriminators on `TTextTreeItem`

**Date:** 2026-05-07
**Requested by:** `proposit-mobile` (sub-project 1I)
**Severity:** small enhancement; no blocker
**Affects:** `@proposit/shared/engine/text-tree`

## Context

Mobile sub-project 1I (per `proposit-mobile/docs/superpowers/specs/2026-05-07-phase-1-1i-citation-derivation-badges-design.md`) renders `CITATION` and `DERIVATION` tags in the read view to surface the v0.10/v0.11 type discriminators (`TClaim.type` and `TPropositionalPremise.type`).

`TTextTreeItem` does not currently expose these fields. Consumers (mobile, and potentially server's web read view) must look up the discriminator from the engine snapshot themselves at render time:

- Claim: `snapshot.claims[claimId]?.type`
- Premise: `snapshot.premises[premiseId]?.premise?.type`

Mobile shipped 1I with a local `TBadgedTextTreeItem` union that wraps `TTextTreeItem` and attaches the discriminator after `buildTextTree`. This works but duplicates information that more naturally belongs in the text-tree row itself.

## Proposed change

In `@proposit/shared/engine/text-tree`, extend `TTextTreeItem`'s `claim` variant with:

```ts
claimType: "normal" | "citation"
```

And the `premise-header` variant with:

```ts
premiseType: "freeform" | "derivation"
```

`buildTextTree` populates both from the snapshot it already walks. No new public API; the existing call signature and behavior are unchanged.

## Cost

- One field added to each of two variant shapes.
- `buildTextTree` does the lookup once per item instead of consumers doing it after-the-fact.
- Source of truth migrates from "consumer-side augmentation" to "library output". Less duplicated logic across consumers.

## Migration impact

- **Server:** if the server's web read view consumes `TTextTreeItem`, no source change needed — adding fields to a union variant is non-breaking on consumers.
- **Mobile:** can drop the local `TBadgedTextTreeItem` union and the `augmentItem` helper in a follow-up cleanup PR after shared publishes the change. (The local union becomes a thin re-export of `TTextTreeItem` until that re-export is also dropped.)

## Recommended versioning

Patch bump on `@proposit/shared` (additive; no public API removed).

## Related

- core v0.10.0 release notes (claim `type` discriminator)
- core v0.11.0 release notes (premise `type` discriminator)
- shared v0.5.0 release notes (mobile-relevant absorption)
- `proposit-mobile/docs/superpowers/specs/2026-05-07-phase-1-1i-citation-derivation-badges-design.md` §7 records this as a follow-on
