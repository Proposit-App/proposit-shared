# Lift AI_QUOTA_EXHAUSTED breaker code into @proposit/shared

Surfaced during `proposit-mobile`'s `ai-assisted-argument-creation` work.

## Product changes

None (internal contract). Prevents a class of silent UX regression: a server-side
rename of the quota code would stop the "AI temporarily unavailable" breaker notice
from firing on the clients, with no build-time error.

## Technical changes

The AI-budget breaker's abort code — the literal `"AI_QUOTA_EXHAUSTED"` carried in
a run/stage/task `errorData.code` — is currently duplicated per consumer with no
build-time link:

- `proposit-server` — `src/types/quota.ts` (`AI_QUOTA_ABORT_CODE`).
- `proposit-mobile` — `src/arguments/quota.ts` (`AI_QUOTA_EXHAUSTED`), consumed by
  `isQuotaAbort`.

Lift it into `@proposit/shared` (e.g. alongside the existing `TOKEN_BUDGET_EXCEEDED`
error code in `src/schemas/api/errors.ts`, or a `consts` entry) as the single
source of truth, then have server + mobile import it and drop their local copies.
Additive shared minor; server + mobile repin to adopt.

## Meta changes

None.
