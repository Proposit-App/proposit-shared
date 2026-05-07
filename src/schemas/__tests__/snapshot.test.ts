import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { ArgumentEngineSnapshotSchema } from "../snapshot.js"

const argumentId = "11111111-1111-1111-1111-111111111111"
const creatorId = "22222222-2222-2222-2222-222222222222"
const premiseId = "33333333-3333-3333-3333-333333333333"

const baseArgument = {
    id: argumentId,
    version: 1,
    title: "Test argument",
    published: false,
    creatorId,
    createdOn: new Date("2026-05-07T00:00:00Z"),
    publishedOn: null,
    forkId: null,
    digest: "digest-arg",
    popularity: 0,
    platform: "manual",
    platformData: null,
    platformUsername: null,
    titleContentHash: null,
    description: null,
}

describe("ArgumentEngineSnapshotSchema", () => {
    it("accepts a snapshot whose premises omit the role field", () => {
        // proposit-core@0.11+ tracks premise role at the ArgumentEngine level
        // via conclusionPremiseId in the snapshot root, not on individual
        // premise data. Snapshots round-tripped through the engine therefore
        // carry premises without `role`. The schema must accept that.
        const snapshot = {
            argument: baseArgument,
            variables: { variables: [] },
            premises: [
                {
                    premise: {
                        id: premiseId,
                        argumentId,
                        argumentVersion: 1,
                        type: "freeform",
                        // role omitted — the regression case
                    },
                    expressions: { expressions: [] },
                },
            ],
            conclusionPremiseId: premiseId,
        }
        expect(Value.Check(ArgumentEngineSnapshotSchema, snapshot)).toBe(true)
    })
})
