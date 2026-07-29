# Outcome — Introduce accountState and reduce tier to entitlement

Branch `account-state-lifecycle`, since merged to `main`. Unpublished while this
was written — publication is root-coordinated behind the consumer gate — and
released as **v0.53.0** (`c564d41`) once every shared slice had landed.

## What landed

### The pinned interface, verbatim

`@proposit/shared/consts` (`src/consts/account-states.ts`, re-exported from
`src/consts/index.ts`):

```ts
export const AccountStates: {
    readonly ACTIVE: "active"
    readonly DEACTIVATED: "deactivated"
    readonly BANNED: "banned"
    readonly DELETED: "deleted"
}
export const LOCKED_OUT_ACCOUNT_STATES: readonly ["banned", "deleted"]
export function isLockedOut(accountState: string): boolean
```

Confirmed against the built `dist/consts/account-states.d.ts`, not just the
source.

### Where each symbol lives, and why

`AccountStates` is **defined** in `src/schemas/model/users.ts`, next to
`UserTiers`, and **re-exported** from `src/consts/account-states.ts`. The repo's
dependency direction is `consts → schemas` — nothing under `src/schemas/` imports
from `src/consts/` — and defining the const in consts would have inverted it just
to satisfy an import path. The re-export costs one line and makes the pinned
interface resolve from `@proposit/shared/consts` exactly as specified, while
`AccountStates` also stays reachable from `@proposit/shared/schemas`, like
`UserTiers`.

Alongside it in `users.ts`: `AccountStatesSchema`, `AllAccountStates`,
`TAccountStates`, `TAllAccountStates` — the `UserTiers` shape, minus the
`…Builder(options?)` variant. That variant exists only because
`RegistrationInvitationCreateSchema` needs a defaulted tier; nothing needs a
defaulted account state, so it is not there. Add it when something does.

`UserSchema` gains a required `accountState: AllAccountStates`, placed directly
after `tier` so the two axes read together.

### `tier` reduced to entitlement

`BANNED` and `DEACTIVATED` are out of `UserTiers` and `UserTiersSchema`, and
their all-zero rows are out of `UserTierLimits` and `UserTierNames`.

`NO_ASSIST` **keeps `103`**, gap and all. The numbers are persisted server-side;
closing the gap would silently re-map live rows. A test pins this so a future
tidy-up cannot do it by accident.

`UserTierLimits` / `UserTierNames` are typed `Record<UserTierValues, …>`, so the
compiler already enforces "an entry for every tier". The new test adds the other
half — no entry for anything that is *not* a tier — by asserting
`Object.keys(…)` equals the values of `UserTiers` itself. Both directions now
fail loudly.

### `isPlatformDisabled` and `PLATFORM_DISABLED_TIERS` deleted

Removed outright: no alias, no deprecation, no re-point at `accountState`.
`grep -rn` over `src/` finds neither name. `src/consts/__tests__/platform-disabled.test.ts`
is deleted; `src/consts/__tests__/account-states.test.ts` replaces it with the
equivalent coverage test over `Object.keys(AccountStates)`.

`proposit-server` imports the removed predicate at two sites and will not compile
against this until its own work lands. That is the intended forcing function.

## Tests

Written before the implementation; all three files failed for the right reasons
first.

- `src/consts/__tests__/account-states.test.ts` — one case per state, the
  coverage test over `Object.keys(AccountStates)`, the `LOCKED_OUT_ACCOUNT_STATES`
  membership assertion, and an unrecognized-value case. The `DEACTIVATED` case
  carries a comment stating why it must be false.
- `src/consts/__tests__/user-tiers.test.ts` — entitlement-only key set,
  `NO_ASSIST` still `103`, and the limits/names key sets against `UserTiers`.
- `src/schemas/model/__tests__/account-state-schema.test.ts` — each state
  accepted, unknown state and numeric encoding rejected, `accountState` required
  on `UserSchema`, and a removed tier value rejected.

