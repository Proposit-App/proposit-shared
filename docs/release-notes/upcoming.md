# Release notes — upcoming

This release tightens the argument-ingestion request/task contracts to reject
unknown keys at the trust boundary.

## What changed for consumers

- **Ingestion payloads now reject unknown keys.** The import request body
  (`CreateArgumentSchema`), its per-platform `data` sub-objects (raw_text,
  twitter, reddit, manual), and the internal ingest task-input schema now carry
  `additionalProperties: false`. A payload with the correct known keys still
  validates; one carrying an extra/unexpected key now fails validation instead
  of being silently accepted. Optional fields stay optional.
- **Read-back tightening (action required before adopting).** The same
  per-platform value schemas back `ArgumentSchema.platformData`, so this also
  tightens validation when a stored argument is read back: a persisted
  `platformData` row carrying an incidental extra key will now fail
  `Value.Check`. Before bumping to this version, server and mobile should
  confirm no stored row (or in-flight import body) carries keys outside the
  declared shape. Pre-1.0 breaking-in-minor (semver §4) — pin with caret.
