import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"

import { TaskStatus } from "../../../../consts/index.js"
import { CancelTaskResponse } from "../index.js"

// Verifies the cancel-response TypeBox schema at
// `@proposit/shared/schemas/api/task-cancel`.
// The cancel route returns 200 + the updated `argument_create` task body
// (a 204 would crash `parseResponse`, which calls `response.json()`
// unconditionally). `CancelTaskResponse` is therefore an alias of
// `ArgumentCreateTask`, mirroring `RetryTaskResponse`.

const sampleTaskUuid = "11111111-1111-4111-8111-111111111111"
const sampleUserUuid = "22222222-2222-4222-8222-222222222222"
const sampleArgumentUuid = "44444444-4444-4444-8444-444444444444"

// A cancelled in-progress task: status flipped to CANCELLED, partially run.
const sampleCancelledTask = {
    id: sampleTaskUuid,
    userId: sampleUserUuid,
    previousId: null,
    type: "argument_create" as const,
    data: {
        argumentId: sampleArgumentUuid,
        version: 1,
    },
    errorData: null,
    resultData: null,
    createdOn: new Date("2026-06-01T12:00:00.000Z"),
    startedAt: new Date("2026-06-01T12:00:01.000Z"),
    settledAt: new Date("2026-06-01T12:00:03.000Z"),
    status: TaskStatus.CANCELLED,
}

describe("CancelTaskResponse", () => {
    it("validates the updated argument_create task with status CANCELLED", () => {
        expect(Value.Check(CancelTaskResponse, sampleCancelledTask)).toBe(true)
    })

    it("round-trips a wire payload (string dates → Date via Convert+Parse)", () => {
        const wire = {
            ...sampleCancelledTask,
            createdOn: "2026-06-01T12:00:00.000Z",
            startedAt: "2026-06-01T12:00:01.000Z",
            settledAt: "2026-06-01T12:00:03.000Z",
        }
        const converted = Value.Convert(CancelTaskResponse, wire)
        const parsed = Value.Parse(CancelTaskResponse, converted)
        expect(parsed.createdOn).toBeInstanceOf(Date)
        expect(parsed.id).toBe(sampleTaskUuid)
        expect(parsed.status).toBe(TaskStatus.CANCELLED)
        expect(parsed.type).toBe("argument_create")
    })

    it("rejects a non-argument_create task type (builder task is out of cancel scope)", () => {
        const builder = {
            ...sampleCancelledTask,
            type: "argument_build_review",
        }
        expect(Value.Check(CancelTaskResponse, builder)).toBe(false)
    })

    it("rejects a non-numeric status", () => {
        const bad = { ...sampleCancelledTask, status: "cancelled" }
        expect(Value.Check(CancelTaskResponse, bad)).toBe(false)
    })

    it("rejects a payload carrying the old startedOn/completedOn keys once startedAt/settledAt are omitted (proves the new keys are required — the schema has no additionalProperties:false, so the stale keys alone are not what's rejected)", () => {
        const {
            startedAt: _startedAt,
            settledAt: _settledAt,
            ...withoutRenamedFields
        } = sampleCancelledTask
        const stale = {
            ...withoutRenamedFields,
            startedOn: sampleCancelledTask.startedAt,
            completedOn: sampleCancelledTask.settledAt,
        }
        expect(Value.Check(CancelTaskResponse, stale)).toBe(false)
    })
})
