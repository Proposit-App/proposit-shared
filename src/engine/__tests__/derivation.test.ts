import { describe, expect, it } from "vitest"
import {
    CLAIM_NOT_FOUND,
    CLAIM_TYPE_IMMUTABLE,
    CREATE_DERIVATION_CLAIM_NOT_FOUND,
    CREATE_DERIVATION_REQUIRES_DERIVED_CLAIM_ID,
    DERIVATION_STRUCTURE_INVALID,
    LEGACY_PREMISE_MISSING_TYPE,
    validateDerivationStructure,
} from "../derivation.js"

// Core 1.0 (the grammar-tiers rewrite) deleted the
// `ManagedDerivationPremiseEngine` subclass, the `TVariableMaterializer`
// interface, the `DERIVATION_ANTECEDENT_NON_EMPTY` mutation-time throw, and
// the `DERIVATION_STRUCTURE_INVALID_AT_EVALUATION` evaluation-time throw.
// `derivation.ts` re-exports the post-1.0 surface that survived. This test
// suite asserts the surviving symbols resolve through the shared sub-path.
describe("derivation re-exports through @proposit/shared/engine/derivation", () => {
    it("re-exports validateDerivationStructure as a callable", () => {
        expect(validateDerivationStructure).toBeDefined()
        expect(typeof validateDerivationStructure).toBe("function")
    })

    it("re-exports error code constants", () => {
        expect(DERIVATION_STRUCTURE_INVALID).toBeDefined()
        expect(LEGACY_PREMISE_MISSING_TYPE).toBeDefined()
        expect(CLAIM_NOT_FOUND).toBeDefined()
        expect(CLAIM_TYPE_IMMUTABLE).toBeDefined()
        expect(CREATE_DERIVATION_REQUIRES_DERIVED_CLAIM_ID).toBeDefined()
        expect(CREATE_DERIVATION_CLAIM_NOT_FOUND).toBeDefined()
    })
})
