import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"

import { RetryTaskResponse } from "../index.js"

// Verifies the retry-response TypeBox schema at
// `@proposit/shared/schemas/api/task-retry`.
// `RetryTaskResponse` is an alias of the existing `ArgumentCreateTask` schema:
// both retry routes (whole-task and per-stage) produce a fresh `argument_create`
// task whose `previousId` points at the failed task.

const sampleTaskUuid = "11111111-1111-4111-8111-111111111111"
const sampleUserUuid = "22222222-2222-4222-8222-222222222222"
const samplePreviousUuid = "33333333-3333-4333-8333-333333333333"
const sampleArgumentUuid = "44444444-4444-4444-8444-444444444444"

// A fresh retry task: `previousId` set (lineage points at the failed task),
// not yet started (status PENDING, startedOn/completedOn null, resultData null).
const sampleRetryTask = {
    id: sampleTaskUuid,
    userId: sampleUserUuid,
    previousId: samplePreviousUuid,
    type: "argument_create" as const,
    data: {
        argumentId: sampleArgumentUuid,
        version: 1,
    },
    errorData: null,
    resultData: null,
    createdOn: new Date("2026-05-27T12:00:00.000Z"),
    startedOn: null,
    completedOn: null,
    status: 0,
}

describe("RetryTaskResponse", () => {
    it("validates a fresh argument_create retry task (previousId set)", () => {
        expect(Value.Check(RetryTaskResponse, sampleRetryTask)).toBe(true)
    })

    it("validates a completed retry task with resultData populated", () => {
        const completed = {
            ...sampleRetryTask,
            status: 2,
            startedOn: new Date("2026-05-27T12:00:01.000Z"),
            completedOn: new Date("2026-05-27T12:00:05.000Z"),
            resultData: { tokensUsed: 123 },
        }
        expect(Value.Check(RetryTaskResponse, completed)).toBe(true)
    })

    it("validates a first-run task whose previousId is null (no prior lineage)", () => {
        const firstRun = { ...sampleRetryTask, previousId: null }
        expect(Value.Check(RetryTaskResponse, firstRun)).toBe(true)
    })

    it("accepts an optional nullable responseId in data", () => {
        const withResponseId = {
            ...sampleRetryTask,
            data: { ...sampleRetryTask.data, responseId: "resp-1" },
        }
        expect(Value.Check(RetryTaskResponse, withResponseId)).toBe(true)
    })

    it("round-trips a wire payload (string dates → Date via Convert+Parse)", () => {
        const wire = {
            ...sampleRetryTask,
            createdOn: "2026-05-27T12:00:00.000Z",
            startedOn: null,
            completedOn: null,
        }
        const converted = Value.Convert(RetryTaskResponse, wire)
        const parsed = Value.Parse(RetryTaskResponse, converted)
        expect(parsed.createdOn).toBeInstanceOf(Date)
        expect(parsed.id).toBe(sampleTaskUuid)
        expect(parsed.previousId).toBe(samplePreviousUuid)
        expect(parsed.type).toBe("argument_create")
    })

    it("rejects a non-argument_create task type (builder task is out of retry scope)", () => {
        const builder = { ...sampleRetryTask, type: "argument_build_review" }
        expect(Value.Check(RetryTaskResponse, builder)).toBe(false)
    })

    it("rejects a missing required field (userId omitted)", () => {
        const { userId: _omitted, ...without } = sampleRetryTask
        expect(Value.Check(RetryTaskResponse, without)).toBe(false)
    })

    it("rejects a malformed data payload (argumentId not a uuid)", () => {
        const bad = {
            ...sampleRetryTask,
            data: { ...sampleRetryTask.data, argumentId: "not-a-uuid" },
        }
        expect(() => Value.Parse(RetryTaskResponse, bad)).toThrow()
    })

    it("rejects a non-numeric status", () => {
        const bad = { ...sampleRetryTask, status: "pending" }
        expect(Value.Check(RetryTaskResponse, bad)).toBe(false)
    })
})
