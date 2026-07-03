import { describe, expect, it, expectTypeOf } from "vitest"
import { Value } from "typebox/value"
import { ArgumentCreateTask, type TTask } from "../tasks.js"
import { type TIngestionPipeline } from "../ingest-argument/index.js"

// `ArgumentCreateTask.data` is the persisted payload of an `argument_create`
// task. The server resolves the import pipeline at task-creation time and
// persists it as `data.pipeline`, so the executor reads the persisted role
// instead of re-resolving from configuration. The field is optional only so
// that tasks persisted before this field existed still validate on read; the
// server always writes a concrete role on new tasks.
const baseData = {
    argumentId: "11111111-1111-4111-8111-111111111111",
    version: 1,
}

const checkData = (data: unknown) =>
    Value.Check(ArgumentCreateTask.properties.data, data)

describe("ArgumentCreateTask.data.pipeline", () => {
    it("accepts a valid pipeline role", () => {
        expect(checkData({ ...baseData, pipeline: "scholar" })).toBe(true)
        expect(checkData({ ...baseData, pipeline: "scribe" })).toBe(true)
    })

    it("accepts data with pipeline absent (legacy-row tolerance)", () => {
        expect(checkData({ ...baseData })).toBe(true)
    })

    it("rejects an unknown pipeline role", () => {
        expect(checkData({ ...baseData, pipeline: "v2-multi-stage" })).toBe(
            false
        )
    })

    it("still rejects an unknown property (additionalProperties: false)", () => {
        expect(checkData({ ...baseData, bogus: true })).toBe(false)
    })

    it("types data.pipeline as the role union or undefined", () => {
        expectTypeOf<
            TTask<"argument_create">["data"]["pipeline"]
        >().toEqualTypeOf<TIngestionPipeline | undefined>()
    })
})

// `BaseTaskSchema` fields shared by every concrete task type. Exercised
// through `ArgumentCreateTask` since `BaseTaskSchema` itself isn't exported.
const sampleTask = {
    id: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    previousId: null,
    type: "argument_create" as const,
    data: baseData,
    errorData: null,
    resultData: null,
    createdOn: new Date("2026-06-01T12:00:00.000Z"),
    startedAt: null,
    settledAt: null,
    status: 0,
}

describe("BaseTaskSchema.startedAt / settledAt", () => {
    it("accepts both fields null (task not yet started)", () => {
        expect(Value.Check(ArgumentCreateTask, sampleTask)).toBe(true)
    })

    it("accepts both fields populated (settled task)", () => {
        const settled = {
            ...sampleTask,
            startedAt: new Date("2026-06-01T12:00:01.000Z"),
            settledAt: new Date("2026-06-01T12:00:05.000Z"),
            status: 2,
        }
        expect(Value.Check(ArgumentCreateTask, settled)).toBe(true)
    })

    it("rejects a payload carrying the old startedOn/completedOn keys once startedAt/settledAt are omitted (proves the new keys are required — BaseTaskSchema has no additionalProperties:false, so the stale keys alone are not what's rejected)", () => {
        const {
            startedAt: _startedAt,
            settledAt: _settledAt,
            ...withoutRenamedFields
        } = sampleTask
        const stale = {
            ...withoutRenamedFields,
            startedOn: null,
            completedOn: null,
        }
        expect(Value.Check(ArgumentCreateTask, stale)).toBe(false)
    })

    it("rejects a task that omits startedAt entirely", () => {
        const { startedAt: _omitted, ...without } = sampleTask
        expect(Value.Check(ArgumentCreateTask, without)).toBe(false)
    })

    it("rejects a task that omits settledAt entirely", () => {
        const { settledAt: _omitted, ...without } = sampleTask
        expect(Value.Check(ArgumentCreateTask, without)).toBe(false)
    })
})
