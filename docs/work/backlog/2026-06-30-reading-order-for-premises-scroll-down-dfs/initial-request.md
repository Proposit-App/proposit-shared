# Reading-order for premises (scroll-down DFS)

## Product changes

When viewing an argument, order its premises so a reader following the
antecedent→consequent structure scrolls **up** as little as possible. The reader
model is a pre-order DFS of the proof tree rooted at the conclusion: each
premise's supporting premises sit directly below it, so the reader only scrolls
down.

Example (desired order): `P1: A (conclusion)`, `P2: (B∧C∧D)⇒A`,
`P3: (E∧F)⇒B`, `P4: (G∧H)⇒C`. P2 proves A; P3/P4 prove P2's antecedents B/C.

Affects both the web view and mobile, since both render through the shared
`buildTextTree`.

## Technical changes

Replace the conclusion-first comparator in
`proposit-shared/src/engine/text-tree.ts` with a reading-order derived from a
pre-order DFS over the antecedent→consequent graph of freeform premises,
rooted at `conclusionPremiseId`. Display-only: recomputed per render, nothing
persisted.

## Meta changes

None. No DB migration, no schema change, no export/YAML change, no version-bump
blockers beyond the normal shared minor.

---

## Decisions already made (approved in chat)

- **Placement:** display-only, recomputed inside `buildTextTree`. No stored
  `order` field, no migration, no export/YAML/canonical-form change.
- **Off-chain premises** (rebuttals, contradicting, disconnected fragments the
  DFS never reaches from the conclusion): appended after the reached chain in
  today's stable (lexicographic-id) order.
- Antecedents visited in their in-premise `position` order.
- Cycles handled by a visited-set; ties broken by lexicographic id (same
  tie-break as today's order → deterministic).

## Non-goals

- No optimal linear-arrangement solver — greedy DFS is accepted as the
  "try to" heuristic; some reuse cases still require scrolling up and that's fine.
- Do not touch `changeset.ts` `orderChangeset` (FK-safe DB persistence ordering,
  unrelated).
- No new capability — this refines the existing "view an argument" behavior.

## Open questions

None blocking. Whether to also weave rebuttals near what they attack was
considered and deferred (chosen: append at end).
