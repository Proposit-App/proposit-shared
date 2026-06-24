import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    ArgumentForkSchema,
    ClaimForkSchema,
    ExpressionForkSchema,
    PremiseForkSchema,
    VariableForkSchema,
} from "../model/forks.js"

const ENTITY_ID = "11111111-1111-1111-1111-111111111111"
const FORK_ID = "22222222-2222-2222-2222-222222222222"
const USER_ID = "33333333-3333-3333-3333-333333333333"
const NOW = new Date("2026-05-06T00:00:00Z")

const baseForkFields = {
    entityId: ENTITY_ID,
    forkedFromEntityId: null,
    forkedFromArgumentId: null,
    forkedFromArgumentVersion: null,
}

const claimForkBase = {
    ...baseForkFields,
    forkId: FORK_ID,
    forkedFromEntityVersion: null,
    sourceUserId: USER_ID,
    forkedByUserId: USER_ID,
}

const argumentForkBase = {
    ...baseForkFields,
    forkId: FORK_ID,
    id: FORK_ID,
    sourceUserId: USER_ID,
    forkedByUserId: USER_ID,
    createdOn: NOW,
}

describe("ClaimForkSchema forkId nullability", () => {
    it("accepts a claim fork with a non-null forkId", () => {
        expect(Value.Check(ClaimForkSchema, claimForkBase)).toBe(true)
    })

    it("accepts a claim-only fork with forkId: null (no argumentForks row)", () => {
        expect(
            Value.Check(ClaimForkSchema, { ...claimForkBase, forkId: null })
        ).toBe(true)
    })
})

describe("other fork schemas keep forkId non-null", () => {
    it("ArgumentFork rejects forkId: null", () => {
        expect(Value.Check(ArgumentForkSchema, argumentForkBase)).toBe(true)
        expect(
            Value.Check(ArgumentForkSchema, {
                ...argumentForkBase,
                forkId: null,
            })
        ).toBe(false)
    })

    it("PremiseFork rejects forkId: null", () => {
        const premiseFork = { ...baseForkFields, forkId: FORK_ID }
        expect(Value.Check(PremiseForkSchema, premiseFork)).toBe(true)
        expect(
            Value.Check(PremiseForkSchema, { ...premiseFork, forkId: null })
        ).toBe(false)
    })

    it("ExpressionFork rejects forkId: null", () => {
        const expressionFork = {
            ...baseForkFields,
            forkId: FORK_ID,
            forkedFromPremiseId: null,
        }
        expect(Value.Check(ExpressionForkSchema, expressionFork)).toBe(true)
        expect(
            Value.Check(ExpressionForkSchema, {
                ...expressionFork,
                forkId: null,
            })
        ).toBe(false)
    })

    it("VariableFork rejects forkId: null", () => {
        const variableFork = { ...baseForkFields, forkId: FORK_ID }
        expect(Value.Check(VariableForkSchema, variableFork)).toBe(true)
        expect(
            Value.Check(VariableForkSchema, { ...variableFork, forkId: null })
        ).toBe(false)
    })
})
