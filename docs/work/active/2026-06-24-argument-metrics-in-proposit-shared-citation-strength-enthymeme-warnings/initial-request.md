# Argument metrics in @proposit/shared — citation strength & enthymeme warnings

## Product changes

## Technical changes

## Meta changes

Origin: backlog dump 2026-06-24 (brainstorm/spec deferred until picked up). Repo: proposit-shared (compute), maybe surfaced by proposit-server.

The shared repo should be able to compute metrics for any non-empty argument. These may or may not be displayed in the UI, but the computation lives in shared.

## Metrics
- Citation Strength: coverage of source citations across the claims that need support (the ones carrying "Needs Support" chips).
- Enthymeme Warnings: a premise of the form `P implies Q` triggers a warning — proper inference needs at least two antecedents, e.g. `(P and R) implies Q`. Start with this structural check; LLM-based enthymeme detection is a likely later extension.

