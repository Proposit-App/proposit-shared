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
    [UserTiers.NO_ASSIST]: "No AI Assist",
}

export const UserTierLimits: Record<UserTierValues, TUserTierLimits> = {
    [UserTiers.UNVERIFIED]: {
        maxArguments: 0,
        maxStatementsPerArg: 0,
        maxCitationsPerArg: 0,
        maxTokensPerMonth: 0,
        maxSourceTextChars: 0,
        maxStoredSourceTextChars: 0,
    },
    [UserTiers.FREE]: {
        maxArguments: 50,
        maxStatementsPerArg: 25,
        maxCitationsPerArg: 100,
        maxTokensPerMonth: 10_000,
        maxSourceTextChars: 20_000,
        maxStoredSourceTextChars: 200_000,
    },
    [UserTiers.PREMIUM]: {
        maxArguments: 1000,
        maxStatementsPerArg: 50,
        maxCitationsPerArg: 100,
        maxTokensPerMonth: 500_000,
        maxSourceTextChars: 100_000,
        maxStoredSourceTextChars: 5_000_000,
    },
    [UserTiers.ENTERPRISE]: {
        maxArguments: 100_000,
        maxStatementsPerArg: 1_000,
        maxCitationsPerArg: 1_000,
        maxTokensPerMonth: 10_000_000,
        maxSourceTextChars: 500_000,
        maxStoredSourceTextChars: 100_000_000,
    },
    [UserTiers.NO_ASSIST]: {
        maxArguments: 50,
        maxStatementsPerArg: 25,
        maxCitationsPerArg: 100,
        maxTokensPerMonth: 0,
        maxSourceTextChars: 20_000,
        maxStoredSourceTextChars: 200_000,
    },
}
