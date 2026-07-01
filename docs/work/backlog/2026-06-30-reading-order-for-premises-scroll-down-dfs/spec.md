# Spec — Reading-order for premises (scroll-down DFS)

## Capability changes

Refines the existing "view an argument" capability: premises are presented in a
reading order (conclusion first, then a depth-first unpacking of its support) so
a reader following antecedent→consequent structure scrolls only downward. Not a
new capability; behavior of an existing surface changes. No API/contract change.
Both web (`proposit-server`) and mobile (`proposit-mobile`) inherit it through
the shared `buildTextTree`. Reconcile the argument-view `capabilities.md` at
completion (wording tweak, not a new entry).

## Problem

Premises currently display in an order with no relationship to the argument's
logical structure, forcing a reader to hunt/scroll for the premise that
establishes each antecedent.

## Goals

- Order premises so a pre-order DFS reader (conclusion → its proof → each
  antecedent's proof, recursively) never needs to scroll up to find a premise's
  support. Support sits directly below.
- Deterministic, stable, cycle-safe.
- Zero persistence / migration / contract change; recomputed per render.

## Non-goals

- No optimal linear-arrangement solver. Greedy DFS is the accepted "try to"
  heuristic; when a claim is reused across branches its proof is placed at first
  encounter and later references still scroll up — acceptable.
- No stored `order` field, no export/YAML/canonical-form change.
- No change to `changeset.ts` `orderChangeset` (FK persistence ordering).
- Derivation premises stay excluded from the flat list (rendered as badges).

## Current-state findings

- Ordering chokepoint: `src/engine/text-tree.ts:198-206` — a 2-way stable
  comparator that only pulls `conclusionPremiseId` to front; everything else
  keeps `Object.entries(snapshot.premises)` order (lexicographic id per the
  engine enumeration). This is the only place to change.
- `buildTextTree` (`text-tree.ts:192-225`) iterates premises, skips
  `type === "derivation"` (`:212`), emits `premise-header` + per-premise walk.
- Antecedent/consequent convention (`walkPremiseExpression`, `text-tree.ts:157-189`):
  for `implies`/`iff`, position-sorted children give **antecedent = lowest
  position, consequent = highest position** (display reverses them). Antecedent
  side may be an `and`/formula subtree → claim leaves must be collected by
  walking it. `not` flips a `negated` flag already tracked in the walk.
- Premise/expression/variable shapes available on the snapshot:
  `snapshot.premises[id].{premise, expressions, rootExpressionId}`,
  `snapshot.variables[id]` (claim-bound has `claimId`; premise-bound has
  `boundPremiseId`), `snapshot.roles.conclusionPremiseId`.
- Both clients render through `buildTextTree`
  (`proposit-server/.../argument-text-view.tsx`, `proposit-mobile/src/arguments/use-argument.ts`).

## Proposed behavior

New pure function `orderPremisesForReading(snapshot): string[]` (own module,
`src/engine/premise-reading-order.ts`), consumed by `buildTextTree`.

**Edge model (freeform premises only).** For each freeform premise, walk its
expression tree from `rootExpressionId`:

- **Consequent signature** = the `(claimId, negated)` leaves on the consequent
  side (highest-position child of an `implies`/`iff` root). A bare-assertion
  premise (no implication root, e.g. the conclusion `A`) has no consequent — it
  is never a proof.
- **Frontier** = the claims a premise still needs supported: the
  `(claimId, negated)` leaves on the **antecedent** side of an implication, OR,
  for a bare-assertion premise, its own asserted `(claimId, negated)` leaves.
  Plus: any antecedent premise-bound variable contributes a direct
  premise→premise edge to its `boundPremiseId`.
- `provenBy: Map<signature, premiseId[]>` maps each consequent signature to the
  freeform premises that prove it, in stable (Object-key) order.

Polarity is part of the signature so a rebuttal concluding `¬B` does **not** get
pulled in as the proof of an antecedent `B`; it falls off-chain.

**Ordering.**

```
order = []
visited = set()
visit(conclusionPremiseId)      // skipped if undefined
  if pid in visited: return
  visited.add(pid); order.push(pid)
  for sig in frontier(pid) (antecedents in position order):
    for p in provenBy[sig] (unvisited, stable order): visit(p)
  for q in boundPremiseEdges(pid) (unvisited, stable order): visit(q)
append every remaining premise id (off-chain freeform + all derivations)
  in Object.keys(snapshot.premises) order
return order
```

`buildTextTree` builds a rank from `order` and sorts its premise entries by rank;
emit loop and derivation-skip unchanged.

## Acceptance criteria

1. `P1:A (conclusion), P2:(B∧C∧D)⇒A, P3:(E∧F)⇒B, P4:(G∧H)⇒C` (in any input
   order) → `[P1, P2, P3, P4]` (P3/P4 interchangeable per stable tie-break).
2. Shared antecedent (claim used by two premises) → proof placed at first
   encounter; no infinite loop; later reference not re-emitted.
3. A cycle in the antecedent↔consequent graph → terminates; every premise emitted
   exactly once; deterministic.
4. A rebuttal / off-chain / disconnected premise → appended after the reached
   chain in existing stable order; polarity-opposite consequent is not woven in.
5. `conclusionPremiseId` undefined → output equals today's order (no reorder).
6. Derivation premises → still excluded from emitted list; web + mobile unaffected
   beyond order.
7. `pnpm run check` green (typecheck, lint, existing tests).

## Risks / dependencies

- Polarity handling is the main correctness subtlety; covered by criterion 4.
- Must obey shared-repo ESM rules (relative imports end in `.js`) and
  `lib: ["ES2022"]` (no DOM/Node globals in `src/`). Pure data function → fine.
- Consumers pick this up on the next `@proposit/shared` minor bump; no lockstep
  required (display-only, no contract change).
