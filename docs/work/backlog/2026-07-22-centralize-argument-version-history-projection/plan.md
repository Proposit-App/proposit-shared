# Implementation plan — Centralize argument version-history projection

## 1. Lock the projection contract with tests

- Add focused tests beside `src/schemas/api/argument/index.ts` (or the repository's established schema/helper test location).
- Construct `TFullArgument` subsets covering: viewed version missing from history, already present, duplicate tuples, out-of-order versions, null/present `originalArgument`, and immutable inputs.
- Assert exact row order and fork-source metadata.

## 2. Implement and export the helper

- Add the display-row type and `buildArgumentVersionHistory` in `src/schemas/api/argument/index.ts` or a narrowly scoped sibling re-exported from that subpath.
- Use argument ID plus version for de-duplication and active identity.
- Copy before ordering and never annotate source objects.
- Keep `FullArgumentSchema`, `TFullArgument`, and API-client behavior unchanged.

## 3. Documentation Sync

- Add a user/consumer-facing entry to `docs/release-notes/upcoming.md` for the public helper.
- Add the developer-facing implementation entry to `docs/changelogs/upcoming.md` with the eventual commit range.
- Do not update README unless implementation unexpectedly changes package structure or import paths beyond the existing subpath.

## 4. Verify and package

- Run `pnpm run check`.
- Run `pnpm run build`.
- Run `pnpm pack` and report the absolute candidate tarball path to the orchestrator.
- Inspect the packed export to confirm consumers can import the helper from `@proposit/shared/schemas/api/argument`.

## 5. Review and handoff

- Participate in the required two-Codex-plus-local-LLM review and resolve verified findings.
- Do not publish. Hand the candidate to server and mobile for consumer validation and wait for explicit publish/version approval.

## Planning boundary

Leave this task in backlog until implementation is explicitly authorized and the root epic is active.
