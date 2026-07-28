# Spec — Add `isPlatformDisabled(tier)` predicate for platform-disabled user tiers

Slice 1 of the cross-node epic
`2026-07-28-platform-disabled-account-enforcement-across-shared-server-and-mobile`.
That epic's spec is authoritative where it and `initial-request.md` disagree;
the disagreements are recorded under Notes.

## Capability changes

**None.** This is a runtime-agnostic library addition with no user-observable
behavior: it adds a constant and a pure predicate and changes no existing
export. The capabilities planning gate does not fire, and no capability file is
created or modified (epic acceptance criterion 11).

> **Note (verify stage).** This still describes this slice accurately, but a
> capability file in this repo *was* edited during the same window: `72f5642`
> extends the body of `moderation/remove-an-abusive-user`. That edit is
> **epic-owned** — the epic's plan assigns it to the epic itself rather than to any
> slice — and it is not this item's work. No status was flipped and no capability
> was minted. See `refined-outcome.md`.

## Problem

Platform disablement is a `users.tier` enum value —
`BANNED: 101`, `DEACTIVATED: 102` (`src/schemas/model/users.ts:10-11`) — and this
repo defines no predicate over it. The rule lives once, server-locally, at
`proposit-server/src/model/user.ts:44-46`:

```ts
export function isPlatformDisabled(tier: number): boolean {
    return tier === UserTiers.BANNED || tier === UserTiers.DEACTIVATED
}
```

with two call sites: `proposit-server/src/model/user.ts:65` (over a knex row) and
`proposit-server/src/app/api/v1/auth/mobile-session/refresh/route.ts:48` (over a
`TUser`).

The hazard is not that a second consumer forgets to check. It is the shape of the
numeric block. `NO_ASSIST: 103` (`src/schemas/model/users.ts:12`) sits directly
above `DEACTIVATED: 102`, and it is **not** platform-disabled — it is a normal,
paying tier that withholds AI assist only. Its limits say so explicitly
(`src/consts/user-tiers.ts:59-64`): `maxArguments: 50`,
`maxStatementsPerArg: 25`, `maxCitationsPerArg: 100`, and only
`maxTokensPerMonth: 0` — identical to `FREE` (`:29-34`) except for the token
budget, and unlike `BANNED`/`DEACTIVATED` (`:47-58`), which are all-zero.

So the obvious generalization a reader reaches for — "the 100-block is the
lockout block", `tier > 100` — locks out a paying user. Nothing in the type
system disagrees today, because there is nothing to disagree with. The value of
federating this rule is almost entirely the carve-out, not the two positive
cases.

## Goals

1. `@proposit/shared/consts` owns one definition of which tiers are
   platform-disabled (epic goal 1).
2. The `NO_ASSIST` exclusion is stated in prose at the definition, where a reader
   deciding "can I just write `tier > 100`?" will hit it.
3. `proposit-server` can delete its local copy and repoint both call sites with no
   signature change and no cast (epic child boundary 2).
4. Every tier value is pinned by test, positive and negative.

## Non-goals

- **Absorbing the `deleted` check.** Both server call sites read
  `deleted || isPlatformDisabled(tier)`. `deleted` is a row field, not a tier;
  this predicate takes the tier half only and both call sites keep their own
  `deleted` check (epic non-goal).
- **Consuming the predicate anywhere.** Adoption is slice 2's (`proposit-server`).
  Nothing in this repo calls it.
- **A `proposit-mobile` consumer.** Mobile can never observe
  `tier === 101 | 102` for its own user, so an import there would be dead code;
  the epic forbids a mobile repin (epic non-goal, acceptance criterion 9).
- **Publishing.** Release of `@proposit/shared` is gated on root-coordinated
  consumer validation. This item stops at `outcome.md` — no `pnpm version`, no
  tag, no publish.
- **Generalizing to a tier-capability model.** No "what may tier X do" lookup, no
  policy object. `UserTierLimits` already carries the quantitative half; this adds
  the one boolean the epic needs.
