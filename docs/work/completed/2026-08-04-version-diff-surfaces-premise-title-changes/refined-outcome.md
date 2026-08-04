# Verification: Version diff surfaces premise title changes

**Accepted** 2026-08-04.

Found by verifying the curated republish end to end rather than by inspection:
after a title-only v0 → v1 republish the diff endpoint returned every array
empty while the database held different titles at both versions.

Fixed in the layer that owns the field — `title` is application-level display
text, deliberately outside the engine's premise checksum, so core cannot supply
this comparison. The checksum config was not touched.

`pnpm run check` green: 118 test files, 1165 tests at the time of this slice.
Seven tests cover the title-only case, the merge case (one entry, never two),
the `modified-within` → `modified-own` promotion, `null`/`""`/absent
equivalence, and continued derivation-premise exclusion.
