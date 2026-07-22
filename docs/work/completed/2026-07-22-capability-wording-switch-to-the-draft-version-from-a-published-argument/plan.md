# Plan — Capability wording: switch to the draft version

## Pre-stage checks

- [ ] Read `docs/capabilities/arguments/see-version-history/` for the entry
      shape (`meta.yaml` + `description.md`) and match it.

## Implementation

1. `tcw capabilities add arguments/<slug> "<name>" --status Missing`. Never
   hand-create the directory — the CLI owns the format.
2. Fill `description.md` with the platform-neutral sentence and set the
   `Feature:` link to `argument-browse`.
3. `tcw capabilities check`.
4. **Do not run prettier on `docs/capabilities/`** — it inserts a blank line
   after each `##` heading and silently breaks tcw's `**Status:**` parsing.
   The path is in `.prettierignore`; keep it that way.
5. No release-note or changelog entry: this ships no user-visible change on its
   own. The mobile item that realizes it carries the user-facing note.

## Post-stage checks

- [ ] `tcw capabilities check` clean here.
- [ ] `tcw validate` clean across the graph.
- [ ] The entry is visible from mobile via `tcw capabilities show`.
