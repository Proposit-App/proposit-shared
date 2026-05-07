import { describe, expect, it } from "vitest"
import {
    DERIVATION_STRUCTURE_INVALID,
    LEGACY_PREMISE_MISSING_TYPE,
    ManagedDerivationPremiseEngine,
    validateDerivationStructure,
} from "../derivation.js"

describe("v0.11 derivation re-exports through @proposit/shared/engine/derivation", () => {
    it("re-exports ManagedDerivationPremiseEngine class", () => {
        expect(ManagedDerivationPremiseEngine).toBeDefined()
        expect(typeof ManagedDerivationPremiseEngine).toBe("function")
    })

    it("re-exports validateDerivationStructure as a callable", () => {
        expect(validateDerivationStructure).toBeDefined()
        expect(typeof validateDerivationStructure).toBe("function")
    })

    it("re-exports error code constants", () => {
        expect(DERIVATION_STRUCTURE_INVALID).toBeDefined()
        expect(LEGACY_PREMISE_MISSING_TYPE).toBeDefined()
    })
})
