# Changelog — upcoming

<changes starting-hash="caace51" ending-hash="HEAD">

## Added

**`isReservedUsername(username)` in `consts/identity`.** A reserved-name rule
beside `UsernameValidationRe`, which only ever checked format. Two deliberately
asymmetric rules: `proposit` is refused as a **substring** (the brand is
reserved for internal and staff accounts, so `proposit_staff` and `xpropositx`
go too), while `admin` is refused only as the **whole name** (`administrator_fan`
and `sysadmin` claim to be nobody and stay available). Returns a boolean, not a
reason code — both cases are the same sentence to a user, and widening a boolean
later is easier than unwinding an unused enum. The five existing
`UsernameValidationRe` call sites across server and mobile can adopt it; nothing
in this repo enforces it.

**The `CONTENT_POLICY_VIOLATION` response envelope.**
`ContentPolicyViolationResponseSchema` at
`@proposit/shared/schemas/api/content-policy` — `error` literal plus `message` —
for a write the server refuses because its content violates the content policy.
Answered on **422**, shared with the grammar-tier envelope: both are
"well-formed request, refused on its content", and `parseResponse` separates
them by shape rather than by status (as it already does for the two 409
envelopes). Carries no moderation category names or confidence scores; those are
an internal signal, and putting them on the wire would leak the filter's shape
and freeze server-side tuning behind a client contract.

**`isContentPolicyViolationError` in `api-client`.** Type guard for the above,
keyed on `error` like `isGrammarViolationsError` and `isMutationConflictError`.

## Changed

**`parseResponse` detects the content-policy envelope.** One arm added to the
coded-envelope ladder and to both overload return unions. Without it the schema
and the guard type-check perfectly and the guard is unreachable at runtime — the
body falls through to `ErrorResponseSchema` and throws in the consumer.

## Fixed

**`./schemas/api/content-policy` is declared in the `exports` map.** Not a
regression — a trap avoided. `./schemas/api/…` subpaths are enumerated
individually; only `./ui/*` and `./engine/*` are wildcards. Without its own
entry the module ships inside the tarball and still fails to resolve for
consumers.

</changes>
