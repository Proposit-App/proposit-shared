# Review-flow semantics for striking, contradiction and the blocked state

Epic: [Review verdicts as two axes with rejection striking premises from the record](tcw://W/proposit-app/2026-08-07-review-verdicts-as-two-axes-with-rejection-striking-premises-from-the-record)

**Slice B of five.** Blocked by slice A in `proposit-core` — `tcw work start` will
refuse until A resolves. Slices C (`proposit-server`) and E (`proposit-mobile`)
are both blocked on this one.

## Design of record

`/Users/brian/Projects/Proposit-App/docs/work/active/2026-08-07-review-verdicts-as-two-axes-with-rejection-striking-premises-from-the-record/design.md`

Read it before writing your spec. `spec.md` beside it carries node boundaries and
acceptance criteria. This request is a summary, not a substitute.

## Context

Slice A stops treating a reviewer's accept/reject decision as a truth value:
rejection now **strikes** the premise from the premise set rather than asserting
the conditional false, and evaluation emits orthogonal facts plus per-value
provenance instead of a single grade enum. This slice carries that into the
review flow both clients run.

## Scope

1. **The decision target becomes the premise's outermost decidable operator** —
   the outermost operator that isn't `not`, recursing through `not`, so `¬(A → B)`
   presents the `→`. Bare `¬Q` has none and is not offered at all. Every other
   operator is assumed accepted.

   This is what fixes manufactured truth on the accept side, with no semantic
   change: today a premise-scope decision fans out to every non-`not` operator, so
   accepting `(A ∧ B) → C` stamps "accepted" on the `∧` too and an accepted
   conjunction forces each unknown conjunct true. Root-only decisions leave the
   `∧` unassigned, evaluated normally from whatever `A` and `B` actually are.

   The reviewer gets exactly **one** decision per premise. The record is
   nonetheless keyed by operator id so finer targeting can arrive later without a
   data migration — but present it as a decision about *the premise*, with the
   operator as the explanation of what specifically is wrong, never as a scoped
   strike.

2. **Contradiction detection, localization and prose.** The signature is *an
   accepted premise that evaluates false under the reader's own values* — a
   disagreement between two things already computed, so detection is nearly free.

   **Detection is one-sided.** A reader who *rejects* `P → Q` and holds both `P`
   and `Q` true is not contradicting anything — they made the material conditional
   true while denying the relationship, which is the normal state of a rejection.
   A naive "premise value disagrees with premise verdict" check flags every
   rejection in the system.

   Only true and false collide. An explicit *unknown* is a decision but not an
   assertion of a value, and an accepted inference overriding it is not a
   collision — it is the review teaching the reader something.

   Presentation requirements, all load-bearing:
   - **Localize to a single premise** — the one where a granted inference collides
     with an assigned value.
   - **Show provenance for derived values.** In a chain (`P → Q`, `Q → R`, `P`
     true, `R` false) the collision surfaces at the second premise while its cause
     spans both plus two assignments. `True → False` without saying where the
     `True` came from asks the reader to fix a value they never set, and may push
     them to reject the second step when their disagreement is with the first.
   - **Distinct notation for derivation and implication.** `(Unknown → True) →
     False` reads as nested implication; the inner arrow means "became".
   - **Render claim titles, not variable letters.**
   - **Per-operator prose** — one sentence per operator, not one template, because
     each operator commits the reader to something different. Conditional: "by
     accepting this premise you are saying there is no circumstance where
     {antecedent} is true and {consequent} is false, however you have assigned
     values that contradict this." Conjunction: every part holds. Disjunction: at
     least one holds.
   - **Offer both exits** — change the decision to a rejection, or change the
     offending assignments — and **re-check after each change**, since resolving
     one collision can expose another downstream.
   - **The alert must name the inductive exit.** A reader holding the antecedent
     true and the consequent false while believing the inference generally sound
     is in a coherent position the encoding cannot hold. Rejection with
     `counterexamples-exist` records their case-level judgment faithfully. Offer it
     in those terms — the alert's most valuable job is routing them to the
     expression that says what they meant, not telling them they erred.

3. **Reader-caused vs author-caused routing**, by premise-set satisfiability.
   Satisfiable → the collision is resolvable by the reader and blocks completion.
   Unsatisfiable → the reader is told at the start, never blocked, and derivation
   is suppressed. The rule decides **whether a resolution exists; it does not
   allocate fault, and no copy may.** A satisfiable set may have models only where
   the reader holds things they consider factually wrong — blocking them is still
   right, telling them they erred is not.

4. **`blocked` as an explicit state on the review**, not a value in the assessment
   vocabulary. A blocked review simply has no assessment yet, exactly like an
   in-progress one. Keeping it out of the vocabulary also keeps it from being
   confusable with *does not reach — insufficient information*: "we cannot assess
   this" is not "the argument established nothing", and since reviews are public
   and tallied, conflating them would let an incoherent review masquerade as a
   legitimate negative verdict. A blocked review can never complete, so it must be
   impossible for one to reach a tally.

   **This changes `ServerReviewPhase`** (`src/schemas/model/review.ts`), today a
   three-literal union of `claims` / `operators` / `done`. Note for sequencing:
   `proposit-server` carries a matching `argumentReviews_phase_check` CHECK
   constraint admitting the same three, and relaxing it is slice C's job — so
   `blocked` cannot round-trip end-to-end until C lands.

5. **Completion precondition.** "Finished" becomes *reached the results step **and**
   coherent*. The results step stops being a display of what was computed and
   becomes the coherence gate. Reflect this wherever completion is recorded and
   rehydrated — `phase === "done"` is the persisted completion signal hydration
   reads.

6. **Conclusion-claim default.** The conclusion defaults to unknown. Keep the
   existing phase order; attribution (slice A) handles the question-begging risk,
   so phase reordering is explicitly out of scope and belongs to its own item.

7. **Claim-queue reachability narrowing.** Absorbed from a `proposit-mobile`
   change request rather than adopted separately, because it asks the same
   question this design already answers — *which propositions is it meaningful to
   ask a reviewer about?* The claim queue is built by walking each premise's
   variables and nothing downstream re-checks whether a variable is actually wired
   into a formula, so a claim-bound variable **no expression references** is
   offered as its own True/False/Unknown step even though no assignment to it can
   change any premise's value or either assessment. Measured against a
   561-argument-version database: 52 versions (~9%) contain at least one.

   Drop such variables from the queue — the same narrowing family as the existing
   citation/axiom gate.

   **Two things to verify while implementing, because the cause is not
   established.** Each persisted claim has both an authored variable and an
   engine-synthesized derivation variable, so an orphan may be an authored
   variable whose claim is otherwise unreachable — which is what the reported
   four-claim-queue-versus-three-claim-text-tree count implies, since the queue
   dedupes by claim. Confirm that before narrowing, and confirm the narrowing
   removes only steps that cannot matter, never a claim reachable by its other
   variable. A test written against an assumed cause would pass either way.

   Mobile's own fix is already landed and needs nothing either way — it resolves
   step content from the claim record rather than the text tree, as does server's
   wizard, so a narrowing here only removes steps. Any consumer that labels queue
   length is affected: **queue length is not the argument's claim count and must
   not be labelled as one.**

## Acceptance criteria owned by this slice

- **7** (shared with C and E) — contradiction detection, localization and prose:
  the alert names the offending premise, the commitment its operator implies, and
  the provenance of any derived value involved. This slice owns detection and the
  prose; the two clients render it.
- **11** — a claim-bound variable that no expression references is not offered as
  a review step. Three named test cases: an argument containing one asserts the
  narrowing explicitly rather than incidentally; the same argument with that
  variable referenced by one expression is still queued, guarding against
  over-narrowing; and queue length equals the count of evaluation-relevant
  authored claims.

Also contributes to criterion 9 (the two axes separately readable, never
contradicting) by shaping what the clients receive.

## Copy constraint — applies to every string this slice ships

No shipped string may imply an inductively accepted step establishes less than an
entailment does; no assessment label may use proof language. **Restriction
premises keep withdrawal semantics with corrected wording** — the control reads as
*declining to grant* the constraint, never as rejecting or refuting it.
*Declined* / *withheld* everywhere, never *denied* or *refuted*, in the control
**and** in every downstream report: admitting assignments that violate a declined
constraint is logically fine precisely because nothing was claimed false, and one
word of refutation language anywhere breaks that.

## Publish handling — read before planning

**This slice completes without publishing.** Code merged and tagged, plus
`pnpm run build && pnpm run pack:branch` for a branch-suffixed validation tarball
(never plain `pnpm pack`). The npm release for both `@proposit/proposit-core` and
`@proposit/shared` happens in one window at the end of the initiative, coordinated
at the workspace root, after all five slices are code-complete. Consumers sit on
`file:` pins until then.
