import { describe, expect, test } from "vitest"
import { DEFAULT_CHECKSUM_CONFIG } from "@proposit/proposit-core"
import { CHECKSUM_CONFIG } from "../checksum.js"

describe("CHECKSUM_CONFIG", () => {
    test("variableFields references claimId and claimVersion", () => {
        const fields = CHECKSUM_CONFIG.variableFields
        expect(fields).toContain("claimId")
        expect(fields).toContain("claimVersion")
        expect(fields).not.toContain("statementId")
        expect(fields).not.toContain("statementVersion")
    })

    test("premiseFields matches DEFAULT_CHECKSUM_CONFIG.premiseFields", () => {
        // proposit-core@0.11's PremiseEngine strips extra fields before
        // hashing premises — only the 4 default fields are hashed. Any
        // shared-side override that adds extra fields here would diverge
        // server-computed checksums from engine-computed ones, which surfaces
        // later as checkValidity failures on stored premises.
        const sharedPremiseFields = CHECKSUM_CONFIG.premiseFields
        const corePremiseFields = DEFAULT_CHECKSUM_CONFIG.premiseFields
        expect(sharedPremiseFields).toBeDefined()
        expect(corePremiseFields).toBeDefined()
        const shared = Array.from(sharedPremiseFields ?? []).sort()
        const core = Array.from(corePremiseFields ?? []).sort()
        expect(shared).toEqual(core)
    })
})
