---
from: proposit-app
---

# Broaden the see-what-changed-between-versions capability wording to the four-state change model

> Escalated by `proposit-server` on 2026-07-12; routed here by the orchestrator on 2026-08-12. Original entry title: *capability wording see what changed between versions*.

The shared master `arguments/see-what-changed-between-versions` wording is thinner
than what the server now ships ("added, modified, removed claims and premises").
The version-comparison view now renders a four-state cue model; please broaden the
master wording to match (non-blocking — the server capability
`argument-view/see-diffs-against-another-argument-version` already carries the
richer in-repo wording).

Proposed broadened wording:

> Comparing two versions highlights not only added, removed, and modified claims
> and premises, but also **where** each change originated versus what it
> **affected**: an in-place operator edit or a conclusion reassignment shows at
> its origin, and a shared claim edited in one place is highlighted on every
> premise that references it. Deleted operands inside a surviving formula and a
> premise's own retitle are shown too.

Vocabulary: **origin** (`modified-own`, the single place a change happened) vs
**touched** (`modified-within`, a container/referrer of that change).

