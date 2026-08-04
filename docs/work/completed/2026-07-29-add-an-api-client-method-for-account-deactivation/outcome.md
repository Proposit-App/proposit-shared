# Outcome — Add an api-client method for account deactivation

Branch `account-state-api-client`, one commit (`c478608`), since merged to
`main`. Unpublished while this was written — the epic held its release until
every slice landed — and shipped in **v0.53.0** (`c564d41`).

## What landed

`apiClient.deactivateAccount()` — `PATCH /api/v1/user/me`, returning the updated
user. Registered on the factory beside `deleteUser`.

`DeactivateAccountRequest` in `src/schemas/api/user/index.ts`:

```ts
Type.Object({ accountState: Type.Literal(AccountStates.DEACTIVATED) })
```

### The method takes no argument, deliberately

The obvious signature is `deactivateAccount(body)` mirroring
`modifyCurrentUser`. It is the wrong one. The route accepts exactly one state,
so there is nothing for a caller to choose, and a signature that accepts a state
is one a caller could pass `banned` or `deleted` to — handing every
authenticated client a moderator's reach if the server-side schema ever slipped.
The literal request schema is the second lock: asking for anything else is a
compile error before it is a 400.

## Tests

Written first; both failed for the right reason (`Property 'deactivateAccount'
does not exist on type 'TApiClient'`).

- Issues `PATCH /api/v1/user/me` with `{accountState: "deactivated"}`, returns
  the parsed user, and asserts `tier` survives the transition — the point of
  splitting state off `tier` in the first place.
- A refused transition surfaces as `ok: false`, not a throw.

## Gates

- `pnpm run check` — exit 0. 106 test files, 1016 tests; typecheck, prettier,
  eslint and the `dist/` build clean.

## What the plan got wrong

Nothing in this slice's own brief. It exists *because* the epic plan was wrong:
it assumed a single shared publish, and the mobile deactivate affordance cannot
be built without this. Recorded on the epic.

## Notes

The error-result test initially sent `{errorMessage}` alone and failed inside
`parseResponse` — `ErrorResponseSchema` requires `errorID`, `errorMessage` and
`statusCode`. Worth knowing when writing any api-client failure test here.
