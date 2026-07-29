# Add an api-client method for account deactivation

Epic: [Account state lifecycle: deactivate, ban, and delete](tcw://W/proposit-app/2026-07-28-account-state-lifecycle-deactivate-ban-and-delete)

An unplanned slice. The epic assumed **one** shared publish; this is the
correction, discovered while implementing the server surfaces.

## Product changes

None here. It unblocks the mobile *Deactivate* affordance
([`proposit-mobile/2026-07-28-deactivate-account-and-flattened-sign-in-messaging`](tcw://W/proposit-mobile/2026-07-28-deactivate-account-and-flattened-sign-in-messaging)),
which is where the capability is realized on that node.

## Technical changes

### Problem

v0.52.0 introduced `accountState` but no way to *set* it. The api-client carries
`getCurrentUser`, `modifyCurrentUser` and `deleteUser` only, and mobile deletes
through `apiClient.deleteUser()`
(`proposit-mobile/src/auth/delete-account.ts:20`). Mobile has no sanctioned path
to the deactivation route — every internal API call goes through a factory
method, so there is nothing for its account screen to call.

### The route this wraps

`proposit-server` shipped it in the surfaces slice:

```
PATCH /api/v1/user/me   { "accountState": "deactivated" }   → the updated user
```

`deactivated` is the only accepted value. Self-banning is meaningless,
reactivation happens by signing in, and deletion keeps its `DELETE` verb — so
the request schema is a single literal, not the `AccountStates` union. Anything
else is a 400 from the server, and the schema should make it a compile error
before that.

### Proposed fix

- `DeactivateAccountRequest` in `src/schemas/api/user/index.ts`, beside
  `UserModifyRequest`: `Type.Object({ accountState: Type.Literal(AccountStates.DEACTIVATED) })`.
- `deactivateAccountImpl` in `src/api-client/user/deactivate-account.ts`,
  modelled on `modify-current-user.ts` — `strictFetch`, request schema in,
  `UserSchema` out.
- Register it on the factory as `deactivateAccount`.

Additive only: no existing export changes, so this is a minor with no breaking
change, unlike 0.52.0.

## Consumer impact

`proposit-mobile` gains the method it needs. `proposit-server` is unaffected —
its web surface calls the route through `strictFetch` directly and has no reason
to adopt this.

## Test cases

- Issues `PATCH /api/v1/user/me` with `{accountState: "deactivated"}` and returns
  the parsed user on 200 — mirroring `__tests__/modify-current-user.test.ts`.
- Surfaces a non-2xx as an error result rather than throwing.
- The request type rejects any other `accountState` value at the type level.
- `pnpm run check` passes.

## Explicitly out of scope

- **Do not publish, version, or tag.** Publication is root-coordinated behind
  consumer validation, and the epic is deliberately holding its release until
  every slice has landed. Stop after `outcome.md`.
- No reactivation method: signing in is the only way out of a deactivation, and
  that path already exists.
- No mobile changes.
