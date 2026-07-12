---
date: 2026-07-12
---

# Release notes — upcoming

## Argument diffs now carry every kind of change losslessly

The argument-diff contract (`TArgumentDiff`) was rebuilt so consumers can render
every kind of change from one shape:

- In-place edits — an operator flipped `and` → `or`, a claim reworded — now
  surface as a `modified` entry with a `modified-own` / `modified-within` state,
  instead of disappearing or showing only as a remove-plus-add.
- Conclusion reassignment is reported (`roles.conclusion`).
- When a referenced claim advances, the citing claim and its citation edge are
  marked `modified-within`, so a change to a shared claim is visible everywhere
  it is used.

Two new engine modules let `proposit-server` and `proposit-mobile` share the
diff semantics instead of each reimplementing them:

- `composeArgumentDiff` (`@proposit/shared/engine/diff`) builds the complete
  diff from core's structural diff plus the app's claims and citations.
- `buildDiffRenderMaps` (`@proposit/shared/engine/diff-render`) turns a diff into
  per-entity render cues — `origin` for the single place a change happened,
  `touched` for everything that contains or references it.

Requires `@proposit/proposit-core@^2.5.0`. The diff wire shape changed; server
and mobile pick this up in lockstep.
