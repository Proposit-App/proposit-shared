---
date: TBD
---

# Release notes — upcoming

## One shared code for the AI-budget breaker

`AI_QUOTA_ABORT_CODE` (`@proposit/shared/consts`) is now the single source of
truth for the abort code the AI-budget breaker writes into a run/stage/task
`errorData.code` (`"AI_QUOTA_EXHAUSTED"`). Server and mobile import the const
instead of hard-coding the string, so the produce and detect sides can never
drift.

## Filter the argument catalog by status

`getAllArguments` accepts an optional `status` filter
(`unpublished` | `published` | `archived`), passed through on the request query.
It is additive and back-compatible — existing callers that omit it get the same
results as before.

## Stored claim reactions survive an evolving reason-code set

The read schema for a claim reaction's `reasonCode` now tolerates a value that
has fallen out of the closed reason-code union: instead of failing the response
(or dropping the field), such a value is carried through as a raw string. Writes
are unchanged — creating a reaction still requires a known reason code. For
consumers, the read `reasonCode` type widens to `string`.
