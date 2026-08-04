# Spec — Introduce accountState and reduce tier to entitlement

Epic: [Account state lifecycle: deactivate, ban, and delete](tcw://W/proposit-app/2026-07-28-account-state-lifecycle-deactivate-ban-and-delete)

The epic's `spec.md` and `plan.md` are authoritative. This spec covers only what
lands in `proposit-shared`: the vocabulary five downstream slices compile
against. No consumer changes, no migration, no publish.

## Problem

`users.tier` carries two unrelated meanings in one column. Entitlement
(`UNVERIFIED`/`FREE`/`PREMIUM`/`ENTERPRISE`/`NO_ASSIST`) drives `UserTierLimits`;
account state (`BANNED = 101`, `DEACTIVATED = 102`) drives lockout. Entering a
state therefore destroys the entitlement, which is only tolerable while no state
is reversible — and the epic makes bans appealable. Unbanning a wrongly-banned
`PREMIUM` customer would restore them as `FREE`, with nothing in the row
revealing the loss.

This repo owns the shared vocabulary, so the split starts here.

## Requirements

### 1. The account-state axis

`@proposit/shared/consts` publishes exactly the interface the epic plan pins:

```ts
export const AccountStates = {
    ACTIVE: "active",
    DEACTIVATED: "deactivated",
    BANNED: "banned",
    DELETED: "deleted",
} as const

export const LOCKED_OUT_ACCOUNT_STATES = [
    AccountStates.BANNED,
    AccountStates.DELETED,
] as const

export function isLockedOut(accountState: string): boolean
```

String values, not integers. The column is new so there is no legacy constraint,
and `accountState` is read in queries, logs, and admin payloads where `"banned"`
beats `101`.

`DEACTIVATED` is deliberately **not** locked out: signing in is how a deactivated
account comes back. That single fact is what the whole state axis exists to
express, and it is what `isPlatformDisabled` had backwards.

`isLockedOut` takes a `string`, not the narrow union, for the same reason
`isPlatformDisabled` took a `number`: values reaching it come off a database row,
where the declared type is an assertion rather than a validated parse. An
unrecognized value is correctly not locked out — failing closed on an unknown
principal is the caller's job.

### 2. A TypeBox schema for the state, and the field on `UserSchema`

`src/schemas/model/users.ts` gains an `AccountStates` schema following the
existing `UserTiers` shape (a literal-keyed object plus an indexed union), and
`UserSchema` gains a required `accountState` field.

### 3. `tier` reduced to entitlement

`BANNED` and `DEACTIVATED` leave `UserTiers` and `UserTiersSchema`, and their
all-zero rows leave `UserTierLimits` and `UserTierNames`.

`NO_ASSIST` keeps the value `103`. The numbers are persisted in a live column;
closing the gap left by 101/102 would silently re-map every existing row.

### 4. `isPlatformDisabled` and `PLATFORM_DISABLED_TIERS` are deleted

Not deprecated, not aliased, not re-pointed at `accountState`. `DEACTIVATED`
inverts meaning under this epic — it currently counts as disabled and must stop.
A consumer that repins and keeps compiling against the old name would silently
inherit backwards behaviour. Removing the symbols makes the compiler find every
call site.

The tier-coverage test that shipped with those symbols is replaced by an
equivalent over `AccountStates`.

## Out of scope

- Publishing, versioning, tagging. Root-coordinated behind a consumer gate.
- Any server or mobile change. `proposit-server` will fail to compile against
  this until its own slices land; that is the intended forcing function.
- Removing `UserSchema.deleted`. The epic expands first and contracts last —
  `deleted` stays correct for readers until its own slice retires it.
- Flipping the new capability's status. Consumers do that when their surfaces
  ship.

## Capability changes

**New — `auth/deactivate-account`**, seeded `Status: Missing`, `Planning doc`
pointing at this item. A reversible "take a break": the account and its arguments
become unavailable, and signing back in undoes it. Declared in this master before
either consumer overrides it, per the federation rule.

No capability is removed and no status regresses.

## Acceptance criteria

1. `AccountStates`, `LOCKED_OUT_ACCOUNT_STATES`, and `isLockedOut` are exported
   from `@proposit/shared/consts` with exactly the names and signature above.
2. `isLockedOut` is true for `BANNED` and `DELETED`, and false for `ACTIVE` and
   `DEACTIVATED`. The `DEACTIVATED` case is asserted explicitly with a comment
   stating why, because it is the assertion the design turns on.
3. `LOCKED_OUT_ACCOUNT_STATES` contains exactly `BANNED` and `DELETED`.
4. A test over `Object.keys(AccountStates)` fails if a state is added without
   being classified on one side of the line.
5. `UserSchema` has an `accountState` field validating against the four states.
6. `UserTiers` admits neither `BANNED` nor `DEACTIVATED`; `NO_ASSIST` is still
   `103`.
7. `UserTierLimits` and `UserTierNames` have an entry for every remaining tier
   and no entry for a removed one, asserted against `UserTiers` itself.
8. No symbol named `isPlatformDisabled` or `PLATFORM_DISABLED_TIERS` survives in
   `src/`.
9. `pnpm run check` passes.
10. `tcw capabilities check` passes.

## Risks

**A downstream slice diverging on a name.** Five slices are written against the
pinned interface. Refining the implementation is allowed; changing a name or a
signature is not this slice's call.

**Deleting exports that shipped this morning.** v0.51.0 published
`isPlatformDisabled`, and `proposit-server` imports it at two sites. Removing it
breaks that build until slice 3 lands. That is the point, and the pre-1.0 policy
permits a breaking change in a minor — but it means shared must not be published
until the root's consumer gate is run deliberately rather than as routine.
