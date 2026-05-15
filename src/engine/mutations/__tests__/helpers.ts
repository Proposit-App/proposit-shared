import { PropositArgumentEngine, type TProjectSnapshot } from "../../engine.js"
import { CHECKSUM_CONFIG } from "../../../checksum.js"
import type { TArgument } from "../../../schemas/model/arguments.js"
import type { TClaim } from "../../../schemas/model/claims.js"

/** Minimal argument for test engines. */
export function mkTestArgument(overrides?: Partial<TArgument>): TArgument {
    return {
        id: "test-arg-id",
        version: 1,
        title: "Test Argument",
        description: null,
        published: false,
        publishedOn: null,
        creatorId: "test-user-id",
        createdOn: new Date("2026-01-01"),
        forkId: null,
        forkVersion: null,
        digest: "test-digest",
        ...overrides,
    } as TArgument
}

/** Minimal claim for test engines. */
export function mkTestClaim(overrides?: Partial<TClaim>): TClaim {
    const normalDefault: TClaim = {
        id: crypto.randomUUID(),
        argumentId: "test-arg-id",
        version: 1,
        creatorId: "test-user-id",
        createdOn: new Date("2026-01-01"),
        title: "Test claim",
        body: "",
        titleContentHash: "test-hash",
        digest: "test-digest",
        kind: "claim",
        type: "normal",
        parentId: null,
        claimForkId: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: null,
    }
    return { ...normalDefault, ...overrides } as TClaim
}

/**
 * Build a PropositArgumentEngine from a minimal snapshot with no
 * premises/variables.
 *
 * Returned in `permissive` behavior so incremental tree-build patterns
 * common to these tests — create the operator root, then add children
 * one at a time — don't trip core 1.0's AN-3 (which would delete the
 * 0-child operator before its children land). Tests that exercise the
 * AN post-hook explicitly flip to `'assistive'` via `engine.setBehavior`.
 * See the cross-repo spec §11 "incremental tree-build" pattern.
 */
export function createTestEngine(
    overrides?: Partial<TProjectSnapshot>,
    claims: TClaim[] = []
): PropositArgumentEngine {
    const argument = mkTestArgument()
    const snapshot: TProjectSnapshot = {
        argument,
        variables: { variables: [] },
        premises: [],
        config: { checksumConfig: CHECKSUM_CONFIG },
        ...overrides,
    }
    const engine = PropositArgumentEngine.fromServerData(snapshot, claims, [])
    engine.setBehavior("permissive")
    return engine
}
