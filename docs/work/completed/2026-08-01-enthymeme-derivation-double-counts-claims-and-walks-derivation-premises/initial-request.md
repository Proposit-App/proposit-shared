# Enthymeme derivation double-counts claims and walks derivation premises

Found by manual browser testing of the origin-data epic on 2026-08-01
(`proposit-server/docs/manual-tests/2026-08-01-origin-data-and-enthymeme-annotations.md`,
finding 4). Server build `a2426f53`.

## Product changes

The suggestion panel reports far more content than an author can see, and keeps
reporting content that is already marked or already anchored. On an imported
argument it inverts the feature.

Two measurements from the session:

- A hand-built argument with **1 premise and 2 claims** produced **6** suggestion
  rows: `an untitled premise` ×3, `Students need quiet study space` ×2, and
  `Cities should fund extended hours` ×1 — the last of which was *already* marked
  unspoken *and* anchored, rendered two panels above with its
  `⚠ Unspoken · passage attached` contradiction chip. The sidebar reports the same
  claim as a contradiction and offers to mark it, at once.
- A Scholar import with **11 anchors covering all 7 of its claims** produced
  **16** rows once its stance was set to `representation`. Seven read
  `an untitled premise`. The correct answer is approximately zero.

Acceptance criteria 3 and 4 of the epic are the contract this breaks.

## Technical changes

`markableContent` (`src/engine/origin-derivation.ts:57-79`) walks
`Object.values(snapshot.premises)` and yields the premise plus every claim-bound
variable expression inside it. Two facts about the persisted model break that
walk:

1. **Each persisted claim carries two claim-bound expressions** — the authored one
   and the engine-synthesized derivation one. A mark or an anchor lands on the
   authored expression only, so the shadow expression passes both the `marked`
   check (`:95`) and the `anchors[targetId]` check (`:96`) and gets suggested.
2. **Each claim brings its own synthesized derivation premise.** The walk sees
   three premises where the author wrote one, and those extra premises have no
   title — which is where `an untitled premise` comes from.

Verified in the database for argument `019fbdcd-12b8-74ee-aa8c-4690bcab2eb3`:
3 `propositionalPremises` rows (1 `conclusion`, 2 `supporting`) behind a UI that
reads "1 premise"; claim `019fbdce-f7b6…` bound by expression `019fbdce-fe0b…`
(marked + anchored) *and* by expression `019fbdce-f7bd…` (neither).

**Consequence beyond noise:** acting on a phantom row writes a real mark to an
entity with no UI. Clicking `MARK UNSPOKEN` on the duplicate row set
`enthymeme = true` on the derivation-premise expression `019fbdce-f7bd…`, giving
one claim two enthymeme marks — and the second cannot be un-marked, because
nothing renders it.

**Proposed fix:** in `markableContent`, skip engine-synthesized derivation
premises and de-duplicate per claim so each claim yields exactly its authored
expression. The same generator feeds `deriveEnthymemeContradictions`
(`:109-126`), so contradictions can double-count identically — fix once, at the
generator.

Test cases:

1. 1 authored premise + 2 claims, stance `representation`, nothing anchored →
   exactly 3 suggestions, one per thing the author can see.
2. Marking one → 2 suggestions, and the marked one never reappears.
3. Anchoring one → it leaves the suggestion list.
4. A claim both anchored and marked → in `contradictions` exactly once, in
   `suggestions` never.
5. A fully-anchored imported argument at stance `representation` → zero
   suggestions.
6. No suggestion or contradiction ever names a premise or expression absent from
   the authored snapshot.

## Meta changes

Consumer impact is both platforms — the server renders these in the Source Text
pane and mobile's reading surface consumes the same derivation — so this is a
shared minor plus a repin in `proposit-server` and `proposit-mobile`.

Related: epic
[origin data and enthymeme annotations](tcw://W/proposit-app/2026-07-29-argument-origin-data-and-enthymeme-annotations);
session report
`proposit-server/docs/manual-tests/2026-08-01-origin-data-and-enthymeme-annotations.md`.
