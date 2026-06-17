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