**Red-green verified on the load-bearing assertion.** Adding `DEACTIVATED` back
into `LOCKED_OUT_ACCOUNT_STATES` fails two tests (`does NOT report DEACTIVATED as
locked out` and the membership assertion); reverting restores green. The classification
cannot regress silently.

Two pre-existing api-client fixtures (`delete-user`, `modify-current-user`)
needed an `accountState` — the required field doing its job on the first
consumer inside this repo. Set to `"deleted"` and `"active"` respectively, to
match each fixture's `deleted` flag.

## Gates

- `pnpm run check` — exit 0. 105 test files, 1014 tests, all passing; typecheck,
  prettier, eslint, and the `dist/` build all clean.
- `tcw capabilities check` — `capabilities OK`, exit 0.
- `tcw validate` reports 3 problems, all pre-existing: completed items dated
  2026-06-21, 2026-06-26, and 2026-07-20 carrying discard-flavoured resolutions.
  Untouched by this work.

## Capability

`auth/deactivate-account` (`cap-a7bdf5`) declared in this master, `Status: Missing`,
`Planning doc` pointing at this slug, `Feature: account-management` (matching the
sibling `auth/delete-account`). Body is in the ledger's second-person voice: a
reversible break that delists the account and its arguments and is undone by
signing back in.

Status deliberately **not** flipped — the consumers own that when their surfaces
ship.

**No `capabilities.yaml` sidecar on this item, deliberately.** `Missing` is the
correct terminal status here: `proposit-shared` is the platform-agnostic master,
and a runtime-agnostic library asserts no support of its own — every capability
in this ledger is seeded `Missing` and stays that way. `proposit-server` and
`proposit-mobile` each override it to `Supported` when their surfaces ship. So
the `new:` key belongs on *those* items, not this one: a `new:` entry is a claim
to have realized a capability, and this item only declares and seeds it.

(If a future item here does carry a sidecar, use a bare `auth/…` path — a
`shared/…` prefix makes `tcw work complete` fail closed.)

## Docs

`docs/release-notes/upcoming.md` and `docs/changelogs/upcoming.md` both cover the
added exports, the removed ones, and the two breaking changes. No `pnpm version`,
no rotation of the upcoming files, no tag.

## Deliberately not done

- No deprecated alias for `isPlatformDisabled`. The compile error is the feature.
- `UserSchema.deleted` left in place. The epic expands first and contracts last;
  retiring it belongs to the later server step.
- No consumer changes. Both repos repin after this publishes.

## Open question for the epic owner

The epic `spec.md` heads its section *"Rename, do not redefine"* and says
`isPlatformDisabled` **must be renamed**, while `plan.md` and this slice's brief
say it is **deleted, not re-pointed**. Both prose bodies argue the same thing —
the old name must not survive pointing at inverted behaviour — and acceptance
criterion 14 ("no symbol named `isPlatformDisabled` survives in any repo") is
satisfied either way. Deletion is what shipped, per the plan, which the brief
names as the pinned contract. The spec heading is worth correcting so a later
reader does not go looking for a renamed symbol.

## Fix round 1

Removed the `capabilities.yaml` sidecar. It listed `auth/deactivate-account`
under `new:`, which claims this item realizes the capability — it does not, it
declares and seeds it. `Missing` is the correct terminal status on this node, so
the entry belongs on the consumer slices that flip it to `Supported`, not here.
Removing the only entry emptied the file, so the sidecar is gone rather than left
as an empty mapping.

The capability folder is untouched: `auth/deactivate-account` (`cap-a7bdf5`),
`Status: Missing`, `Planning doc` = this slug, `Feature: account-management`,
body unchanged. The *Capability* section above now states the master-declares /
consumer-flips rule instead of flagging a completion-gate collision.

```
$ git rm docs/work/active/<this-slug>/capabilities.yaml
$ pnpm run check
   Test Files  105 passed (105)
        Tests  1014 passed (1014)
   exit 0
$ tcw capabilities check
capabilities OK
   exit 0
```

Epic `spec.md`'s "Rename, do not redefine" heading was corrected at the root to
"Delete, do not redefine"; the open question recorded above is resolved.
