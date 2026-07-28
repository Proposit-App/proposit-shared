# Plan — Introduce accountState and reduce tier to entitlement

Small, self-contained slice: two source files, one test file, one capability.
Tests first per step, then the code that satisfies them.

## Where each symbol lives

The repo's existing dependency direction is `consts → schemas`; nothing under
`src/schemas/` imports from `src/consts/`. Keep it that way.

- `src/schemas/model/users.ts` — `AccountStates` (the const object), its TypeBox
  schema, the derived union, and the `UserSchema` field. This mirrors `UserTiers`,
  which already lives here rather than in `consts/`.
- `src/consts/account-states.ts` — `LOCKED_OUT_ACCOUNT_STATES`, `isLockedOut`,
  and a re-export of `AccountStates`, so the whole pinned interface resolves from
  `@proposit/shared/consts` as the epic plan specifies. It also stays reachable
  from `@proposit/shared/schemas`, exactly like `UserTiers`.

Skipping the `…Builder(options?)` variant that `AllUserTiers` has — that exists
only because `RegistrationInvitationCreateSchema` needs a `default`. Nothing
needs a defaulted account state. Add it when something does.

## Steps

### 1. `AccountStates` and its schema

`src/schemas/model/users.ts`:

```ts
export const AccountStates = { ACTIVE: "active", DEACTIVATED: "deactivated",
    BANNED: "banned", DELETED: "deleted" } as const
export const AccountStatesSchema = Type.Object({ /* one Type.Literal per value */ })
export type TAccountStates = Static<typeof AccountStatesSchema>
export const AllAccountStates = Type.Index(AccountStatesSchema, Type.KeyOf(AccountStatesSchema))
export type TAllAccountStates = Static<typeof AllAccountStates>
```

Then `UserSchema` gains `accountState: AllAccountStates`, placed next to `tier`
so the two axes read together.

**Check:** a schema test compiles each of the four values against
`AllAccountStates` and rejects an unknown one.

### 2. The lockout predicate

New `src/consts/account-states.ts`, exported from `src/consts/index.ts`.

`LOCKED_OUT_ACCOUNT_STATES = [BANNED, DELETED] as const`, and

```ts
export function isLockedOut(accountState: string): boolean {
    return (LOCKED_OUT_ACCOUNT_STATES as readonly string[]).includes(accountState)
}
```

The doc comment carries the reasoning `isPlatformDisabled`'s carried: why
`DEACTIVATED` is absent (sign-in is the reactivation path), and why the parameter
is a `string` (values arrive off database rows, and an unknown value failing open
here is the caller's problem to close).

**Check:** `src/consts/__tests__/account-states.test.ts` — one `it` per state,
the `DEACTIVATED` case commented with why it must be false, plus a coverage test
asserting the classified names equal `Object.keys(AccountStates)`.

### 3. Reduce `tier` to entitlement

Remove `BANNED` and `DEACTIVATED` from `UserTiers` and `UserTiersSchema`, and
their all-zero rows from `UserTierLimits` and `UserTierNames`.

**`NO_ASSIST` stays `103`.** The numbers are persisted; closing the gap would
re-map live rows.

**Check:** a test asserting `Object.keys(UserTierLimits)` and
`Object.keys(UserTierNames)` each equal the values of `UserTiers` — which fails
both for a leftover removed key and for a future tier added without limits.

### 4. Delete `isPlatformDisabled` and `PLATFORM_DISABLED_TIERS`

Delete both symbols from `src/consts/user-tiers.ts` and delete
`src/consts/__tests__/platform-disabled.test.ts`. No alias, no deprecation,
no re-point. `grep -rn` over `src/` confirms neither name survives.

### 5. Capability + docs

```
tcw capabilities add auth/deactivate-account "Deactivate account" --status Missing
tcw capabilities set auth/deactivate-account --field "Planning doc=<this-slug>"
```

Body in the ledger's user-story voice: a reversible break that makes the account
and its arguments unavailable and is undone by signing back in.

`capabilities.yaml` sidecar records it under `new:` with a bare
`auth/deactivate-account` path — a `shared/…` prefix makes `tcw work complete`
fail closed.

`docs/release-notes/upcoming.md` and `docs/changelogs/upcoming.md` get the added
and removed exports. **No `pnpm version`, no tag, no publish.**

### 6. Gate

`pnpm run check`, then `tcw capabilities check`, then `outcome.md`.

## What could go wrong

- **Reflexively keeping a deprecated alias for `isPlatformDisabled`.** The whole
  value of the deletion is the compile error it causes in `proposit-server`.
- **Renumbering `NO_ASSIST` to close the 101/102 gap.** Silently re-maps live
  rows; the gap is correct.
- **Making `accountState` optional to spare consumers.** It would defeat the
  compiler's job of finding every site that must supply it.
