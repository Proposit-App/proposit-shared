# Retitle the curated argument premises

Epic: [Premise titles name the inference, not restate it](tcw://W/proposit-app/2026-08-04-premise-titles-name-the-inference-not-restate-it)

## Product changes

Every premise in the four curated showcase arguments carries a title that is a
lossless restatement of the rows rendered directly beneath it. Replace all 28
with short **noun phrases naming the inferential move**.

| Fixture | Premises |
|---|---|
| `historical-figures-socrates/socrates-01.argument.yaml` | 5 |
| `historical-figures-madison/madison-01.argument.yaml` | 11 |
| `historical-figures-mill/mill-01.argument.yaml` | 6 |
| `historical-figures-singer/singer-01.argument.yaml` | 6 |

### The authoring rule

Claim titles are sentences asserting a proposition; premise titles are noun
phrases naming a move. That grammatical split is what stops a premise title
from collapsing into a restatement of its consequent claim's title — which is
already the first row rendered under the header, so restating it trades
duplicating five rows for duplicating one.

Illustrative, from Socrates (final wording decided at implementation):

| Today | Proposed |
|---|---|
| `If "The many are not authoritative" and "The many cannot do greatest evil" then "Zeal can be dangerous"` | Limits of the crowd's power |
| `Socrates must not escape` *(conclusion)* | The case against escape |
| `If "Reason governs Socrates" and "Zeal can be dangerous" and … then "Justice outranks life"` | Principle over survival |
| `If "The Delos ship nears arrival" and … then "Socrates follows God's will"` | Timing left to the god |
| `If "Escape would wrong the laws" and "The laws formed Socrates" and … then "Socrates must not escape"` | The laws' claim on Socrates |

## Technical changes

### Hand-authored, never regenerated

Do **not** re-run ingestion to produce these. A fresh run would yield a
materially different argument — different claims, different relations — and the
whole point of publishing these as v1 is that the v0 → v1 diff demonstrates the
republish path on a change we control completely.

**The diff must contain premise `title:` lines and nothing else.** No claim
edits, no tree edits, no `provenance` edits. The `provenance` block records the
pipeline run that produced the argument and stays as-is; hand-retitling does not
make it a new run.

### Why this does not wait on `proposit-core`

The core slice changes what *future* ingestion runs produce. These fixtures are
committed YAML, already ingested. The two slices are independent and can land
in either order.

### Verification

- `pnpm run test` — the fixture suite validates each YAML against
  `fixtures/argument-yaml/schema.ts`.
- `git diff` on each fixture shows only `title:` lines under `premises:`.
- The four content digests change, which is what makes the server slice's
  `reconcile:figures` report DRIFT and republish —
  `curatedArgumentContentDigest` hashes `premise.title`
  (`src/fixtures/argument-yaml/digest.ts:36`).

Shared **minor**; the server slice gates on its publish.

## Meta changes

- `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md`.
- `.claude/skills/add-curated-argument/SKILL.md` (workspace root) — add the
  premise-title authoring rule so future curated arguments are authored to it.
  Owned by the root node; do it from whichever slice lands first and note it in
  that slice's outcome.
