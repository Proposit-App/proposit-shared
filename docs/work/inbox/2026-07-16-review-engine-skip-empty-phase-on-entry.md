# Change request: review engine must skip a phase whose queue is empty on entry

From: proposit-server (review wizard). Consumer-facing defect "Review wizard
dead-ends at 'Step 1 of 0' when a phase is empty".

## Problem

When a review's claim queue (or, symmetrically, its operator queue) is empty,
the engine opens directly into that empty phase and never advances. The consumer
UI then shows "Step 1 of 0" with no forward control — the header counts a step in
a zero-length phase and the footer has no current step to render Next from. The
reachable state is a review of an argument that has premise/operator decisions
but zero reviewable claims (or vice-versa).

## Root cause (in `@proposit/shared/engine/review/review-engine`)

- `freshDraft()` starts every review at `phase: "claims", currentStepIndex: 0`
  regardless of `claimQueue.length`.
- `computeSnapshot`: when `phase === "claims"` and the claim queue is empty (and
  no requeueable skips remain), `currentStep` stays `undefined`,
  `progress.totalStepsInPhase` is `0`, and `currentStepIndex` is `0`.
- `transitionTo(phase)` / `advanceStep()` only move to the next phase via
  `advanceQueue` returning `{ done: true }` **after** a step has been shown.
  Nothing skips a phase that is empty *on entry*.

(Note: `advanceStep()` on an empty queue *does* transition — `advanceQueue`
returns `done` because `currentIndex + 1 >= items.length` holds for length 0 —
which is why the consumer's interim workaround is a manual "Continue" button.
The engine just never triggers that transition automatically on entry.)

## Proposed fix

On `start()`/init and inside `transitionTo`, if the entered phase's queue is
empty (and it has no requeueable skips), immediately advance to the next phase:

- empty `claims` queue → enter `operators`;
- empty `operators` queue → enter `done`/results;
- both empty → go straight to `done`/results.

So a fresh review never rests on a phase with a zero-length queue; the current
phase always has at least one step (or is `done`).

## Consumer impact

`proposit-server` review wizard (`src/components/client/review/wizard/`):

- `wizard-header.tsx` currently renders "Step 1 of 0" for the empty phase.
- `wizard-footer.tsx` currently renders no forward control for the empty phase.

Server has shipped an **interim UI guard** (header shows "No steps in this
phase"; footer shows a "Continue" button wired to `engine.advanceStep()`) so the
user is never stuck. **Once this engine fix lands and the server pins the new
`@proposit/shared`, the interim guard should be removed** (the empty phase will
no longer be reachable as the current phase).

## Test cases

- A fresh review whose claim queue is empty opens on the `operators` phase (or
  `done`/results if the operator queue is also empty) — never on
  `phase: "claims"` with `totalStepsInPhase: 0`.
- A fresh review whose claim queue is non-empty is unchanged (opens on `claims`).
- `transitionTo("operators")` with an empty operator queue lands on `done`.
- Symmetry: confirm the intended landing for a review with zero decidable
  operators is results, not an empty "Relationships" state.

## Open question for the owner

Should the "Start review" affordance be disabled upstream of the wizard when both
queues are empty, or is the engine's advance-on-entry the single source of truth?
(The engine fix covers the dead-end either way; this is belt-and-suspenders.)

## Source

Filed from proposit-server work item
`docs/work/active/2026-07-15-review-wizard-defects/2026-07-15-review-wizard-dead-ends-at-step-1-of-0-when-a-phase-is-empty/`.
