---
from: .
---

# Broaden the see-what-changed-between-versions capability wording to the four-state cue model

Capability-wording change to the shared product master. Originally escalated by
`proposit-server`; routed here by the orchestrator because the master lives in
this repo. **Non-blocking** — the server already carries the richer in-repo
wording on its own capability
`argument-view/see-diffs-against-another-argument-version`.

## Problem

The shared master wording for `arguments/see-what-changed-between-versions`
(`cap-12c639`) is thinner than what the server now ships. Current master
description:

> Compare two versions of an argument and see what changed, with added,
> modified, and removed claims and premises marked inline.

That describes a three-state model (added / modified / removed). The server's
version-comparison view now renders a **four-state cue model** that also
distinguishes where a change *originated* from what it *affected*.

## Proposed wording

> Comparing two versions highlights not only added, removed, and modified claims
> and premises, but also **where** each change originated versus what it
> **affected**: an in-place operator edit or a conclusion reassignment shows at
> its origin, and a shared claim edited in one place is highlighted on every
> premise that references it. Deleted operands inside a surviving formula and a
> premise's own retitle are shown too.

## Vocabulary

The distinction may warrant registered taxonomy terms:

- **origin** (`modified-own`) — the single place a change happened.
- **touched** (`modified-within`) — a container or referrer of that change.

Check `tcw taxonomy` before adopting; if these are new cross-repo terms, declare
them here so both consumers inherit consistent language.

## Consumer impact

- `proposit-server` — already ships the behavior; its override should reconcile
  against the broadened master wording.
- `proposit-mobile` — ships version-comparison too (`see-what-changed-between-versions`
  is `Status: Supported` there). Confirm the broadened wording still matches what
  mobile renders; if mobile's diff cues are narrower, its override needs its own
  wording rather than silently inheriting a promise it doesn't keep.
