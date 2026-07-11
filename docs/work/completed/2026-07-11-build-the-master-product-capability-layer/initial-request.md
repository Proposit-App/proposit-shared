---
from: .
initiative: 2026-07-11-federate-a-master-capability-layer-in-proposit-shared
---

# Build the master product-capability layer

Slice 1 of the cross-node epic that federates a platform-agnostic master
product-capability layer into `@proposit/shared`, which `proposit-server` and
`proposit-mobile` later `extends` and override per-platform.

## What this slice delivers

Declare, once in this node, the canonical roster of platform-agnostic product
capabilities — every entry `Status: Missing` (a library makes no runtime support
claim). Each capability carries a concise, platform-neutral description
synthesized from the server + mobile source wording, a `Planning doc`
back-pointer to this slice, and a taxonomy `Feature`/`Subject` link where a clean
match already exists in this node's taxonomy.

The roster is final and authoritative in the epic's `mapping.md`; build exactly
the master rows it lists across the five namespaces (`arguments/`, `authoring/`,
`reviews/`, `auth/`, `profile/`). The minted ids are the override targets the
downstream server and mobile slices need.

## Pointers

- Epic spec: `docs/work/backlog/2026-07-11-federate-a-master-capability-layer-in-proposit-shared/spec.md` (workspace root)
- Epic plan: `.../plan.md`
- Roster: `.../mapping.md`
