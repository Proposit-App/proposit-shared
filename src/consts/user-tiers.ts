// Inherited from proposit-server where legacy type names (UserTierKeys,
// UserTierValues) predate the brain-style T-prefix convention. Renaming
// them cascades through every server consumer; tracked as tech debt to
// address in a dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import { UserTiers } from "../schemas/model/index.js"
import type { TUserTierLimits, TUserTiers } from "../schemas/model/users.js"

type UserTierKeys = keyof TUserTiers
export type UserTierValues = TUserTiers[UserTierKeys]

export const UserTierNames: Record<UserTierValues, string> = {
    [UserTiers.UNVERIFIED]: "Unverified",
    [UserTiers.FREE]: "Free",
    [UserTiers.PREMIUM]: "Premium",
    [UserTiers.ENTERPRISE]: "Enterprise",
    [UserTiers.BANNED]: "Banned",
    [UserTiers.DEACTIVATED]: "Deactivated",
    [UserTiers.NO_ASSIST]: "No AI Assist",
}

export const UserTierLimits: Record<UserTierValues, TUserTierLimits> = {
    [UserTiers.UNVERIFIED]: {
        maxArguments: 0,
        maxStatementsPerArg: 0,
        maxCitationsPerArg: 0,
        maxTokensPerMonth: 0,
    },
    [UserTiers.FREE]: {
        maxArguments: 50,
        maxStatementsPerArg: 25,
        maxCitationsPerArg: 100,
        maxTokensPerMonth: 10_000,
    },
    [UserTiers.PREMIUM]: {
        maxArguments: 1000,
        maxStatementsPerArg: 50,
        maxCitationsPerArg: 100,
        maxTokensPerMonth: 500_000,
    },
    [UserTiers.ENTERPRISE]: {
        maxArguments: 100_000,
        maxStatementsPerArg: 1_000,
        maxCitationsPerArg: 1_000,
        maxTokensPerMonth: 10_000_000,
    },
    [UserTiers.BANNED]: {
        maxArguments: 0,
        maxStatementsPerArg: 0,
        maxCitationsPerArg: 0,
        maxTokensPerMonth: 0,
    },
    [UserTiers.DEACTIVATED]: {
        maxArguments: 0,
        maxStatementsPerArg: 0,
        maxCitationsPerArg: 0,
        maxTokensPerMonth: 0,
    },
    [UserTiers.NO_ASSIST]: {
        maxArguments: 50,
        maxStatementsPerArg: 25,
        maxCitationsPerArg: 100,
        maxTokensPerMonth: 0,
    },
}

/**
 * The tiers that lock a user out of the platform entirely. Canonical set — do
 * not restate it as inline comparisons.
 */
export const PLATFORM_DISABLED_TIERS = [
    UserTiers.BANNED,
    UserTiers.DEACTIVATED,
] as const

/**
 * Is `tier` one of the platform-disabled states — i.e. locked out of the
 * platform, not merely limited within it?
 *
 * `NO_ASSIST` (103) is deliberately **NOT** platform-disabled. It withholds AI
 * assist only (`maxTokensPerMonth: 0`), not platform access: its
 * `maxArguments` / `maxStatementsPerArg` / `maxCitationsPerArg` limits match
 * `FREE`, and users on it are paying, active accounts.
 *
 * That carve-out is the reason this predicate is shared rather than written
 * inline. `NO_ASSIST` sits directly above `DEACTIVATED` (102) in the same
 * numeric block, so the natural shorthand for "the lockout block" —
 * `tier > 100` — is wrong, and locks out a paying user. Call this instead;
 * never compare against the tier number directly.
 *
 * Takes a `number` rather than the narrower `UserTierValues` on purpose: tier
 * values reaching this check often come straight off a database row, where the
 * declared type is an assertion about the column rather than a validated parse.
 * An unrecognized tier is correctly not platform-disabled; failing closed on an
 * unknown *principal* is the caller's job, not this predicate's.
 */
export function isPlatformDisabled(tier: number): boolean {
    return (PLATFORM_DISABLED_TIERS as readonly number[]).includes(tier)
}
