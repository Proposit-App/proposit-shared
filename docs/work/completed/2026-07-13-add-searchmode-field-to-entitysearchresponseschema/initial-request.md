# Add searchMode field to EntitySearchResponseSchema

Shared-contract slice of the cross-node epic **Search `searchMode` response
signaling**. The server slice (populate the field from the embedding-vs-fallback
decision + render the degraded-mode banner + declare the capability) is separate
and adopts this after publish.

## Product changes

None directly. Enables a later server slice to signal when entity-search results
came from the SQL literal-match fallback rather than the embedding path.

## Technical changes

In `src/schemas/api/search.ts`, add an **optional** `searchMode` field to
**`EntitySearchResponseSchema` ONLY** (it is already a `Type.Object`, so an
optional field is non-breaking):

```ts
searchMode: Type.Optional(
  Type.Union([Type.Literal("embedding"), Type.Literal("string")])
)
```

- `"embedding"` — results came from the vector/embedding path.
- `"string"` — results came from the SQL-ILIKE literal-match fallback.

Optional (not required) so a server still on the old field-less build, and a
client reading an older server, both validate.

### Explicitly do NOT

- Do **not** touch `ClaimSearchResponseSchema` / `CitationSearchResponseSchema`
  (bare `Type.Array` — they have zero consumers; wrapping them to carry a field
  would be a pure-cost breaking change). Entity schema only.
- A backing `const SEARCH_MODES = [...] as const` is optional; a 2-literal
  inline union is not worth a new export — prefer inline.

### Back-compat / tests

- `EntitySearchResponseSchema` accepts a payload with `searchMode: "embedding"`,
  with `searchMode: "string"`, and with the field **omitted** (all valid).
- A payload with an out-of-union `searchMode` is rejected.

## Meta changes

Append the additive-field note to `docs/release-notes/upcoming.md` and
`docs/changelogs/upcoming.md`. No version bump (bundling onto main before the
next cut).

## Out of scope (other slices)

- Server: populating the field, the UI banner, the capability declaration,
  dropping the followups entry.
- Mobile: unaffected (no search UI / routes).

## Origin

Root cross-node epic
`2026-06-22-search-searchmode-response-signaling-shared-schema-server-consumption`
(see its `spec.md` for the full contract + server/UI behavior).
