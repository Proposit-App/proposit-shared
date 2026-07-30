import { describe, test, expect } from "vitest"
import { Value } from "typebox/value"
import { ArgumentEngineSnapshotSchema } from "../snapshot.js"

/**
 * A derivation premise must keep its `derivedClaimId` when a snapshot crosses
 * the API.
 *
 * `PropositionalPremiseSchema` intersects a union (freeform | derivation) with
 * its local extensions, and `Type.Omit` flattens that union: the result keeps
 * only the properties both members share, so `derivedClaimId` drops out of the
 * declared shape. The same hazard is already called out for variables at the
 * top of `snapshot.ts`, which handles each union member separately.
 *
 * Validation alone will not catch a recurrence — a schema that does not declare
 * a property still accepts a value carrying it. `Value.Encode` is what projects
 * onto the declared shape, so the assertion has to encode. When this broke, the
 * argument view answered 500 for every argument with a citation-backed claim,
 * because `CorePremiseSchema` requires `derivedClaimId` on load.
 */
describe("argument engine snapshot", () => {
    // `Value.Encode` asserts before it projects, so the surrounding snapshot has
    // to be valid for the premise assertion to mean anything.
    const argument = {
        id: "019fb4b3-0b9d-77ae-8f75-cb237f2de7dc",
        version: 0,
        title: "An argument",
        description: null,
        published: false,
        creatorId: "d6788f2b-a120-4581-86d1-1f8aa5f5f5b3",
        createdOn: new Date("2026-07-30T12:00:00.000Z"),
        publishedOn: null,
        forkId: null,
        digest: "digest",
        popularity: 0,
        platform: "manual",
        platformData: null,
        platformUsername: null,
        titleContentHash: null,
    }

    const snapshotWith = (premise: Record<string, unknown>) => ({
        argument,
        variables: { variables: [] },
        premises: [{ premise, expressions: { expressions: [] } }],
    })

    const derivationPremise = {
        id: "019fb4b3-0bcb-70df-9e67-3b412413e67a",
        argumentId: "019fb4b3-0b9d-77ae-8f75-cb237f2de7dc",
        argumentVersion: 0,
        type: "derivation",
        derivedClaimId: "019fb4b3-0bcb-70df-9e67-000000000001",
        derivedClaimVersion: 0,
        role: "supporting",
        title: null,
        checksum: "abc",
        descendantChecksum: null,
        combinedChecksum: "abc",
    }

    test("keeps derivedClaimId through an encode", () => {
        const encoded = Value.Encode(
            ArgumentEngineSnapshotSchema,
            snapshotWith(derivationPremise)
        ) as { premises: { premise: Record<string, unknown> }[] }

        expect(encoded.premises[0].premise.derivedClaimId).toBe(
            "019fb4b3-0bcb-70df-9e67-000000000001"
        )
    })

    test("survives a full encode / wire / decode round trip", () => {
        const encoded = Value.Encode(
            ArgumentEngineSnapshotSchema,
            snapshotWith(derivationPremise)
        )
        const wire = JSON.parse(JSON.stringify(encoded)) as unknown
        const decoded = Value.Decode(ArgumentEngineSnapshotSchema, wire) as {
            premises: { premise: Record<string, unknown> }[]
        }

        expect(decoded.premises[0].premise.derivedClaimId).toBe(
            "019fb4b3-0bcb-70df-9e67-000000000001"
        )
    })

    test("still accepts a freeform premise, which has no derivedClaimId", () => {
        const { derivedClaimId: _omitted, ...freeform } = {
            ...derivationPremise,
            type: "freeform",
        }

        const encoded = Value.Encode(
            ArgumentEngineSnapshotSchema,
            snapshotWith(freeform)
        ) as { premises: { premise: Record<string, unknown> }[] }

        expect("derivedClaimId" in encoded.premises[0].premise).toBe(false)
    })
})
