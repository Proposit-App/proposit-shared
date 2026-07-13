# Spec

See `initial-request.md` for the full problem statement and scope.

**Decision (scope):** ship the optional `status` filter only
(`unpublished | published | archived`). Author/topic/tag attribute filters are
deferred — no server handler applies them yet, and every param must stay
optional/back-compatible, so adding unused ones now is premature. They can be
appended to `GetAllArgumentsParams` later without a breaking change.

**Acceptance:**

- `GetAllArgumentsParams` gains an optional `status` field typed to the three
  buckets. Existing callers that omit it typecheck and behave unchanged.
- When `status` is provided, `getAllArguments` serializes it into the request
  query string (`?...&status=<value>`); when omitted it is absent from the URL.
