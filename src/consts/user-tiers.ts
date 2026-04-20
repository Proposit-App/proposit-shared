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
        maxSourcesPerArg: 0,
        maxTokensPerMonth: 0,
    },
    [UserTiers.FREE]: {
        maxArguments: 50,
        maxStatementsPerArg: 25,
        maxSourcesPerArg: 100,
        maxTokensPerMonth: 10_000,
    },
    [UserTiers.PREMIUM]: {
        maxArguments: 1000,
        maxStatementsPerArg: 50,
        maxSourcesPerArg: 100,
        maxTokensPerMonth: 500_000,
    },
    [UserTiers.ENTERPRISE]: {
        maxArguments: 100_000,
        maxStatementsPerArg: 1_000,
        maxSourcesPerArg: 1_000,
        maxTokensPerMonth: 10_000_000,
    },
    [UserTiers.BANNED]: {
        maxArguments: 0,
        maxStatementsPerArg: 0,
        maxSourcesPerArg: 0,
        maxTokensPerMonth: 0,
    },
    [UserTiers.DEACTIVATED]: {
        maxArguments: 0,
        maxStatementsPerArg: 0,
        maxSourcesPerArg: 0,
        maxTokensPerMonth: 0,
    },
    [UserTiers.NO_ASSIST]: {
        maxArguments: 50,
        maxStatementsPerArg: 25,
        maxSourcesPerArg: 100,
        maxTokensPerMonth: 0,
    },
}
