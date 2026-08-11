# Add the shared review copy and icon-name modules under ui/argument/review

## Product changes

TBD

## Technical changes

TBD

## Meta changes

TBD

## Inbox contents

### Inbox manifest

- `2026-08-11-add-the-shared-review-copy-and-icon-name-modules-under-ui-argument-review.md`

### Inbox body

---
from: proposit-app
initiative: 2026-08-11-unify-review-copy-and-icon-vocabulary-in-proposit-shared
---

# Add the shared review copy and icon-name modules under ui/argument/review

Epic: [Unify review copy and icon vocabulary in @proposit/shared](tcw://W/proposit-app/2026-08-11-unify-review-copy-and-icon-vocabulary-in-proposit-shared)

Slice 1 of 3. The full spec is the epic's `spec.md` at the orchestrator node
(`docs/work/active/2026-08-11-unify-review-copy-and-icon-vocabulary-in-proposit-shared/spec.md`)
— read `## Child boundaries` → slice 1, `## Notes` → *Wording decisions*, and
`## Risks`. What follows is the binding subset; do not re-derive the design, the
spec already disproved several plausible alternatives.

## Problem

`proposit-server` and `proposit-mobile` declare the same review strings
independently, so they are equal only by coincidence and each repo's tests assert
its own literal — drift is invisible on both sides at once. Most starkly, both
declare `PROVENANCE_TOOLTIP` as `Record<TAssignmentProvenance, string>` over the
*same shared type* (`src/engine/review/types.ts:20`), with the same `user` value
and a **different** `default` value.

This slice adds the one place those strings will live. It changes no client.

## Scope — two new files, nothing else

```
src/ui/argument/review/consts.ts    review copy
src/ui/argument/review/icons.ts     review icon-name vocabulary
```

- **`package.json` is unchanged.** The existing `"./ui/*"` wildcard already spans
  `/` — live precedent: `"./engine/*"` serves
  `@proposit/shared/engine/review/assessment` to both clients today. Do **not**
  add an `exports` entry; the repo rule *"when adding a new subpath, include all
  three conditions"* does not apply, because this is not a new subpath.
- **`src/ui/index.ts` is unchanged.** That barrel is re-exported wholesale into
  the server's `@/ui`; adding copy to it would push review strings into every
  server file that only wanted tokens. No barrel for the new folder either.
- Conceptual path mirrors the registered taxonomy Feature `argument-review`,
  which lives in **this** repo's `docs/taxonomy/`. Layout is
  `src/ui/<feature-conceptual-path>/<purposeful-filename>.ts` so other surfaces
  can be added later without redesigning it.

### `consts.ts`

Re-exports the engine-owned labels (`CONCLUSION_VALUE_LABELS`,
`ARGUMENT_OUTCOME_LABELS` from `engine/review/assessment.js`) and adds the client
chrome copy on top, typed against the already-shared `TAssignmentProvenance` /
`TAssignmentPill` (`engine/review/types.ts:13,20`). Re-export, do **not** move —
moving the engine constants would create an `engine → ui` dependency.

Flat `as const` exports. Not a message catalog: there is no localization
requirement, so a key-lookup hop buys nothing.

Every export is prefixed with its feature (`REVIEW_…`, not `ICON_NAMES`).

The module header must restate the three standing wording constraints from
`assessment.ts:16-25,93` — no proof language; nothing implying a granted
inductive step establishes less than an entailment; nothing borrowing the
reader's accept/reject vocabulary. Its strings now sit beside the ones those
rules were written for.

**Composition, not substitution.** `DEFAULT_VALUE_ORIGIN` is interpolated into
two different server tooltips. Export the *fragment* **and** the composed form;
exporting only the finished sentence breaks the other call site.

#### Wording decisions — already made, do not re-open

| String | Decision |
| --- | --- |
| Stance labels | `Agree` / `Disagree` / `Unsure`. Inherited from the relabel epic (requester sign-off). **Add these last** — see *Ordering* below. |
| Default-assignment origin | Mobile's ending wins: *"claims the argument still has to reach start unknown"*, over the server's *"claims still awaiting support start unknown"*. "awaiting support" collides with the stance word; "reach" matches the engine's `reaches-conclusion` → `"Reaches"`. |
| Composed default tooltip | One sentence — **sentence case after the em dash**. The server currently renders `"Default — Derived from …"` because `DEFAULT_VALUE_ORIGIN` starts with a capital. Fix it here rather than freezing it. |
| Publish gate (server-internal) | The longer form: *"Publish this argument first to share reviews."* It names the consequence. |
| `"Your assignment."`, `"Skipped"` | Already identical in both clients; centralize verbatim. |

### `icons.ts`

Exports `REVIEW_ICON_NAMES` (`as const`) and
`TReviewIconName = (typeof REVIEW_ICON_NAMES)[number]`. **Names only** — no
components, no glyphs, no runtime registry.

This is a **new vocabulary both clients adopt**, not the intersection of what
exists. The server's `Iconography` is a nested namespace tree
(`Iconography.Reaction.Upvote.Default`); mobile's `iconGlyph` is flat and its
keys (`inspect`, `stance`) don't match the names the original request proposed
(`claimDetails`, `premiseDetails`). Naming the union is a real design step in
this slice — propose the names, they are the contract the two client slices key
their maps by.

Two corrections from the epic spec, both verified against `tsc`, that change what
you can promise the clients:

1. **`satisfies Record<TReviewIconName, …>` rejects extra keys** (`TS2353`) as
   well as missing ones (`TS1360`). The original request's "clients keep extra
   keys beyond the union" is false. Each client therefore adds a *review-scoped*
   map keyed exactly by the union, beside its existing app-wide icon source.
2. **`proposit-mobile/src/components/icon.tsx` cannot be repointed** at the union
   — its `TIconName` is app-wide (~40 keys). Don't design as if it can.

## Acceptance criteria for this slice

1. Both files exist at the paths above; `src/ui/index.ts` and `package.json` are
   unchanged.
2. `REVIEW_ICON_NAMES` contains no duplicate entry — asserted by **one** test in
   `src/ui/__tests__/`. A duplicate collapses the union silently with no other
   signal. This is the only new test this slice needs.
3. Every export in both files is feature-prefixed.
4. `consts.ts`'s module header restates the three wording constraints.
5. `pnpm run check` passes.
6. Confirm the assumption the epic spec flagged as unverified: the change is
   additive and needs no `@proposit/proposit-core` change. Say so in `outcome.md`.

Tarball resolution from both consumers (criterion 2 of the epic) is verified at
the orchestrator node, not here — it cannot be checked from inside this repo.

## Ordering

Nothing blocks this slice. One sequencing note: the stance labels
(`Agree`/`Disagree`/`Unsure`) come from a sibling epic that runs first, so add
that export **last**, or leave it to a trivial follow-up commit if that epic has
not landed — everything else is independent of it.

## Documentation Sync

`proposit-shared/AGENTS.md` has **no `## Documentation Sync` section**, despite
the repo having `docs/changelogs/` and `docs/release-notes/`. That gap is a
repo-hygiene item of its own, not this slice's work — but evaluate these anyway,
inferred from the sibling repos' sections:

- `docs/changelogs/upcoming.md` — new public sub-path exports.
- `docs/release-notes/upcoming.md` — library-consumer-facing: a new import path.
- `AGENTS.md` → `## Package structure` — the representative sub-path list names
  `./ui`, `./ui/assets`; the review sub-path joins it.
- `AGENTS.md` → `## Key design rules` — record the
  `src/ui/<feature-conceptual-path>/<purposeful-filename>.ts` convention: split
  by path, never by section inside a file; no barrel. State explicitly that this
  sub-path needs **no** `exports` entry, or the existing "include all three
  conditions" rule will invite someone to add a redundant one.

## Adoption

Adopt with `tcw work inbox accept <entry> --title "<Clean Title>"`, then
`tcw work edit <slug> --initiative 2026-08-11-unify-review-copy-and-icon-vocabulary-in-proposit-shared`
— `accept` has no `--initiative` flag and a bare `accept` re-dates the slug.
Verify the resulting `state.yaml` carries the initiative rather than trusting the
command. Work on a feature branch off `main`.

No `capabilities.yaml` sidecar: the epic's spec establishes there is no ledger
delta for any slice — a reader can do exactly the same things afterward.
