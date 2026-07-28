# Introduce accountState and reduce tier to entitlement

Epic: [Account state lifecycle: deactivate, ban, and delete](tcw://W/proposit-app/2026-07-28-account-state-lifecycle-deactivate-ban-and-delete)

Slice 1 of 7, and the only unblocked one — five downstream slices consume what
this publishes. **Not blocked by anything.**

Read the epic's `spec.md` and `plan.md` first; they are authoritative and contain
the reasoning this brief only summarizes. In particular read the plan's **"The
interface slice 1 publishes"** section, which pins the exact names, and its
**Global constraints**.

## Problem

`users.tier` carries two unrelated meanings in one column: entitlement
(`UNVERIFIED`/`FREE`/`PREMIUM`/`ENTERPRISE`/`NO_ASSIST`, which drives
`UserTierLimits`) and account state (`BANNED = 101`, `DEACTIVATED = 102`). A
separate `deleted` boolean holds a third state.

Because state and entitlement share the column, entering a state destroys the
entitlement. That is only tolerable if no state is reversible — and bans are
appealable. Unbanning a wrongly-banned `PREMIUM` customer would restore them as
`FREE`, with nothing in the row revealing the error.

## Proposed fix

Introduce the account-state axis in `@proposit/shared` and take the two state
values out of `tier`.

The **exact** shape is pinned in the epic plan and must not be improvised — five
slices are written against these names:

```ts
// @proposit/shared/consts
export const AccountStates = {
    ACTIVE: "active",
    DEACTIVATED: "deactivated",
    BANNED: "banned",
    DELETED: "deleted",
} as const

// The states that refuse authentication. DEACTIVATED is deliberately absent —
// signing in is how a deactivated account comes back.
export const LOCKED_OUT_ACCOUNT_STATES = [
    AccountStates.BANNED,
    AccountStates.DELETED,
] as const

export function isLockedOut(accountState: string): boolean
```

String values, not integers: the column is new so there is no legacy constraint,
and `accountState` is read in queries, logs, and admin payloads where `"banned"`
beats `101`. Integers are the mistake `tier` made.

Also in scope:

- A TypeBox schema for the state, alongside the existing `UserTiers` schema
  patterns in `src/schemas/model/users.ts`, and the field added to `UserSchema`.
- `tier` reduced to entitlement: `BANNED` and `DEACTIVATED` removed from
  `UserTiers`, and their now-meaningless all-zero rows removed from
  `UserTierLimits` / `UserTierNames` in `src/consts/user-tiers.ts`.
- **Delete `isPlatformDisabled` and `PLATFORM_DISABLED_TIERS`** — the exports
  added in v0.51.0 earlier today.

### Why deletion rather than a rename-in-place

`DEACTIVATED` **inverts meaning** under this epic: it currently counts as
disabled, and must stop, because sign-in has to succeed for reactivation to
work. A consumer that repins and keeps compiling against the old name would
silently inherit backwards behaviour. Removing the symbol makes the compiler
find every call site. This is a deliberate breaking change; the repo's pre-1.0
policy permits it in a minor.

## Consumer impact

Breaking, and intentionally so — `proposit-server` currently imports
`isPlatformDisabled` at two sites and will fail to compile until its own slices
land. That is the point. Both consumers repin after this publishes.

## Test cases

- `isLockedOut` is true for `BANNED` and `DELETED`, false for `ACTIVE` and
  **`DEACTIVATED`** — the `DEACTIVATED` case is the one that encodes the whole
  design and must be asserted explicitly, with a comment saying why.
- `LOCKED_OUT_ACCOUNT_STATES` contains exactly `BANNED` and `DELETED`.
- A test over `Object.keys(AccountStates)` fails if a state is added without
  being classified, mirroring the tier-coverage test added in v0.51.0.
- `UserTierLimits` and `UserTierNames` have an entry for every remaining tier and
  no entry for a removed one.
- `pnpm run check` passes.

## Capability changes

**New:** declare `auth/deactivate-account` in this repo's capability master,
seeded `Status: Missing`, with `Planning doc` pointing at this item's slug:

```
tcw capabilities add auth/deactivate-account "Deactivate account" --status Missing
tcw capabilities set auth/deactivate-account --field "Planning doc=<this-slug>"
```

Wording should read as a user story in the ledger's voice — a reversible "take a
break" that hides the user's own arguments and is undone by signing back in. Do
not flip its status; the consumers do that when their surfaces ship.

Record the delta in this item's `capabilities.yaml` sidecar under `new:`. Use a
bare `auth/deactivate-account` path — a `shared/…`-prefixed path makes
`tcw work complete` fail closed.

## Explicitly out of scope

- **Do not publish, version, or tag.** Publication is root-coordinated behind a
  consumer-validation gate. Stop after `outcome.md`.
- No server or mobile changes.
- No migration — this repo has no database.
