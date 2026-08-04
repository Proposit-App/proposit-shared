---
from: proposit-app
initiative: 2026-08-03-dedicated-reader-for-large-origin-documents
---

# Shared size rule and origin run-building for the large-document reader

Epic: [Dedicated reader for large origin documents](tcw://W/proposit-app/2026-08-03-dedicated-reader-for-large-origin-documents)

## Problem

A source text of any real length is unreadable on both clients. On the web the
whole document renders as one paragraph in the 400px sidebar — measured at
44,474px tall for a 98,159-character document with 21 traced passages inside it.
On mobile it clamps at 600 characters and then expands into the screen's own
scroll.

The fix is a size-aware split on both clients: short texts stay embedded, long
ones open in a dedicated full-screen reader. This slice is the **foundation**
both clients build on. It ships no UI.

## What this slice owns

### 1. One size rule, shared

An exported constant plus a predicate deciding whether a source text is
"large". Today the two clients disagree: mobile has a local
`CLAMP_THRESHOLD = 600` characters (`proposit-mobile/src/arguments/origin-source-panel.tsx:18`),
the web has no threshold at all. The requester's opening proposal is **~300
words** — a starting number, not a requirement.

The **unit is this slice's call**, made once: words or characters, decided here
and consumed by both clients. Sanity-check the number against real seeded
arguments rather than accepting 300 on faith; the wrong number either sends
short documents into a modal or leaves 5,000-word ones inline. Whatever it is,
it must be trivially changeable — one constant, not a rule spread across call
sites.

### 2. Origin run-building moves into shared

Move `buildOriginRuns` and `anchorsForTarget` from
`proposit-server/src/app/view/[argumentId]/[version]/util/origin-view-model.ts:46-119`
into `@proposit/shared/engine/render`.

Both are pure functions over a `TProjectReactiveSnapshot` with no React and no
MUI in them, and `originPassage` already crosses this boundary in the other
direction (`origin-view-model.ts:6` re-exports it from
`@proposit/shared/engine/render`). Mobile cannot highlight or sequence traced
passages without them, and duplicating ~50 lines of code-point-offset merging
into a second repo is what both consumers' `AGENTS.md` explicitly forbid.

Carry the behavior intact — it is subtle and already correct:

- Overlapping anchor spans **merge** rather than nest; a claim used in two
  premises is anchored at both of its expressions, so this is the common case.
- Offsets are **code-point** offsets, sliced with `sliceByCodePoints`; a UTF-16
  slice cuts astral characters in half.
- Out-of-range anchors are filtered by the same predicate on both functions, so
  a cue can never be produced for a highlight no passage can match.

`TOriginRun` moves with them.

### 3. Capability master

The platform-agnostic master lives here and is federated into both consumers.

**Reword** `arguments/see-the-original-source-text` (`cap-5ac273`). Its body
says "alongside the argument itself", which describes the sidebar embedding. It
must describe the size-aware split: short texts inline, long ones in a reader.
**The status stays `Supported` on both consumers** — this is a UX improvement to
a capability that already exists, not a regression and not a re-declaration.

**Add**, seeded `Missing`, `Feature=argument-browse` (matching the two existing
origin-reading capabilities):

- `arguments/step-through-traced-passages` — "Step through the passages an
  argument traces to". Distinct from `arguments/see-where-content-came-from`
  (`cap-4b057c`), which is the per-item pairing; this is walking the anchored
  passages as a sequence inside the document.
- `arguments/find-text-in-the-source-text` — "Find text in the source text".
  Nothing covers searching within a document today.

Record the `capabilities.yaml` sidecar with `new:` / `changed:` lists. Run
contradiction detection against the standing ledger before writing.

## Out of scope

- Any UI. The readers are separate slices in `proposit-server` and
  `proposit-mobile`.
- Changing how origin data is stored, anchored, or ingested.
- `proposit-core` — nothing there moves.

## Acceptance criteria

1. Both consumers can import the size rule from `@proposit/shared`; the value
   and unit are defined in exactly one place.
2. `buildOriginRuns` and `anchorsForTarget` have exactly one definition in the
   workspace. A grep across all four repos returns one.
3. The moved functions' existing behavior is covered by tests in this repo:
   overlapping spans merge into one flat run, an astral character is not split,
   and an out-of-range anchor is filtered from both functions identically.
4. `arguments/step-through-traced-passages` and
   `arguments/find-text-in-the-source-text` exist in the master, seeded
   `Missing`, with `Feature=argument-browse` and a `Planning doc` pointer.
5. `arguments/see-the-original-source-text`'s description covers the split and
   its status is untouched.
6. `tcw capabilities check` and `pnpm run check` both pass.

## Publish

This slice ends at a published `@proposit/shared` version, and the publish is
**coordinated at the workspace root** — do not publish from here.

When the code is ready: build a tarball, and report ready. The root validates it
against both consumers, merges, tags `v{version}`, and the user publishes
(NPM MFA cannot be done by an agent). Remove any `*.tgz` from the package root
before the publish step — a stray tarball makes `pnpm publish` fail with
`EUSAGE`.

`proposit-mobile` is blocked on this publish; `proposit-server` is not.

## References

- `proposit-server/src/app/view/[argumentId]/[version]/util/origin-view-model.ts`
  — the functions being moved, and the existing `originPassage` re-export that
  shows the shape of the boundary.
- `proposit-mobile/src/arguments/origin-source-panel.tsx:17-18` — the local
  threshold this rule supersedes.
- `proposit-server/src/app/view/[argumentId]/[version]/components/controls/origin-section.tsx:282-309`
  — the web surface with no threshold at all.
