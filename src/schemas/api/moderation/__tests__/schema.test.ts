import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"

import {
    ReportContentRequest,
    ReportContentResponse,
    BlockUserRequest,
    BlockUserResponse,
    GetBlocksResponse,
} from "../index.js"

const targetUuid = "11111111-1111-4111-8111-111111111111"
const reportUuid = "22222222-2222-4222-8222-222222222222"
const userUuid = "33333333-3333-4333-8333-333333333333"

describe("ReportContentRequest", () => {
    it("accepts a valid report with an optional note", () => {
        const body = {
            targetType: "argument",
            targetId: targetUuid,
            reasonCode: "spam",
            note: "obvious spam link",
        }
        expect(Value.Check(ReportContentRequest, body)).toBe(true)
    })

    it("accepts a report without the optional note", () => {
        const body = {
            targetType: "claim",
            targetId: targetUuid,
            reasonCode: "harassment",
        }
        expect(Value.Check(ReportContentRequest, body)).toBe(true)
    })

    it("rejects a reasonCode outside the closed union", () => {
        const body = {
            targetType: "argument",
            targetId: targetUuid,
            reasonCode: "not-a-real-reason",
        }
        expect(Value.Check(ReportContentRequest, body)).toBe(false)
    })

    it("rejects a targetType that is neither argument nor claim", () => {
        const body = {
            targetType: "comment",
            targetId: targetUuid,
            reasonCode: "spam",
        }
        expect(Value.Check(ReportContentRequest, body)).toBe(false)
    })

    it("rejects a non-string targetId", () => {
        const body = {
            targetType: "argument",
            targetId: 12345,
            reasonCode: "spam",
        }
        expect(Value.Check(ReportContentRequest, body)).toBe(false)
    })

    it("rejects a body missing reasonCode", () => {
        const body = {
            targetType: "argument",
            targetId: targetUuid,
        }
        expect(Value.Check(ReportContentRequest, body)).toBe(false)
    })
})

describe("ReportContentResponse", () => {
    it("accepts a received ack", () => {
        expect(
            Value.Check(ReportContentResponse, {
                reportId: reportUuid,
                status: "received",
            })
        ).toBe(true)
    })

    it("rejects an unknown status", () => {
        expect(
            Value.Check(ReportContentResponse, {
                reportId: reportUuid,
                status: "queued",
            })
        ).toBe(false)
    })
})

describe("BlockUserRequest / BlockUserResponse", () => {
    it("accepts a valid block request", () => {
        expect(Value.Check(BlockUserRequest, { blockedUserId: userUuid })).toBe(
            true
        )
    })

    it("rejects a block request missing blockedUserId", () => {
        expect(Value.Check(BlockUserRequest, {})).toBe(false)
    })

    it("accepts a block ack", () => {
        expect(
            Value.Check(BlockUserResponse, {
                blockedUserId: userUuid,
                blocked: true,
            })
        ).toBe(true)
    })

    it("rejects a block ack with a non-boolean blocked flag", () => {
        expect(
            Value.Check(BlockUserResponse, {
                blockedUserId: userUuid,
                blocked: "yes",
            })
        ).toBe(false)
    })
})

describe("GetBlocksResponse", () => {
    it("accepts an array of minimal user refs", () => {
        const blocks = [{ userId: userUuid, username: "someone" }]
        expect(Value.Check(GetBlocksResponse, blocks)).toBe(true)
    })

    it("rejects a ref missing username", () => {
        const blocks = [{ userId: userUuid }]
        expect(Value.Check(GetBlocksResponse, blocks)).toBe(false)
    })
})
