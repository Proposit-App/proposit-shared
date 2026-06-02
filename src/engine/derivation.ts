// Re-exports of the derivation surface that survived core 1.0's D-tier
// rewrite. Server and mobile import these via
// `@proposit/shared/engine/derivation` for the ergonomic single-import
// path; the source of truth remains `@proposit/proposit-core`.
//
// Core 1.0 removed several derivation-related exports that the pre-1.0
// surface had:
//
//   - `ManagedDerivationPremiseEngine` (the dedicated subclass that
//     enforced derivation invariants on every mutation) is deleted —
//     derivation premises now go through the regular
//     `PremiseEngine`, and the invariants surface via
//     `engine.validate('derivable')` returning the D-1..D-6 violations
//     rather than throwing at mutation time.
//
//   - `DERIVATION_STRUCTURE_INVALID_AT_EVALUATION` (the pre-1.0
//     evaluation-time throw on naked-Q derivation premises) is deleted —
//     naked-Q derivation premises are now an evaluation
//     no-op, and broken-tree premises surface as the
//     unchanged `DERIVATION_STRUCTURE_INVALID` engine-error code.
//
//   - `DERIVATION_ANTECEDENT_NON_EMPTY` (a pre-1.0 mutation-time throw)
//     is gone — `populateFromCitations` / `populateFromAxioms` return
//     `{ kind: 'no-op' }` on already-populated premises rather than
//     throwing, per core 1.0's no-changes-without-consent contract.
//
//   - `TVariableMaterializer` (an MDPE-only interface) is deleted
//     alongside MDPE.
//
// Consumers of the deleted surface should migrate to
// `engine.populateFromCitations(claimId, lookup)` /
// `engine.populateFromAxioms(claimId, lookup)` on `ArgumentEngine`, and
// `engine.validate('derivable')` for D-tier invariants.
export {
    validateDerivationStructure,
    DERIVATION_STRUCTURE_INVALID,
    LEGACY_PREMISE_MISSING_TYPE,
    CLAIM_NOT_FOUND,
    CLAIM_TYPE_IMMUTABLE,
    CREATE_DERIVATION_REQUIRES_DERIVED_CLAIM_ID,
    CREATE_DERIVATION_CLAIM_NOT_FOUND,
} from "@proposit/proposit-core"
