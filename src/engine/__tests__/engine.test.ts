import { describe, test, expect, vi } from "vitest"
import { v4 } from "uuid"
import { ArgumentEngine } from "@proposit/proposit-core"
import { CHECKSUM_CONFIG } from "../../checksum.js"
import { PropositArgumentEngine } from "../engine.js"
import { EMPTY_CLAIM_LOOKUP, createClaimLookup } from "../library-adapters.js"
import type { TArgument } from "../../schemas/model/arguments.js"
import type {
    TPropositionalExpressionCombined,
    TPropositionalPremise,
    TPropositionalVariable,
} from "../../schemas/logic.js"
import type { TClaim } from "../../schemas/model/claims.js"
import type { TClaimCitation } from "../../schemas/model/citations.js"
import type { TProjectSnapshot } from "../engine.js"

describe("PropositArgumentEngine", () => {
    const argumentId = v4()
    const argumentVersion = 1
    const creatorId = v4()
    const now = new Date("2026-01-01T00:00:00Z")

    function makeArgument(): TArgument {
        return {
            id: argumentId,
            version: argumentVersion,
            checksum: "test",
            descendantChecksum: null,
            combinedChecksum: "test",
            title: "Test Argument",
            published: false,
            creatorId,
            createdOn: now,
            publishedOn: null,
            forkId: null,
            digest: "test-digest",
            popularity: 0,
            platform: "manual" as const,
            platformData: null,
            platformUsername: null,
            titleContentHash: null,
            description: null,
        }
    }

    function makeClaim(overrides: Partial<TClaim> = {}): TClaim {
        return {
            id: v4(),
            argumentId,
            version: argumentVersion,
            title: "Test Claim",
            body: "Test body",
            kind: "claim" as const,
            type: "normal" as const,
            creatorId,
            createdOn: now,
            digest: "stmt-digest",
            parentId: null,
            claimForkId: null,
            ...overrides,
        }
    }

    function makeClaimCitation(
        claimId: string,
        supportingClaimId: string,
        overrides: Partial<TClaimCitation> = {}
    ): TClaimCitation {
        return {
            id: v4(),
            claimId,
            claimVersion: 1,
            supportingClaimId,
            supportingClaimVersion: 1,
            checksum: "test-edge-checksum",
            argumentId,
            createdOn: now,
            ...overrides,
        }
    }

    function buildEngine(): PropositArgumentEngine {
        const arg = makeArgument()
        return new PropositArgumentEngine(arg, EMPTY_CLAIM_LOOKUP, {
            checksumConfig: CHECKSUM_CONFIG,
        })
    }

    function buildSnapshotWithData() {
        // Build a base engine, add a premise and variable, then snapshot
        const arg = makeArgument()
        const claimId = v4()
        const claimLookup = createClaimLookup([{ id: claimId, version: 1 }])
        const baseEngine = new ArgumentEngine<
            TArgument,
            TPropositionalPremise,
            TPropositionalExpressionCombined,
            TPropositionalVariable
        >(arg, claimLookup, {
            checksumConfig: CHECKSUM_CONFIG,
        })

        const variable: TPropositionalVariable = {
            id: v4(),
            argumentId,
            argumentVersion,
            claimId,
            claimVersion: 1,
            symbol: "P",
            checksum: "test",
            descendantChecksum: null,
            combinedChecksum: "test",
            createdOn: now,
            creatorId,
        }
        baseEngine.addVariable(variable)

        const premiseId = v4()
        baseEngine.createPremiseWithId(premiseId, {
            argumentId,
            argumentVersion,
            title: "Test premise",

            role: "supporting",
            createdOn: now,
            creatorId,
        })

        const snapshot = baseEngine.snapshot() as TProjectSnapshot

        const claim = makeClaim({ id: variable.claimId })
        const supportingClaim = makeClaim({ type: "citation" })
        const claims = [claim, supportingClaim]
        const citations = [makeClaimCitation(claim.id, supportingClaim.id)]

        return { snapshot, claims, citations, variable }
    }

    describe("claim accessors", () => {
        test("setClaim / getClaim — set a claim and retrieve by ID", () => {
            const engine = buildEngine()
            const claim = makeClaim()

            engine.setClaim(claim)

            expect(engine.getClaim(claim.id)).toEqual(claim)
        })

        test("getClaim returns undefined for missing ID", () => {
            const engine = buildEngine()

            expect(engine.getClaim(v4())).toBeUndefined()
        })

        test("getClaims returns all claims", () => {
            const engine = buildEngine()
            const claim1 = makeClaim()
            const claim2 = makeClaim()

            engine.setClaim(claim1)
            engine.setClaim(claim2)

            const all = engine.getClaims()
            expect(Object.keys(all)).toHaveLength(2)
            expect(all[claim1.id]).toEqual(claim1)
            expect(all[claim2.id]).toEqual(claim2)
        })

        test("removeClaim removes a claim", () => {
            const engine = buildEngine()
            const claim = makeClaim()

            engine.setClaim(claim)
            expect(engine.getClaim(claim.id)).toEqual(claim)

            engine.removeClaim(claim.id)
            expect(engine.getClaim(claim.id)).toBeUndefined()
        })
    })

    describe("citation accessors", () => {
        test("addCitation / getCitationsForClaim — add a citation and retrieve by claim ID", () => {
            const engine = buildEngine()
            const claimId = v4()
            const supportingClaimId = v4()
            const cc = makeClaimCitation(claimId, supportingClaimId)

            engine.addCitation(cc)

            const result = engine.getCitationsForClaim(claimId)
            expect(result).toHaveLength(1)
            expect(result[0]).toEqual(cc)
        })

        test("getCitationsForClaim returns [] for missing claim ID", () => {
            const engine = buildEngine()

            expect(engine.getCitationsForClaim(v4())).toEqual([])
        })

        test("addCitation appends multiple citations for same claim", () => {
            const engine = buildEngine()
            const claimId = v4()
            const supportingClaimId1 = v4()
            const supportingClaimId2 = v4()
            const cc1 = makeClaimCitation(claimId, supportingClaimId1)
            const cc2 = makeClaimCitation(claimId, supportingClaimId2)

            engine.addCitation(cc1)
            engine.addCitation(cc2)

            const result = engine.getCitationsForClaim(claimId)
            expect(result).toHaveLength(2)
        })

        test("removeCitation removes a specific edge by edge id", () => {
            const engine = buildEngine()
            const claimId = v4()
            const supportingClaimId1 = v4()
            const supportingClaimId2 = v4()
            const cc1 = makeClaimCitation(claimId, supportingClaimId1)
            const cc2 = makeClaimCitation(claimId, supportingClaimId2)

            engine.addCitation(cc1)
            engine.addCitation(cc2)

            engine.removeCitation(cc1.id)

            const result = engine.getCitationsForClaim(claimId)
            expect(result).toHaveLength(1)
            expect(result[0].supportingClaimId).toBe(supportingClaimId2)
        })

        test("getCitations returns all citations as Record", () => {
            const engine = buildEngine()
            const claimId1 = v4()
            const claimId2 = v4()
            const cc1 = makeClaimCitation(claimId1, v4())
            const cc2 = makeClaimCitation(claimId2, v4())

            engine.addCitation(cc1)
            engine.addCitation(cc2)

            const all = engine.getCitations()
            expect(Object.keys(all)).toHaveLength(2)
            expect(all[claimId1]).toHaveLength(1)
            expect(all[claimId2]).toHaveLength(1)
        })
    })

    describe("fromServerData factory", () => {
        test("loads a snapshot + claims/citations", () => {
            const { snapshot, claims, citations } = buildSnapshotWithData()

            const engine = PropositArgumentEngine.fromServerData(
                snapshot,
                claims,
                citations
            )

            expect(engine).toBeInstanceOf(PropositArgumentEngine)
        })

        test("accessors work correctly after construction", () => {
            const { snapshot, claims, citations } = buildSnapshotWithData()

            const engine = PropositArgumentEngine.fromServerData(
                snapshot,
                claims,
                citations
            )

            // Claims
            expect(engine.getClaim(claims[0].id)).toEqual(claims[0])
            expect(Object.keys(engine.getClaims())).toHaveLength(2)

            // Citations
            const ccForClaim = engine.getCitationsForClaim(claims[0].id)
            expect(ccForClaim).toHaveLength(1)
            expect(ccForClaim[0].supportingClaimId).toBe(
                citations[0].supportingClaimId
            )
        })

        test("inherited engine functionality works (e.g., getArgument().id)", () => {
            const { snapshot, claims, citations } = buildSnapshotWithData()

            const engine = PropositArgumentEngine.fromServerData(
                snapshot,
                claims,
                citations
            )

            expect(engine.getArgument().id).toBe(argumentId)
            expect(engine.getArgument().version).toBe(argumentVersion)
            // Check that logic data was restored from the snapshot
            expect(engine.listPremiseIds().length).toBeGreaterThan(0)
        })
    })

    describe("reactive snapshot", () => {
        test("getProjectSnapshot() includes claims and citations records", () => {
            const engine = buildEngine()
            const claim = makeClaim()
            const supportingClaim = makeClaim({ type: "citation" })
            const cc = makeClaimCitation(claim.id, supportingClaim.id)

            engine.setClaim(claim)
            engine.setClaim(supportingClaim)
            engine.addCitation(cc)

            const snap = engine.getProjectSnapshot()

            expect(snap.claims[claim.id]).toEqual(claim)
            expect(snap.citations[claim.id]).toHaveLength(1)
            expect(snap.citations[claim.id][0]).toEqual(cc)

            // Core fields should also be present
            expect(snap.argument).toBeDefined()
            expect(snap.variables).toBeDefined()
            expect(snap.premises).toBeDefined()
            expect(snap.roles).toBeDefined()
        })

        test("structural sharing: mutating claims doesn't change citations reference", () => {
            const engine = buildEngine()
            const claimId = v4()
            const supportingClaimId = v4()
            engine.addCitation(makeClaimCitation(claimId, supportingClaimId))

            const snap1 = engine.getProjectSnapshot()

            // Mutate a claim — citations should keep the same reference
            const claim = makeClaim()
            engine.setClaim(claim)

            const snap2 = engine.getProjectSnapshot()

            // citations record reference should be the same (structural sharing)
            expect(snap2.citations).toBe(snap1.citations)
            // Claims record should be a new reference
            expect(snap2.claims).not.toBe(snap1.claims)
        })

        test("structural sharing: mutating citations doesn't change claims reference", () => {
            const engine = buildEngine()
            const claim = makeClaim()
            engine.setClaim(claim)

            const snap1 = engine.getProjectSnapshot()

            // Mutate citations
            engine.addCitation(makeClaimCitation(v4(), v4()))

            const snap2 = engine.getProjectSnapshot()

            expect(snap2.claims).toBe(snap1.claims)
            expect(snap2.citations).not.toBe(snap1.citations)
        })

        test("subscribe notifies on claim mutation", () => {
            const engine = buildEngine()
            const listener = vi.fn()

            engine.subscribe(listener)

            const claim = makeClaim()
            engine.setClaim(claim)
            expect(listener).toHaveBeenCalledTimes(1)

            engine.removeClaim(claim.id)
            expect(listener).toHaveBeenCalledTimes(2)
        })

        test("subscribe notifies on citation mutation", () => {
            const engine = buildEngine()
            const listener = vi.fn()

            engine.subscribe(listener)

            const claimId = v4()
            const supportingClaimId = v4()
            const cc = makeClaimCitation(claimId, supportingClaimId)
            engine.addCitation(cc)
            expect(listener).toHaveBeenCalledTimes(1)

            engine.removeCitation(cc.id)
            expect(listener).toHaveBeenCalledTimes(2)
        })

        test("unsubscribe stops notifications", () => {
            const engine = buildEngine()
            const listener = vi.fn()

            const unsub = engine.subscribe(listener)

            engine.setClaim(makeClaim())
            expect(listener).toHaveBeenCalledTimes(1)

            unsub()

            engine.setClaim(makeClaim())
            expect(listener).toHaveBeenCalledTimes(1) // no additional call
        })
    })

    describe("client-side premise creation via snapshot rollback", () => {
        test("creating a conclusion premise and rolling back preserves conclusionPremiseId in roles", () => {
            // Reproduces the client-side pattern from arg-data-context.tsx:
            // 1. Create engine (empty)
            // 2. Server creates a conclusion premise
            // 3. Client pushes the premise to the snapshot and rolls back
            // 4. roles.conclusionPremiseId should reflect the new conclusion
            const engine = buildEngine()

            // Simulate what the server returns after creating a conclusion premise
            const premiseId = v4()
            const premise: TPropositionalPremise = {
                id: premiseId,
                type: "freeform",
                argumentId,
                argumentVersion,
                title: null,
                role: "conclusion",
                checksum: "test-checksum",
                descendantChecksum: null,
                combinedChecksum: "test-checksum",
                createdOn: now,
                creatorId,
            }

            // This is what arg-data-context.tsx does after a successful API call:
            const snap = engine.snapshot() as TProjectSnapshot
            snap.premises.push({
                premise,
                rootExpressionId: undefined,
                expressions: { expressions: [] },
            })
            if (premise.role === "conclusion") {
                snap.conclusionPremiseId = premise.id
            }
            engine.rollback(snap)

            // After rollback, the reactive snapshot should show the conclusion
            const reactiveSnap = engine.getProjectSnapshot()
            expect(reactiveSnap.roles.conclusionPremiseId).toBe(premiseId)
        })

        test("after conclusion premise rollback, adding a second premise should default to supporting", () => {
            // End-to-end reproduction: after the first premise (conclusion) is
            // added via snapshot rollback, the client checks roles to decide the
            // next premise's role. If roles.conclusionPremiseId is missing, it
            // sends "conclusion" again and the server rejects it.
            const engine = buildEngine()

            // Step 1: simulate creating the first premise (conclusion)
            const conclusionId = v4()
            const conclusionPremise: TPropositionalPremise = {
                id: conclusionId,
                type: "freeform",
                argumentId,
                argumentVersion,
                title: null,
                role: "conclusion",
                checksum: "test-checksum-1",
                descendantChecksum: null,
                combinedChecksum: "test-checksum-1",
                createdOn: now,
                creatorId,
            }

            const snap1 = engine.snapshot() as TProjectSnapshot
            snap1.premises.push({
                premise: conclusionPremise,
                rootExpressionId: undefined,
                expressions: { expressions: [] },
            })
            if (conclusionPremise.role === "conclusion") {
                snap1.conclusionPremiseId = conclusionPremise.id
            }
            engine.rollback(snap1)

            // Step 2: client reads the reactive snapshot to decide the next role
            const reactiveSnap = engine.getProjectSnapshot()
            const nextRole = reactiveSnap.roles.conclusionPremiseId
                ? "supporting"
                : "conclusion"

            // This SHOULD be "supporting" since we just added a conclusion
            expect(nextRole).toBe("supporting")
        })
    })

    describe("canFork()", () => {
        test("returns false for an unpublished argument", () => {
            const engine = buildEngine() // makeArgument() has published: false
            expect(engine.canFork()).toBe(false)
        })

        test("returns true for a published argument", () => {
            const arg = { ...makeArgument(), published: true }
            const engine = new PropositArgumentEngine(arg, EMPTY_CLAIM_LOOKUP, {
                checksumConfig: CHECKSUM_CONFIG,
            })
            expect(engine.canFork()).toBe(true)
        })
    })

    describe("buildReactiveSnapshot() — invariant violations", () => {
        test("validationIssues is an array in the reactive snapshot", () => {
            const engine = buildEngine()
            const snap = engine.getProjectSnapshot()
            // An empty engine (no premises) will have invariant violations
            // (e.g. no conclusion premise). Verify the field exists and is an
            // array — specific violations are tested in the next test.
            expect(Array.isArray(snap.validationIssues)).toBe(true)
        })

        test("validationIssues includes invariant violations mapped as errors", () => {
            // Build a snapshot with a variable referencing a claim that won't
            // be in the engine's claim library after construction.
            const ghostClaimId = v4()
            const ghostClaimVersion = 99

            // Use a temporary engine with the ghost claim in the lookup so
            // addVariable() passes, then take a snapshot.
            const claimLookupWithGhost = createClaimLookup([
                { id: ghostClaimId, version: ghostClaimVersion },
            ])
            const arg = makeArgument()
            const tempEngine = new PropositArgumentEngine(
                arg,
                claimLookupWithGhost,
                { checksumConfig: CHECKSUM_CONFIG }
            )

            const variable: TPropositionalVariable = {
                id: v4(),
                argumentId,
                argumentVersion,
                claimId: ghostClaimId,
                claimVersion: ghostClaimVersion,
                symbol: "Q",
                checksum: "test",
                descendantChecksum: null,
                combinedChecksum: "test",
                createdOn: now,
                creatorId,
            }
            tempEngine.addVariable(variable)
            const snap = tempEngine.snapshot() as TProjectSnapshot

            // Now load the snapshot into an engine that does NOT know about the
            // ghost claim. rollback() uses permissiveForRestore = true, so the
            // variable is accepted during restore. Afterwards, validate() in
            // buildReactiveSnapshot() checks with permissiveForRestore = false,
            // and should detect the missing claim.
            const engineWithoutGhost = new PropositArgumentEngine(
                arg,
                EMPTY_CLAIM_LOOKUP,
                { checksumConfig: CHECKSUM_CONFIG }
            )
            engineWithoutGhost.rollback(snap)

            const projectSnap = engineWithoutGhost.getProjectSnapshot()
            const codes = projectSnap.validationIssues.map((i) =>
                String(i.code)
            )
            expect(codes).toContain("ARG_CLAIM_REF_NOT_FOUND")

            // All mapped violations should have severity "error"
            const invariantIssues = projectSnap.validationIssues.filter(
                (i) => String(i.code) === "ARG_CLAIM_REF_NOT_FOUND"
            )
            for (const issue of invariantIssues) {
                expect(issue.severity).toBe("error")
            }
        })
    })

    describe("toggleNegation on PropositArgumentEngine", () => {
        test("toggleNegation works on engine built from fromServerData", async () => {
            const { snapshot, claims, citations, variable } =
                buildSnapshotWithData()

            // Add a variable expression to the premise snapshot
            const premiseSnap = snapshot.premises[0]
            const exprId = v4()
            premiseSnap.expressions.expressions.push({
                id: exprId,
                argumentId,
                argumentVersion,
                premiseId: premiseSnap.premise.id,
                parentId: null,
                position: 0,
                type: "variable",
                variableId: variable.id,
                operator: null,
                createdOn: now,
                creatorId,
                checksum: "test",
                descendantChecksum: null,
                combinedChecksum: "test",
            } as unknown as TPropositionalExpressionCombined)
            premiseSnap.rootExpressionId = exprId

            const engine = PropositArgumentEngine.fromServerData(
                snapshot,
                claims,
                citations
            )

            // Verify the expression is found
            const pm = engine.findPremiseByExpressionId(exprId)
            expect(pm).toBeDefined()

            // Toggle negation — should wrap expression in NOT
            const { mutateToggleNegation } =
                await import("../mutations/expressions.js")
            expect(() => {
                mutateToggleNegation(engine, exprId, {
                    creatorId,
                    createdOn: now,
                })
            }).not.toThrow()

            // Verify NOT operator exists
            const allExprs = pm!.getExpressions()
            const notExpr = allExprs.find(
                (e: TPropositionalExpressionCombined) =>
                    e.type === "operator" && e.operator === "not"
            )
            expect(notExpr).toBeDefined()
        })
    })
})
