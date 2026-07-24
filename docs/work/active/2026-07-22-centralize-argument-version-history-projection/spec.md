# Specification — Centralize argument version-history projection

## Problem

Both consumers need the same display projection over `TFullArgument.argument`, `argumentHistory`, and `originalArgument`. The server currently owns a local projection while mobile uses the unrelated descendant-forks query. Keeping the projection platform-local permits semantic drift.

## Goals

- Export one runtime-agnostic history projection from `@proposit/shared/schemas/api/argument`.
- Preserve the existing REST and `FullArgumentSchema` contracts.
- Give consumers deterministic row order, identity, source labeling, and publication metadata without mutating responses.

## Non-goals

- No API-client endpoint changes.
- No descendant-fork behavior changes.
- No React, React Native, browser, or Node dependencies.
- No capability or taxonomy delta.

## Proposed contract

`buildArgumentVersionHistory` accepts an object containing the `argument`, `argumentHistory`, and `originalArgument` fields from `TFullArgument` and returns a new array of display rows.

For the viewed argument lineage, identity is the argument ID plus version. The result includes the viewed version even when absent from history, de-duplicates any repeated tuple, and sorts newest-first. If `originalArgument` exists, append it after the current lineage and mark it as the fork source. Do not recursively include the source's history.

The return type must carry what both consumers require: exact argument/version identity, version number, publication state/date fields already present on the source, active-row determination, and fork-source distinction. The design must not invent UI labels or platform types.

## Immutability

The helper returns a new array and does not sort, splice, annotate, or otherwise mutate the input arrays or objects. Tests must freeze or snapshot inputs strongly enough to catch mutation.

## Acceptance criteria

- Viewed row absent from `argumentHistory` is inserted exactly once.
- Viewed row already present is not duplicated.
- Duplicate source tuples collapse deterministically.
- Current-lineage rows are newest-first.
- Optional immediate fork source is last and distinguishable.
- Input objects and arrays are unchanged after projection.
- Existing schema validation and exports remain compatible.

## Documentation Sync

The public export fires the shared public-API/release-note trigger and behavior-affecting changelog trigger. Update `docs/release-notes/upcoming.md` and `docs/changelogs/upcoming.md`. README structure and setup do not change.

## Dependency and delivery

Server and mobile consume the candidate helper. Run the shared checks/build/pack, then validate the tarball in both consumers before requesting publish approval. Do not publish during implementation without the orchestrator's explicit user-approved release step.
