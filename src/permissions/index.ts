import {
    SystemRoles,
    ParticipantRoles,
    type TParticipantRole,
} from "../consts/roles.js"

export type TAction =
    | "create"
    | "read"
    | "update"
    | "delete"
    | "hide"
    | "unhide"
    | "publish"
    | "grant-others"

export type TSubject = "Argument" | "RegistrationInvitation"

export interface TArgumentPermissionContext {
    /** The caller's globally-granted permission ids (from the systemRoles table). */
    systemPermissions: Set<string>
    /** The caller's relationship to this argument, or null if none. */
    role: TParticipantRole | null
    /** The argument's published state. */
    published: boolean
    /** Argument origin, for the read exception below. */
    platform?: string
    /** Import mode, unpacked from the argument's platformData. */
    importMode?: string
    /** Argument version, for the read exception below. */
    version?: number
}

export function canArgument(
    action: TAction,
    ctx: TArgumentPermissionContext
): boolean {
    if (ctx.systemPermissions.has(SystemRoles.ADMIN.FULL_ACCESS)) return true

    const isParticipant = ctx.role !== null
    const editable = !ctx.published && isParticipant

    switch (action) {
        case "read":
            if (ctx.published || isParticipant) return true
            // An unpublished argument imported from someone else's X post (and
            // not yet claimed/published by them) is publicly readable.
            return (
                ctx.platform === "twitter" &&
                ctx.importMode === "other_author" &&
                ctx.version === 0
            )
        case "create":
        case "update":
        case "publish":
            return editable
        case "delete":
            // Hard-delete is destructive, so it is OWNER-only among
            // participants — an EDITOR can edit a draft but not destroy it.
            return (
                (!ctx.published && ctx.role === ParticipantRoles.OWNER) ||
                ctx.systemPermissions.has(SystemRoles.ARGUMENT.DELETE)
            )
        case "hide":
            return ctx.systemPermissions.has(SystemRoles.ARGUMENT.HIDE)
        case "unhide":
            return ctx.systemPermissions.has(SystemRoles.ARGUMENT.UNHIDE)
        default:
            return false
    }
}

export function canRegistrationInvitation(
    action: TAction,
    ctx: { systemPermissions: Set<string> }
): boolean {
    if (ctx.systemPermissions.has(SystemRoles.ADMIN.FULL_ACCESS)) return true

    switch (action) {
        case "create":
            return ctx.systemPermissions.has(
                SystemRoles.REGISTRATION_INVITATION.CREATE
            )
        case "grant-others":
            return ctx.systemPermissions.has(
                SystemRoles.REGISTRATION_INVITATION.GRANT_OTHERS
            )
        default:
            return false
    }
}

export function can(
    action: TAction,
    subject: TSubject,
    ctx: TArgumentPermissionContext
): boolean {
    switch (subject) {
        case "Argument":
            return canArgument(action, ctx)
        case "RegistrationInvitation":
            return canRegistrationInvitation(action, ctx)
        default:
            return false
    }
}