- **Reworking `UserTierNames`/`UserTierLimits`** or the legacy
  `UserTierKeys`/`UserTierValues` names (that rename is separate tracked debt —
  see the file header comment at `src/consts/user-tiers.ts:1-5`).

## Design

Two additions to `src/consts/user-tiers.ts`, already exported wholesale by the
`src/consts/index.ts` barrel (`export * from "./user-tiers.js"`, line 1), so
`@proposit/shared/consts` picks them up with no barrel edit.

```ts
export const PLATFORM_DISABLED_TIERS = [
    UserTiers.BANNED,
    UserTiers.DEACTIVATED,
] as const

export function isPlatformDisabled(tier: number): boolean {
    return (PLATFORM_DISABLED_TIERS as readonly number[]).includes(tier)
}
```

The predicate is derived from the constant rather than repeating the two
comparisons, so the exported set and the exported predicate cannot drift.

### Decision: the parameter is `number`, not `UserTierValues`

`UserTierValues` (`src/consts/user-tiers.ts:10`) resolves to
`0 | 1 | 2 | 3 | 101 | 102 | 103`, and both current server call sites would in
fact satisfy it — `proposit-server/src/types/module-overrides.ts:134` declares
knex's `users` table as `TUserLocal`, whose `tier` is `AllUserTiers`
(`src/schemas/model/users.ts:56`), the same union. Taking `number` anyway:

1. **That union is a declaration, not a parse.** The knex `Tables` augmentation
   asserts what the DB holds; it validates nothing. A row carrying an unknown
   tier — written by a migration, an admin tool, or a newer deployment — types as
   `TAllUserTiers` while being outside it at runtime. A signature that pretends
   this cannot happen is a signature that gets satisfied with a cast at the one
   boundary where a cast is least trustworthy.
2. **`false` is the correct answer for an unknown tier**, and stays correct under
   `number`. The predicate answers "is this one of the two platform-disabled
   states"; an unrecognized value is not. Failing closed on an unknown *principal*
   is a different job, already done by the caller
   (`proposit-server/src/model/user.ts:59,64` return `true` for a missing id or
   missing row). Narrowing the parameter would push that unknown-value case into
   a compile error at some future call site and invite a cast to silence it.
3. **Adoption stays a pure delete-and-repoint.** The server's local predicate is
   already `(tier: number) => boolean`, so slice 2 changes an import and nothing
   else. A narrower signature would buy no safety the union call sites do not
   already have, while risking cast churn in exchange.

The tradeoff accepted: `isPlatformDisabled(999)` compiles instead of erroring.
That is not a defect this predicate exists to catch — it is a stray literal, and
no call site passes a literal.

### Decision: `PLATFORM_DISABLED_TIERS` is exported

Epic acceptance criterion 1 requires both names to be importable from
`@proposit/shared/consts`, so this is settled by the epic rather than open. It is
also independently defensible, which is why it is not being pushed back on:

- It is the datum the predicate is defined over, not an abstraction wrapped
  around it. Exporting the fact costs one `export` keyword and adds no indirection
  or extension point.
- It expresses set arithmetic the predicate cannot. The identified consumer use is
  an allowlist stated as a subtraction ("every tier except the disabled ones"),
  which needs the members, not a boolean.
- It keeps the pair honest: any future tier added to the disabled set is added in
  exactly one place and both exports follow.

No consumer imports it today. That is accepted as a two-line surface with a named
future use, not speculative machinery.

### The doc comment

Load-bearing, and the reason this item exists. It must state that `NO_ASSIST`
(103) is deliberately **not** platform-disabled and that it withholds AI assist
rather than platform access, and it must name the `tier > 100` generalization as
the specific mistake being prevented — a reader who only learns "NO_ASSIST is
excluded" has not been told why the exclusion is fragile.

## Acceptance criteria

1. `import { isPlatformDisabled, PLATFORM_DISABLED_TIERS } from "@proposit/shared/consts"`
   type-checks against this repo's build output; both are declared in
   `src/consts/user-tiers.ts`.
