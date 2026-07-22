# Spec — Capability wording: switch to the draft version

Compressed: ledger-only change, one entry, no code.

## Capability changes

**New** master entry, `docs/capabilities/arguments/`:

- **Name:** Switch to the draft version of a published argument
- **Status:** `Missing` (shared declares wording; consumers declare delivery)
- **Feature:** `argument-browse` — matches the neighbouring
  `see-version-history` and `fork-into-a-new-draft` entries, which describe the
  same "move around an argument's lineage" surface.
- **Description:** one sentence, user-facing, platform-neutral. It must not name
  a screen, a control, or a gesture — consumers differ, and the master is the
  wording they federate from.

Related existing entries, unchanged: `arguments/see-version-history`,
`arguments/fork-into-a-new-draft`.

## Acceptance

1. `tcw capabilities check` passes in this repo.
2. The entry resolves from `proposit-mobile` (which federates via
   `tcw capabilities extends shared`), so the mobile item can override its
   status.
3. Wording is platform-neutral — readable as true of the web app too.
4. No code, no schema, no version bump.
