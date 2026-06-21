# Harden ingest schemas with additionalProperties:false (CreateArgumentSchema)

## Product changes

## Technical changes

## Meta changes

# Harden the ingestion request/task `data` sub-schemas with `additionalProperties: false`

## Problem

The TypeBox object schemas that carry the ingestion request/task payload do **not** reject unknown keys. A client (or a future server bug) can send extra properties on these objects and they pass validation silently instead of being caught at the trust boundary.

Surfaced during the Ingestion Pipeline Restructure server review (non-blocking — the shipped UI sends the correct top-level shape, so there is no live impact today). Filing as a follow-up so the contract is tightened deliberately rather than left permissive.

## Affected schemas

- `CreateArgumentSchema` (`src/schemas/api/argument/index.ts`) — the raw-text import request body that now carries the top-level `mode` field. The nested object(s) it composes should reject unknown keys.
- `ArgumentCreateTask.data` (`src/schemas/tasks.ts`) — the persisted task payload that now carries `pipeline`. The `data` object should reject unknown keys so a malformed persisted row is caught on read.

(Confirm the exact set while implementing — any other `Type.Object(...)` in the ingest-argument / task-create path with no `additionalProperties` constraint is in scope.)

## Proposed fix

Add `{ additionalProperties: false }` to the relevant `Type.Object(...)` definitions so unknown keys are rejected by `Value.Check` / `strictFetch` validation. Keep optional fields optional — this only forbids _unknown_ keys, it does not make existing optional fields required.

## Consumer impact

- **Server:** none expected — the route already sends a known, fixed shape. Tightening only rejects payloads that were already malformed.
- **Mobile:** verify the mobile import path (if/when it adopts `mode`) doesn't send incidental extra keys before this ships.
- Pre-1.0 breaking-in-minor: if any consumer is currently relying on extra keys being silently dropped, this is a (desirable) breaking validation change — call it out in the release notes.

## Test cases

- A request/task object with exactly the known keys still validates.
- The same object with one extra unknown key now **fails** `Value.Check` (previously passed).
- An object missing an optional key still validates (optionality unchanged).
