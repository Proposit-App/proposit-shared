import { describe, expect, it } from "vitest"

import { TaskStatus } from "../../../consts/index.js"
import type { TTask } from "../../../schemas/tasks.js"
import { isTaskNotSettled, isTaskSettled } from "../utils.js"

// Minimal argument_create task fixture; only `status` matters for the settled
// partition helpers, but the shape is kept valid so the cast is honest.
function taskWithStatus(status: number): TTask {
    return {
        id: "11111111-1111-4111-8111-111111111111",
        userId: "22222222-2222-4222-8222-222222222222",
        previousId: null,
        type: "argument_create",
        data: {
            argumentId: "33333333-3333-4333-8333-333333333333",
            version: 1,
        },
        errorData: null,
        resultData: null,
        createdOn: new Date("2026-06-01T12:00:00.000Z"),
        startedAt: null,
        settledAt: null,
        status,
    } as TTask
}

describe("isTaskSettled", () => {
    it("treats a CANCELLED task as settled (user-initiated terminal state)", () => {
        expect(isTaskSettled(taskWithStatus(TaskStatus.CANCELLED))).toBe(true)
    })

    it("treats COMPLETED and FAILED as settled", () => {
        expect(isTaskSettled(taskWithStatus(TaskStatus.COMPLETED))).toBe(true)
        expect(isTaskSettled(taskWithStatus(TaskStatus.FAILED))).toBe(true)
    })

    it("does NOT treat INTERRUPTED as settled (it may resume)", () => {
        expect(isTaskSettled(taskWithStatus(TaskStatus.INTERRUPTED))).toBe(
            false
        )
    })

    it("does NOT treat PENDING or IN_PROGRESS as settled", () => {
        expect(isTaskSettled(taskWithStatus(TaskStatus.PENDING))).toBe(false)
        expect(isTaskSettled(taskWithStatus(TaskStatus.IN_PROGRESS))).toBe(
            false
        )
    })
})

describe("isTaskNotSettled", () => {
    it("is the exact complement of isTaskSettled (CANCELLED is settled → not-settled is false)", () => {
        expect(isTaskNotSettled(taskWithStatus(TaskStatus.CANCELLED))).toBe(
            false
        )
        expect(isTaskNotSettled(taskWithStatus(TaskStatus.INTERRUPTED))).toBe(
            true
        )
    })
})
