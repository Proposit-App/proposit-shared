# Outcome — Drop the retired deleted flag from UserSchema

Branch `account-state-api-client`. Not published, not versioned, not tagged.

## What landed

`deleted: Type.Boolean()` removed from `UserSchema`
(`src/schemas/model/users.ts`). `accountState` already carries `DELETED`; the
boolean was the third place account state used to live, and the last one.

Fixtures updated in `api-client/user/__tests__/{modify-current-user,delete-user,deactivate-account}.test.ts`
and `schemas/model/__tests__/account-state-schema.test.ts`.

`delete-user.test.ts` asserted `result.value.deleted === true`. Re-pointed at
`accountState === "deleted"` rather than dropped — it is the same claim about the
same outcome, now made against the field that owns it.

## Why this is a shared slice at all

The epic's contract step is a server slice: drop `users.deleted`. But server
routes validate outgoing user rows against `UserSchema` via `createResponse`, and
the field was **required** — so dropping the column without this would have
failed validation on every route that returns a user. The epic plan did not
record the coupling.

## Consumer impact

Breaking on paper, dead weight in practice: a grep across `proposit-server` and
`proposit-mobile` finds no read of `.deleted` on a user object outside test
fixtures and the server's own dual-write, which the paired server slice removes.

## Gates

- `pnpm run check` — exit 0. 106 test files, 1016 tests; typecheck, prettier,
  eslint and the `dist/` build clean.
