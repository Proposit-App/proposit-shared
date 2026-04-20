import { describe, expect, test } from "vitest"
import { CHECKSUM_CONFIG } from "../checksum.js"

describe("CHECKSUM_CONFIG", () => {
    test("variableFields references claimId and claimVersion", () => {
        const fields = CHECKSUM_CONFIG.variableFields
        expect(fields).toContain("claimId")
        expect(fields).toContain("claimVersion")
        expect(fields).not.toContain("statementId")
        expect(fields).not.toContain("statementVersion")
    })
})
