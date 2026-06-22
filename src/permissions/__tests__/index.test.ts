import { describe, it, expect } from "vitest"
import { canArgument, canRegistrationInvitation, can } from "../index.js"
import { SystemRoles, ParticipantRoles } from "../../consts/roles.js"

const none = new Set<string>()
const deleter = new Set([SystemRoles.ARGUMENT.DELETE])
const admin = new Set([SystemRoles.ADMIN.FULL_ACCESS])
const inviteGranter = new Set([
    SystemRoles.REGISTRATION_INVITATION.GRANT_OTHERS,
])

describe("canArgument", () => {
    it("admin:full-access allows anything", () => {
        expect(
            canArgument("delete", {
                systemPermissions: admin,
                role: null,
                published: true,
            })
        ).toBe(true)
    })
    it("argument:delete holder can delete a published argument", () => {
        expect(
            canArgument("delete", {
                systemPermissions: deleter,
                role: null,
                published: true,
            })
        ).toBe(true)
    })
    it("non-participant with no system role cannot delete", () => {
        expect(
            canArgument("delete", {
                systemPermissions: none,
                role: null,
                published: false,
            })
        ).toBe(false)
    })
    it("only the owner (not an editor) can delete an unpublished draft", () => {
        expect(
            canArgument("delete", {
                systemPermissions: none,
                role: ParticipantRoles.OWNER,
                published: false,
            })
        ).toBe(true)
        expect(
            canArgument("delete", {
                systemPermissions: none,
                role: ParticipantRoles.EDITOR,
                published: false,
            })
        ).toBe(false)
    })
    it("no one edits or publishes a published argument without admin", () => {
        expect(
            canArgument("update", {
                systemPermissions: none,
                role: ParticipantRoles.OWNER,
                published: true,
            })
        ).toBe(false)
        expect(
            canArgument("publish", {
                systemPermissions: none,
                role: ParticipantRoles.OWNER,
                published: true,
            })
        ).toBe(false)
    })
    it("publish requires participation on an unpublished draft", () => {
        expect(
            canArgument("publish", {
                systemPermissions: none,
                role: null,
                published: false,
            })
        ).toBe(false)
        expect(
            canArgument("publish", {
                systemPermissions: none,
                role: ParticipantRoles.EDITOR,
                published: false,
            })
        ).toBe(true)
    })
    it("anyone reads a published argument; only participants read drafts", () => {
        expect(
            canArgument("read", {
                systemPermissions: none,
                role: null,
                published: true,
            })
        ).toBe(true)
        expect(
            canArgument("read", {
                systemPermissions: none,
                role: null,
                published: false,
            })
        ).toBe(false)
        expect(
            canArgument("read", {
                systemPermissions: none,
                role: ParticipantRoles.EDITOR,
                published: false,
            })
        ).toBe(true)
    })
    it("twitter other_author v0 draft is publicly readable", () => {
        expect(
            canArgument("read", {
                systemPermissions: none,
                role: null,
                published: false,
                platform: "twitter",
                importMode: "other_author",
                version: 0,
            })
        ).toBe(true)
    })
    it("read exception stays closed without the twitter inputs (no throw)", () => {
        expect(
            canArgument("read", {
                systemPermissions: none,
                role: null,
                published: false,
            })
        ).toBe(false)
    })
    it("hide/unhide require the matching system role", () => {
        expect(
            canArgument("hide", {
                systemPermissions: new Set([SystemRoles.ARGUMENT.HIDE]),
                role: null,
                published: true,
            })
        ).toBe(true)
        expect(
            canArgument("hide", {
                systemPermissions: none,
                role: ParticipantRoles.OWNER,
                published: false,
            })
        ).toBe(false)
        expect(
            canArgument("unhide", {
                systemPermissions: new Set([SystemRoles.ARGUMENT.UNHIDE]),
                role: null,
                published: true,
            })
        ).toBe(true)
        expect(
            canArgument("unhide", {
                systemPermissions: none,
                role: ParticipantRoles.OWNER,
                published: false,
            })
        ).toBe(false)
    })
})

describe("canRegistrationInvitation", () => {
    it("grant-others requires the registration-invitation:grant-others role", () => {
        expect(
            canRegistrationInvitation("grant-others", {
                systemPermissions: inviteGranter,
            })
        ).toBe(true)
        expect(
            canRegistrationInvitation("grant-others", {
                systemPermissions: none,
            })
        ).toBe(false)
    })
})

describe("can dispatcher", () => {
    it("routes to the Argument predicate", () => {
        expect(
            can("delete", "Argument", {
                systemPermissions: deleter,
                role: null,
                published: true,
            })
        ).toBe(true)
    })
    it("routes to the RegistrationInvitation predicate", () => {
        expect(
            can("grant-others", "RegistrationInvitation", {
                systemPermissions: inviteGranter,
                role: null,
                published: false,
            })
        ).toBe(true)
        expect(
            can("grant-others", "RegistrationInvitation", {
                systemPermissions: none,
                role: null,
                published: false,
            })
        ).toBe(false)
    })
})
