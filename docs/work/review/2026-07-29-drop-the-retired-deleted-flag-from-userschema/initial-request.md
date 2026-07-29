# Drop the retired deleted flag from UserSchema

Epic: [Account state lifecycle: deactivate, ban, and delete](tcw://W/proposit-app/2026-07-28-account-state-lifecycle-deactivate-ban-and-delete)

The second unplanned slice. The epic's contract step is a server slice — drop
`users.deleted` — but the column cannot go while the wire contract still demands
the field.

## Problem

`UserSchema` (`src/schemas/model/users.ts:89`) declares `deleted: Type.Boolean()`
as a **required** field. Server routes validate outgoing user rows against it
(`createResponse(user, UserSchema)`), so the moment `users.deleted` is dropped,
every route that returns a user fails validation.

The flag is already redundant: `accountState` carries `DELETED`, and the server
has been dual-writing both since the migration slice precisely so this could be
unwound later.

## Proposed fix

Remove `deleted` from `UserSchema`, and from the fixtures that carry it
(`api-client/user/__tests__/*`, `schemas/model/__tests__/account-state-schema.test.ts`).

## Consumer impact

**Nothing reads it.** A repo-wide grep across `proposit-server` and
`proposit-mobile` finds no `.deleted` read on a user object outside test
fixtures and the server's own dual-write, which the paired server slice removes.
Technically a breaking schema change, and the pre-1.0 policy permits it in a
minor; in practice it is dead weight.

## Test cases

- `UserSchema` rejects nothing it previously accepted except the now-absent
  field, and a user object without `deleted` validates.
- `pnpm run check` passes.

## Explicitly out of scope

- **Do not publish, version, or tag.** The epic is holding its release until
  every slice lands.
- The column drop itself and the end of dual-writing — the paired server slice.
