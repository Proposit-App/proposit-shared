import {
    ArgumentEngine,
    InvariantViolationError,
    isClaimBound,
    type TArgumentEngineSnapshot,
    type TClaimBoundVariable,
    type TClaimLookup,
    type TCoreClaim,
    type TCorePropositionalVariable,
    type TCoreValidationIssue,
    type TInvariantValidationResult,
    type TInvariantViolation,
    type TReactiveSnapshot,
} from "@proposit/proposit-core"

import type { TArgument } from "../schemas/model/arguments.js"
import type {
    TPropositionalExpressionCombined,
    TPropositionalPremise,
    TPropositionalVariable,
} from "../schemas/logic.js"
import type { TClaim } from "../schemas/model/claims.js"
import type { TClaimCitation } from "../schemas/model/citations.js"
import { CHECKSUM_CONFIG } from "../checksum.js"
import { createClaimLookup } from "./library-adapters.js"

// A non-derivation (freeform) premise must never reference a claim of type
// `citation` or `axiomatic`: those claim types belong only in derivation
// premises, where the citation/axiom is the antecedent supporting a derived
// claim. Placing one in a freeform premise produces a domain-invalid argument
// (e.g. a citation sitting as a bare antecedent renders as a visually empty
// node). This rule is enforced here in the project engine; core leaves the
// equivalent grammar tier informational.
const PREMISE_TYPED_CLAIM_IN_FREEFORM = "PREMISE_TYPED_CLAIM_IN_FREEFORM"

// Claim types that may only appear in derivation premises.
const DERIVATION_ONLY_CLAIM_TYPES = new Set<TCoreClaim["type"]>([
    "citation",
    "axiomatic",
])

// Core 1.0 dropped the per-engine `grammarConfig` knob in favor of a single
// `behavior: 'assistive' | 'permissive'` setting. Snapshot loading (rollback,
// fromSnapshot, fromData) now accepts any Structural-valid snapshot regardless
// of higher-tier state, so the old `enforceFormulaBetweenOperators: false`
// loading window is unnecessary. Wave-2 derivation premises with the
// `IMPLIES(OR(c1, c2), Q)` shape now load fine — the P-1 formula-buffer rule
// surfaces via `validate('presentable')` rather than rejecting at load time.

/** Project-parameterized snapshot type used to bridge TypeBox schemas and core engine. */
export type TProjectSnapshot = TArgumentEngineSnapshot<
    TArgument,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
    TPropositionalVariable
>

/**
 * Extended reactive snapshot. Adds project-level claim and citation edge
 * data and computed validation issues to core's reactive snapshot.
 */
export type TProjectReactiveSnapshot = TReactiveSnapshot<
    TArgument,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
    TPropositionalVariable
> & {
    claims: Record<string, TClaim>
    citations: Record<string, TClaimCitation[]>
    validationIssues: TCoreValidationIssue[]
}

/**
 * Project-specific extension of ArgumentEngine that manages domain data
 * (claims and citation edges) alongside the core
 * propositional logic state.
 *
 * Mutations to domain data trigger reactive notifications via the inherited
 * subscribe/getSnapshot protocol, enabling seamless integration with
 * React's useSyncExternalStore.
 */
export class PropositArgumentEngine extends ArgumentEngine<
    TArgument,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
    TPropositionalVariable
