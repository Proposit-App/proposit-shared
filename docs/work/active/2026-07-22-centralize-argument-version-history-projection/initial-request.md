# Centralize argument version-history projection

## Product changes

No capability delta. This task supports the existing `arguments/see-version-history` and `arguments/see-what-changed-between-versions` capabilities without changing their wording or `Supported` status.

## Technical changes

Export `buildArgumentVersionHistory` from `@proposit/shared/schemas/api/argument`. It accepts the `argument`, `argumentHistory`, and `originalArgument` fields from `TFullArgument` and returns a new display-ready array that:

- includes every accessible version exactly once, including the viewed version;
- orders the current argument's versions newest-first;
- appends the immediate fork source after the current lineage when present;
- carries the identity and publication metadata consumers need for display and exact navigation;
- never mutates the API response.

Keep the REST and `FullArgumentSchema` contracts unchanged. Add unit tests covering a viewed row absent from/present in history, duplicate elimination, ordering, optional fork source, and input immutability. Update shared release notes and changelog for the new public helper. Run `pnpm run check`, build, and pack during implementation.

## Meta changes

- Initiative: `2026-07-22-restore-argument-version-history-parity-across-web-and-mobile`.
- The helper is an implementation dependency for the server and mobile child tasks.
- Candidate publication requires validation in both consumers and later explicit user approval.
- Planning only: do not start or implement this task in this pass.

