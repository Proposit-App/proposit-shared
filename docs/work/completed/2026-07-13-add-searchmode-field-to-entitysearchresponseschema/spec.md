# Spec

See `initial-request.md` for the full problem statement and scope. One-field
additive change.

**Acceptance:**

- `EntitySearchResponseSchema` gains an optional `searchMode`
  (`Type.Union([Type.Literal("embedding"), Type.Literal("string")])`). Payloads
  with `searchMode: "embedding"`, `searchMode: "string"`, or the field omitted
  all validate; an out-of-union value is rejected.
- `ClaimSearchResponseSchema` / `CitationSearchResponseSchema` untouched.