> {
    // Internal storage — claimsMap also backs the base class's claimLibrary
    // so that setClaim() makes new claims visible to addVariable() validation.
    private claimsMap: Map<string, TClaim>
    private citationsMap = new Map<string, TClaimCitation[]>()

    // Shared context object that is captured by the mutableLookup closure
    // and also accessible after construction so the rollback() override can
    // temporarily enable permissive claim stubs (see rollback() below).
    // Declared before super() — it must exist for the closure to capture it.
    // The type annotation is a plain object to satisfy TS before this exists.
    private claimContext!: { permissiveForRestore: boolean }

    constructor(
        ...args: ConstructorParameters<
            typeof ArgumentEngine<
                TArgument,
                TPropositionalPremise,
                TPropositionalExpressionCombined,
                TPropositionalVariable
            >
        >
    ) {
        const [argument, claimLookup, options] = args
        // Create the shared claims map before super() so we can build a
        // live lookup that the base class stores as this.claimLibrary.
        const claimsMap = new Map<string, TClaim>()
        const toCoreClaim = (c: {
            id: string
            version: number
            type: "normal" | "citation" | "axiomatic"
        }): TCoreClaim => ({
            id: c.id,
            version: c.version,
            type: c.type ?? "normal",
            frozen: false,
            checksum: "",
        })
        // claimContext must be created before super() so the mutableLookup
        // closure can capture it. We assign it to this.claimContext after
        // super() returns so the rollback() override can access it.
        const claimContext = { permissiveForRestore: false }
        const mutableLookup: TClaimLookup = {
            get(id: string, version: number) {
                // Check the live map first (covers dynamically-added claims),
                // then fall back to the original lookup (initial construction data).
                const c = claimsMap.get(id)
                if (c?.version === version) return toCoreClaim(c)
                const orig = claimLookup.get(id, version)
                if (orig) return toCoreClaim(orig)
                // During snapshot rollback (restoring from server data), return
                // a stub so validateInvariants() passes for claim references
                // not present in the supplied claims array. This allows
                // fromServerData to work when claims are omitted or incomplete.
                // Normal mutations (addVariable) still check the lookup — but
                // addVariable is not called during rollbackInternal, only
                // validateInvariants() is.
                if (claimContext.permissiveForRestore) {
                    return {
                        id,
                        version,
                        type: "normal",
                        frozen: false,
                        checksum: "",
                    }
                }
                return undefined
            },
            getCurrent(id: string) {
                const c = claimsMap.get(id)
                if (c) return toCoreClaim(c)
                const orig = claimLookup.getCurrent(id)
                if (orig) return toCoreClaim(orig)
                return undefined
            },
        }
        super(argument, mutableLookup, options)
        this.claimsMap = claimsMap
        this.claimContext = claimContext
    }

    // ──── Rollback override for permissive claim stubs ────

    /**
     * Overrides base rollback() to temporarily enable permissive claim stubs
     * during the validateInvariants() call that rollback() performs internally.
     *
     * In proposit-core 1.0.0+, rollback() calls validateInvariants() which
     * checks that every claim-bound variable's (claimId, claimVersion) exists
     * in the claim library. When the engine is loaded from a server snapshot
     * and the caller does not supply the full claims array (common in tests),
     * this would fail.
     *
     * Permissive stubs are ONLY active during rollback's validateInvariants()
     * pass:
     * - addVariable() explicit check: claimContext.permissiveForRestore = false
     *   (addVariable is not called inside rollbackInternal)
     * - validateInvariants() inside rollback(): permissiveForRestore = true
     */
    override rollback(
        snapshot: Parameters<
            InstanceType<
                typeof ArgumentEngine<
                    TArgument,
                    TPropositionalPremise,
                    TPropositionalExpressionCombined,
                    TPropositionalVariable
                >
            >["rollback"]
        >[0]
    ): void {
        this.claimContext.permissiveForRestore = true
        try {
            super.rollback(snapshot)
        } finally {
            this.claimContext.permissiveForRestore = false
            // rollback rebuilds the premise map and re-points each premise's
            // validation callback to core's default; re-install the typed-claim
            // guards so premise-level expression mutations stay enforced.
            this.installFreeformTypedClaimGuards()
        }
    }

    // Dirty tracking for structural sharing
    private claimsDirty = true
    private citationsDirty = true

    // Cached records for reactive snapshot
    private cachedClaims: Record<string, TClaim> = {}
    private cachedCitations: Record<string, TClaimCitation[]> = {}

    // Full combined snapshot cache (for useSyncExternalStore referential stability)
    private cachedProjectSnapshot: TProjectReactiveSnapshot | undefined
    private lastBaseSnapshot:
        | TReactiveSnapshot<
              TArgument,
              TPropositionalPremise,
              TPropositionalExpressionCombined,
              TPropositionalVariable
          >
        | undefined

    // ──── Private cache helpers ────

    private getClaimsRecord(): Record<string, TClaim> {
        if (this.claimsDirty) {
            this.cachedClaims = Object.fromEntries(this.claimsMap)
            this.claimsDirty = false
        }
        return this.cachedClaims
    }

    private getCitationsRecord(): Record<string, TClaimCitation[]> {
        if (this.citationsDirty) {
            this.cachedCitations = Object.fromEntries(this.citationsMap)
            this.citationsDirty = false
        }
        return this.cachedCitations
    }

    // ──── Typed snapshot accessor ────

    getProjectSnapshot(): TProjectReactiveSnapshot {
        return this.getSnapshot() as TProjectReactiveSnapshot
    }

    // ──── Claim accessors ────

    // NOTE: this is `getProjectClaim`, not `getClaim`, because core 1.0
    // promoted `getClaim(claimId, claimVersion)` to the `ArgumentEngine` base
    // surface (returns `TCoreClaim`, the minimal `{ id, version, type, frozen,
    // checksum }` shape used by the engine's claim-bound-variable validation).
    // Shared's domain method returns the richer `TClaim` (a discriminated
    // union over normal / citation / axiomatic with `createdOn`, `creatorId`,
    // `title`, etc.) drawn from the per-engine `claimsMap`, so it cannot be
    // an override — the return types are incompatible. Both methods coexist
    // on the engine: callers wanting the wire-format minimal shape use
    // `getClaim(id, version)`; callers wanting the full project-claim record
    // use `getProjectClaim(id)`.
    getProjectClaim(id: string): TClaim | undefined {
        return this.claimsMap.get(id)
    }

    getClaims(): Record<string, TClaim> {
        return this.getClaimsRecord()
    }

    setClaim(claim: TClaim): void {
        this.claimsMap.set(claim.id, claim)
        this.claimsDirty = true
        this.notifySubscribers()
    }

    removeClaim(id: string): void {
        if (this.claimsMap.delete(id)) {
            this.claimsDirty = true
            this.notifySubscribers()
        }
    }

    // ──── Citation accessors ────

    getCitationsForClaim(claimId: string): TClaimCitation[] {
        return this.citationsMap.get(claimId) ?? []
    }

    getCitations(): Record<string, TClaimCitation[]> {
        return { ...this.getCitationsRecord() }
    }

    addCitation(cc: TClaimCitation): void {
        const existing = this.citationsMap.get(cc.claimId) ?? []
        this.citationsMap.set(cc.claimId, [...existing, cc])
        this.citationsDirty = true
        this.notifySubscribers()
    }

    removeCitation(edgeId: string): void {
        let removed = false
        for (const [claimId, edges] of this.citationsMap.entries()) {
            const filtered = edges.filter((e) => e.id !== edgeId)
            if (filtered.length !== edges.length) {
                if (filtered.length > 0) {
                    this.citationsMap.set(claimId, filtered)
                } else {
                    this.citationsMap.delete(claimId)
                }
                removed = true
            }
        }
        if (removed) {
            this.citationsDirty = true
            this.notifySubscribers()
        }
    }

    // ──── canFork override ────

    /**
     * Restricts forking to published arguments only.
     * Overrides the base class default which returns true unconditionally.
     */
    public override canFork(): boolean {
        const arg = this.getArgument()
        return arg?.published === true
    }

    // ──── Freeform-premise typed-claim invariant ────

    /**
     * Resolves the claim type a variable references, or `undefined` when the
     * variable is not claim-bound (premise-bound variables reference no claim).
     * Reads the engine's claim library (`getClaim`) rather than the per-engine
     * `claimsMap`, because the library is populated for the whole load/mutation
     * lifecycle while `claimsMap` is filled only after a snapshot restore — so
     * the library is the reliable source during the load-validation sweep.
     */
    private resolveVariableClaimType(
        variableId: string
    ): TCoreClaim["type"] | undefined {
        const variable = this.getVariable(variableId) as
            | TCorePropositionalVariable
            | undefined
        if (!variable || !isClaimBound(variable)) return undefined
        const bound = variable as TClaimBoundVariable
        return this.getClaim(bound.claimId, bound.claimVersion)?.type
    }

    /**
     * Collects a violation for every freeform premise that references a
     * derivation-only claim type (`citation` / `axiomatic`) through one of its
     * member variables. Walks each premise's expressions, resolves the claim
     * type behind each variable expression, and flags the premise when any
     * referenced claim is derivation-only.
     */
    private collectTypedClaimsInFreeformViolations(): TInvariantViolation[] {
        const violations: TInvariantViolation[] = []
        for (const pe of this.listPremises()) {
            if (pe.toPremiseData().type !== "freeform") continue
            const premiseId = pe.getId()
            for (const expr of pe.getExpressions()) {
                if (expr.type !== "variable") continue
                const claimType = this.resolveVariableClaimType(expr.variableId)
                if (claimType === undefined) continue
                if (!DERIVATION_ONLY_CLAIM_TYPES.has(claimType)) continue
                violations.push({
                    code: PREMISE_TYPED_CLAIM_IN_FREEFORM,
                    message: `Freeform premise ${premiseId} references a ${claimType} claim; ${claimType} claims may only appear in derivation premises.`,
                    entityType: "premise",
                    entityId: premiseId,
                    premiseId,
                })
                // One violation per premise is enough to flag/repair it.
                break
            }
        }
        return violations
    }

    /**
     * Runs the freeform-premise typed-claim check, gated on `assistive`
     * behavior. Returns an `ok: false` result when a freeform premise
     * references a derivation-only claim. The gate keeps the
     * derivation-population helpers — which flip to `permissive` mid-build and
     * may momentarily hold a transient intermediate tree — from being tripped
     * while they construct a valid final shape.
     */
    private assertNoTypedClaimsInFreeform(): TInvariantValidationResult {
        if (this.behavior !== "assistive") {
            return { ok: true, violations: [] }
        }
        const violations = this.collectTypedClaimsInFreeformViolations()
        return { ok: violations.length === 0, violations }
    }

    // ──── Mutation + load enforcement overrides ────

    /**
     * Folds the freeform-premise typed-claim invariant into core's invariant
     * sweep. Because core's mutation wrapper (`withValidation`) and the
     * snapshot-load paths (`fromSnapshot` / `fromData` / `rollback`) all run
     * this method, overriding it enforces the invariant on both mutation and
     * load: an argument-level mutation that would leave a citation/axiomatic
     * claim in a freeform premise is rolled back and throws, and a snapshot
     * carrying that placement fails to load. Premise-level expression
     * mutations validate through a separate per-premise callback, re-wired in
     * {@link installFreeformTypedClaimGuards} to enforce the same invariant.
     */
    public override validateInvariants(): TInvariantValidationResult {
        const base = super.validateInvariants()
        const typedClaims = this.assertNoTypedClaimsInFreeform()
        if (typedClaims.ok) return base
        return {
            ok: false,
            violations: [...base.violations, ...typedClaims.violations],
        }
    }

    /**
     * Wraps core's universal mutation wrapper. Core re-points every premise's
     * after-mutation validation callback to its own default at the end of each
     * argument-level mutation, so the typed-claim guards must be re-installed
     * afterwards to stay in effect for the next premise-level expression
     * mutation. The mutation itself is enforced by the overridden
     * {@link validateInvariants} that core's wrapper invokes.
     */
    protected override withValidation<T>(fn: () => T): T {
        try {
            return super.withValidation(fn)
        } finally {
            this.installFreeformTypedClaimGuards()
        }
    }

    /**
     * Re-wires every premise's after-mutation validation callback so that
     * premise-level expression mutations also enforce the freeform-premise
     * typed-claim invariant. Core's default callback runs only its lighter
     * after-premise-mutation sweep, which never reaches the typed-claim check;
     * this callback runs the typed-claim check first and, when clean, the full
     * invariant sweep ({@link validateInvariants}) so a violating placement is
     * rolled back and throws at the moment the expression is added.
     */
    private installFreeformTypedClaimGuards(): void {
        for (const pe of this.listPremises()) {
            pe.setArgumentValidateCallback(() => {
                const typedClaims = this.assertNoTypedClaimsInFreeform()
                if (!typedClaims.ok) return typedClaims
                return this.validateInvariants()
            })
        }
    }

    // ──── Reactive snapshot override ────

    protected override buildReactiveSnapshot(): TProjectReactiveSnapshot {
        const base = super.buildReactiveSnapshot()
        const claims = this.getClaimsRecord()
        const citations = this.getCitationsRecord()

        // Recompute validation when base engine snapshot changes
        let validationIssues: TCoreValidationIssue[]
        if (base !== this.lastBaseSnapshot) {
            const evaluability = this.validateEvaluability().issues
            // Core 1.0 split the legacy `validate()` into two methods:
            // `validateInvariants()` is the engine-invariant sweep returning
            // `{ ok, violations }` with `TCoreValidationIssue`-shaped entries
            // (legacy semantics — what this wrapper has always consumed);
            // `validate(tier)` is the new four-tier grammar query returning a
            // `readonly TViolation[]`. Reactive snapshot consumers expect the
            // invariant view here.
            const invariants = this.validateInvariants()
            const mappedViolations: TCoreValidationIssue[] = invariants.ok
                ? []
                : invariants.violations.map(
                      (v): TCoreValidationIssue => ({
                          code: v.code as TCoreValidationIssue["code"],
                          // The freeform-premise typed-claim violation is a
                          // repairable placement issue (move the claim into a
                          // derivation premise), so surface it as a warning
                          // rather than a blocking error in the reactive view.
                          // Mutation/load paths still throw on it.
                          severity:
                              v.code === PREMISE_TYPED_CLAIM_IN_FREEFORM
                                  ? ("warning" as const)
                                  : ("error" as const),
                          message: v.message,
                          premiseId: v.premiseId,
                      })
                  )
            validationIssues = [...evaluability, ...mappedViolations]
        } else {
            validationIssues =
                this.cachedProjectSnapshot?.validationIssues ?? []
        }

        // Return cached snapshot if neither the base nor domain data changed
        // (preserves referential equality for useSyncExternalStore).
        if (
            this.cachedProjectSnapshot &&
            base === this.lastBaseSnapshot &&
            claims === this.cachedProjectSnapshot.claims &&
            citations === this.cachedProjectSnapshot.citations
        ) {
            return this.cachedProjectSnapshot
        }

        const snapshot: TProjectReactiveSnapshot = {
            ...base,
            claims,
            citations,
            validationIssues,
        }
        this.cachedProjectSnapshot = snapshot
        this.lastBaseSnapshot = base
        return snapshot
    }

    // ──── Static factory ────

    /**
     * Creates a PropositArgumentEngine from server-provided data: an engine
     * snapshot (for logic state) plus arrays of claims and citation
     * edges.
     *
     * Does NOT trigger reactive notifications during initial data loading.
     */
    static fromServerData(
        snapshot: TProjectSnapshot,
        claims: TClaim[],
        citations: TClaimCitation[]
    ): PropositArgumentEngine {
        const claimLookup = createClaimLookup(claims)
        const engine = new PropositArgumentEngine(
            snapshot.argument,
            claimLookup,
            {
                checksumConfig: CHECKSUM_CONFIG,
                positionConfig: snapshot.config?.positionConfig,
                generateId: () => crypto.randomUUID(),
            }
        )

        // Restore engine state from the snapshot.
        // Populate variables.config so that rollbackInternal creates a
        // VariableManager with the correct checksumConfig. Without this,
        // VariableManager.fromSnapshot() is called with no config and falls
        // back to DEFAULT_CHECKSUM_CONFIG, causing checksum mismatches when
        // the server's CHECKSUM_CONFIG includes extra fields (createdOn, etc.).
        //
        // NOTE: rollback() is overridden in PropositArgumentEngine to set
        // claimContext.permissiveForRestore = true during the validateInvariants() call,
        // so unknown claim references in the snapshot don't cause failures when
        // the caller provides an incomplete claims array.
        //
        // Core 1.0 dropped the per-premise `grammarConfig` knob and the
        // legacy `LOAD_GRAMMAR` / `STRICT_GRAMMAR` snapshot-loading split:
        // snapshot loading now accepts any Structural-valid state, and the
        // P-1 formula-buffer rule is queried via `validate('presentable')`
        // rather than rejecting at load time. Wave-2 derivation premises
        // with the `IMPLIES(OR(c1, c2), Q)` shape therefore load without
        // any per-premise config rewrite or post-load re-tightening loop.
        const snapshotWithVariableConfig: TProjectSnapshot = {
            ...snapshot,
            variables: {
                ...snapshot.variables,
                config: snapshot.variables.config ?? {
                    checksumConfig: CHECKSUM_CONFIG,
                },
            },
        }
        try {
            engine.rollback(snapshotWithVariableConfig)
        } catch (error) {
            if (error instanceof InvariantViolationError) {
                throw new Error(
                    `Failed to load argument ${snapshot.argument?.id}: invariant violation during rollback: ${error.violations.map((v) => v.message).join(", ")}`,
                    { cause: error }
                )
            }
            throw error
        }

        // Load domain data into internal maps (no notifications)
        for (const claim of claims) {
            engine.claimsMap.set(claim.id, claim)
        }
        for (const cc of citations) {
            const existing = engine.citationsMap.get(cc.claimId) ?? []
            existing.push(cc)
            engine.citationsMap.set(cc.claimId, existing)
        }

        return engine
    }
}
