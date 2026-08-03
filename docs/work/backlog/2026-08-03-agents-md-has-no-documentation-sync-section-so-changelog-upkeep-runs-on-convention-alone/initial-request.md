# `AGENTS.md` has no Documentation Sync section

## Problem

`proposit-shared/AGENTS.md` has no `## Documentation Sync` section. It is the
only active repo in the workspace without one — `proposit-core`,
`proposit-server`, and `proposit-mobile` all declare one.

The consequence is not that docs go unwritten; `docs/changelogs/` and
`docs/release-notes/` hold an entry per version back to 0.10.0. It is that every
one of those entries exists because whoever was working remembered, with no
declared trigger to evaluate and nothing to be wrong about. The
`documentation-sync` skill's first instruction is to read the section from
`CLAUDE.md`; here it finds nothing and each session re-derives the convention
from the neighbouring files.

Surfaced while completing
`2026-07-24-flaky-suite-debounced-review-store-save-rejects-after-test-env-teardown`
on 2026-08-03, whose plan had to state the trigger evaluation from scratch.

## Proposed fix (sketch)

Add a `## Documentation Sync` section to `AGENTS.md` (`CLAUDE.md` is a symlink
to it). `proposit-core/AGENTS.md` is the model for the shape. Entries this repo
plausibly needs, to be confirmed while writing them:

- `docs/changelogs/upcoming.md` `[Any-Code-Change]` — developer changelog,
  technical, grouped Added/Changed/Fixed
- `docs/release-notes/upcoming.md` `[Any-Code-Change]` — consumer-facing, prose,
  with the `## Repinning` note the recent versions all carry
- `README.md` `[Public-API]` — the exported surface per sub-entry
- `AGENTS.md` `[Routing]` — the repo-scope and ownership lists, when a new
  ownership boundary or invariant appears

Worth deciding at the same time whether a new `exports` subpath deserves its own
named trigger, given the "declares `types`, `import`, AND `default`" rule that
already lives in this file's Key design rules and is easy to half-apply.

## Test cases

Not code — verified by inspection:

- `documentation-sync` invoked in this repo finds a section and evaluates it,
  rather than asking whether to add one.
- Every file named in the section exists.
- The triggers are the ones a reader of the last few changelogs would infer.

## Notes

Deferred out of the flaky-suite item at its acceptance on 2026-08-03.
