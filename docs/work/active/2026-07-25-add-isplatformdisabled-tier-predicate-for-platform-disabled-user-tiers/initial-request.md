# Add isPlatformDisabled(tier) predicate for platform-disabled user tiers

Tags: `tech-debt`

Escalated by `proposit-server` (epic **server-security-posture-hardening**, child
**moderation-state-enforcement-audit**), routed down through the orchestration
root on 2026-07-25.

## Product changes

None. The predicate is a federation of an existing server-local rule; no user
observes a behavior change from this item alone. The consumer-side gating that
_would_ be user-visible (mobile forcing re-auth on a banned/deactivated cached
session) is a separate mobile-node item.

## Technical changes

Platform ban/deactivation is a `users.tier` enum value
(`BANNED = 101`, `DEACTIVATED = 102` in `schemas/model/users.ts`), whose only
runtime effect today is all-zero `UserTierLimits`. The server added a chokepoint
that rejects a banned/deactivated principal (`isPrincipalDisabled` in
`proposit-server/src/model/user.ts`), using a **server-local** predicate:

```ts
tier === UserTiers.BANNED || tier === UserTiers.DEACTIVATED
```

Mobile should gate identically (a banned user must not keep acting on a cached
session), but there is no shared definition of "which tiers are platform-disabled",
so each consumer risks drifting — e.g. someone later treats `NO_ASSIST = 103` as
disabled, which it is **not**; it only withholds AI assist.

Proposed shape — a predicate plus a canonical disabled-tier set alongside
`UserTiers`/`UserTierLimits`:

```ts
export const PLATFORM_DISABLED_TIERS = [UserTiers.BANNED, UserTiers.DEACTIVATED] as const
export function isPlatformDisabled(tier: number): boolean {
    return (PLATFORM_DISABLED_TIERS as readonly number[]).includes(tier)
}
```

The doc comment must state explicitly that `NO_ASSIST` is deliberately excluded —
that exclusion is the whole reason a shared definition is worth having.

## Meta changes

None.

## Consumer impact

- **proposit-server:** repin, then replace the local `isPlatformDisabled` with the
  shared one (single call site in `model/user.ts`). No behavior change. Tracked as
  [the server repin item](tcw://W/proposit-server/2026-07-20-repin-proposit-shared-after-security-escalations-publish-maxlength-caps-isplatformdisabled),
  which is blocked on this item publishing.
- **proposit-mobile:** adopt the predicate to gate a cached/disabled session
  (surface the "account disabled" state and force re-auth / logout). Follow-on
  mobile-node item; this request only provides the shared predicate it consumes.

## Test cases

- `isPlatformDisabled(UserTiers.BANNED) === true`,
  `isPlatformDisabled(UserTiers.DEACTIVATED) === true`.
- `isPlatformDisabled(UserTiers.NO_ASSIST) === false`, and `FREE`, `PREMIUM`,
  `UNVERIFIED` all `false`.

## Urgency

Low. Server enforcement already shipped with the local predicate; nothing is
broken today. This is de-duplication so mobile can consume one definition.
