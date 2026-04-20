export const SystemRoles = {
    REGISTRATION_INVITATION: {
        CREATE: "registration-invitation:create",
        GRANT_OTHERS: "registration-invitation:grant-others",
    },
    ARGUMENT: {
        // For moderation, might need to hide an argument if the content
        // is inappropriate or violates guidelines
        HIDE: "argument:hide",
        UNHIDE: "argument:unhide",
        DELETE: "argument:delete",
    },
    ADMIN: {
        FULL_ACCESS: "admin:full-access",
    },
}

export const SystemRolePresets: Record<string, string[]> = {
    Normal: [],
    Privileged: [SystemRoles.REGISTRATION_INVITATION.CREATE],
    Moderator: [
        SystemRoles.REGISTRATION_INVITATION.CREATE,
        SystemRoles.REGISTRATION_INVITATION.GRANT_OTHERS,
        SystemRoles.ARGUMENT.HIDE,
        SystemRoles.ARGUMENT.UNHIDE,
    ],
    Admin: [
        SystemRoles.REGISTRATION_INVITATION.CREATE,
        SystemRoles.REGISTRATION_INVITATION.GRANT_OTHERS,
        SystemRoles.ARGUMENT.HIDE,
        SystemRoles.ARGUMENT.UNHIDE,
        SystemRoles.ARGUMENT.DELETE,
        SystemRoles.ADMIN.FULL_ACCESS,
    ],
}

export const ParticipantRoles = {
    // All permissions
    OWNER: "owner",
    // Can edit content
    EDITOR: "editor",
    // Can only add suggested edits and comments
    REVIEWER: "reviewer",
}

export type TParticipantRole =
    (typeof ParticipantRoles)[keyof typeof ParticipantRoles]

/**
 * Returns true if the given participant role allows editing argument content.
 * Editing requires the argument to be unpublished and the user to be an owner or editor.
 */
export function canEditArgument(
    role: TParticipantRole | null,
    published: boolean
): boolean {
    if (published) return false
    return role === ParticipantRoles.OWNER || role === ParticipantRoles.EDITOR
}