2. `isPlatformDisabled` accepts a `number` and returns `boolean`.
3. `PLATFORM_DISABLED_TIERS` is exactly `[UserTiers.BANNED, UserTiers.DEACTIVATED]`
   and is `readonly` (declared `as const`).
4. A test in `src/consts/__tests__/` asserts, one assertion per tier value:
   `BANNED` → `true`, `DEACTIVATED` → `true`, and `NO_ASSIST`, `UNVERIFIED`,
   `FREE`, `PREMIUM`, `ENTERPRISE` → `false`. All seven members of `UserTiers` are
   covered, and the test fails if a member is added without a decision (asserted
   by comparing the asserted key set to `Object.keys(UserTiers)`).
5. The predicate's doc comment contains the literal token `NO_ASSIST`, states it
   is not platform-disabled, and names the `tier > 100` mistake.
6. No file outside `src/consts/user-tiers.ts`,
   `src/consts/__tests__/platform-disabled.test.ts`, `docs/changelogs/upcoming.md`
   and `docs/release-notes/upcoming.md` changes in the implementation commit — in
   particular `src/consts/index.ts` needs no edit, and no capability file is
   touched.
7. `pnpm run check` passes.
8. The package version is unchanged (`0.50.1`), no tag is created, and nothing is
   published.

## Risks

**The comment rots into a restatement of the code.** "`NO_ASSIST` is excluded" is
visible from the array; the sentence that carries weight is why the exclusion is
easy to get wrong. Mitigated by acceptance criterion 5 pinning the `tier > 100`
mention.

**A future tier lands in the 100-block and nobody revisits the set.** A new
`SUSPENDED: 104` would be silently non-disabled. Mitigated by criterion 4's
key-set assertion: adding a member to `UserTiers` fails the test until someone
states which side it is on.

**The `as readonly number[]` widening cast reads as a smell** and invites someone
to "clean it up" by narrowing the parameter, reversing the decision above without
seeing the reasoning. Mitigated by keeping the reasoning in this spec and the
signature choice explicit; the cast exists only because `.includes` on a
`readonly [101, 102]` tuple rejects a `number` argument.

**Server adoption is not verified by this slice.** Nothing here compiles against
`proposit-server`, so a signature mismatch would surface only in slice 2.
Mitigated by matching the server's existing signature exactly (`number` →
`boolean`), which makes the adoption diff an import swap.

## Notes

- **Where `initial-request.md` and the epic spec differ**, the epic wins:
    - The request says mobile should "gate identically" and describes a follow-on
      mobile item adopting the predicate (`initial-request.md:28-31,56-58`). The
      epic establishes this is unbuildable — `GET /api/v1/user/me` runs
      `getVerifiedUserId`, which resolves a disabled principal to `undefined`, and
      the route 401s, so mobile's user payload can never carry `tier === 101 | 102`
      (epic Risks). Mobile does not adopt the predicate and does not repin.
    - The request describes the server side as "a single call site in
      `model/user.ts`" (`initial-request.md:53`). There are two — the refresh route
      calls it directly at
      `proposit-server/src/app/api/v1/auth/mobile-session/refresh/route.ts:48`.
      Both matter to this spec only as evidence that the `number` signature is the
      no-churn choice.
    - Neither difference changes what this slice builds.
- **This repo's `AGENTS.md` has no `## Documentation Sync` section**, unlike
  `proposit-server`'s. The changelog/release-notes convention is nonetheless
  established practice here (`docs/changelogs/`, `docs/release-notes/`, and the
  versioning instruction at `AGENTS.md:37`), so both `upcoming.md` files are
  updated in the implementation commit. Formalizing the section is out of scope
  and left as an observation.
- The eslint naming-convention rule is disabled file-wide at
  `src/consts/user-tiers.ts:5` for the legacy `UserTierKeys`/`UserTierValues`
  names, so the `SCREAMING_SNAKE_CASE` constant needs no additional suppression.
  `AI_QUOTA_ABORT_CODE` (`src/consts/quota.ts`) is the existing precedent for that
  casing in this directory.
