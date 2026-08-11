# Outcome — Add the shared review copy and icon-name modules under ui/argument/review

Branch `shared-review-copy-and-icon-names`, off `main` at `5a22bbb`. Nothing
pushed.

## What shipped

| Task | Commit | What |
| --- | --- | --- |
| 1 | `b868c19` | `src/ui/argument/review/icons.ts` — `REVIEW_ICON_NAMES` + `TReviewIconName` — and its only test, `src/ui/__tests__/argument-review-icons.test.ts` (no duplicate entry) |
| 2 | `c297eb7` | `src/ui/argument/review/consts.ts` — header, engine re-exports, `REVIEW_PILL_LABELS`, `REVIEW_DEFAULT_VALUE_ORIGIN`, `REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP`, `REVIEW_PROVENANCE_TOOLTIPS` |
| 3 | `13784b7` | `REVIEW_STANCE_LABELS`, on its own as planned — the words come from the sibling relabel epic |
| 4 | `877ea7f` | Documentation Sync block: `docs/changelogs/upcoming.md`, `docs/release-notes/upcoming.md`, `AGENTS.md` (two sections) |

Preceded by `ed150e0` (`spec.md`) and `f4d303e` (`plan.md`).

### Exported surface, as built

```
@proposit/shared/ui/argument/review/consts
  CONCLUSION_VALUE_LABELS          re-export (engine/review/assessment.js)
  ARGUMENT_OUTCOME_LABELS          re-export (engine/review/assessment.js)
  REVIEW_PILL_LABELS               Record<TAssignmentPill, string>
  REVIEW_DEFAULT_VALUE_ORIGIN      string   (fragment, sentence-initial)
  REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP string  (composed, one sentence)
  REVIEW_STANCE_LABELS             as const {agree, disagree, unsure}
  REVIEW_PROVENANCE_TOOLTIPS       Record<TAssignmentProvenance, string>

@proposit/shared/ui/argument/review/icons
  REVIEW_ICON_NAMES = ["conclusionAxis", "argumentAxis"] as const
  TReviewIconName = (typeof REVIEW_ICON_NAMES)[number]
```

Read out of the built `dist/` rather than the source, so the values below are
what a consumer receives:

- `REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP` = `"Default — derived from how this claim
  is used: grounded claims (citations, axioms, and claims they directly
  support) start true; claims the argument still has to reach start unknown."`
  — lowercase after the em dash, one sentence, mobile's ending.
- `REVIEW_DEFAULT_VALUE_ORIGIN` is the same text from `"Derived"` on. Both are
  built from one module-private body written without its first letter, so they
  cannot drift.
- `REVIEW_PROVENANCE_TOOLTIPS.user` = `"Your assignment."`

## Verification

`pnpm run check` — exit `0`:

```
Checking formatting...
All matched files use Prettier code style!
 Test Files  125 passed (125)
      Tests  1203 passed (1203)
   Duration  3.20s
> pnpm run gen:fixtures && rm -rf dist *.tsbuildinfo && pnpm exec tsc -p tsconfig.build.json
gen:fixtures — wrote …/src/fixtures/historical-figures/content.generated.ts (4 figures, 4 arguments)
```

`git diff main --stat` — only the intended files; no `package.json`, no
`src/ui/index.ts`:

```
 AGENTS.md                                       |   4 +-
 docs/changelogs/upcoming.md                     |  42 ++++++
 docs/release-notes/upcoming.md                  |  20 +++
 docs/work/…/{initial-request,plan,spec}.md      | 228 +++++++++++
 docs/work/…/state.yaml                          |   2 +
 src/ui/__tests__/argument-review-icons.test.ts  |  11 ++
 src/ui/argument/review/consts.ts                |  89 ++++++++++++
 src/ui/argument/review/icons.ts                 |  33 +++++
```

Sub-path resolution was checked as far as this repo can: the build emits
`dist/ui/argument/review/{consts,icons}.{js,d.ts}`, which `"./ui/*"` →
`"./dist/ui/*.js"` maps `@proposit/shared/ui/argument/review/consts` onto, and
`"files": ["dist"]` ships it. Both modules were imported from `dist/` in a
standalone Node process and printed their values. Resolution *from an installed
tarball in each consumer* remains the orchestrator's criterion.

### The epic's flagged-unverified assumption

**Confirmed: this change is additive and needs no `@proposit/proposit-core`
change.** Grounded in the built output, not the file list: the emitted
`dist/ui/argument/review/consts.d.ts` imports only
`../../../engine/review/types.js` and re-exports from
`../../../engine/review/assessment.js`; `icons.d.ts` imports nothing. No
`@proposit/proposit-core` type crosses the new public surface, and the
transitive core types those engine modules already use are on paths that ship
today. Nothing was removed or renamed, so no consumer breaks by not repinning
core.

## Documentation Sync

`AGENTS.md` has **no `## Documentation Sync` section**, so there were no
triggers to read — the four entries below were **inferred** from the sibling
repos' sections and from what this repo maintains, per the delegated brief.
Adding the section is a repo-hygiene item of its own and was left out of scope.

- `docs/changelogs/upcoming.md` — new import path, the export list, the two
  wording resolutions, and why `package.json` is untouched.
- `docs/release-notes/upcoming.md` — written for a consuming app author: where
  the review copy and the icon vocabulary now live, and the two words that
  changed.
- `AGENTS.md` → `## Package structure` — `./ui/argument/review/*` joins the
  representative sub-path list.
- `AGENTS.md` → `## Key design rules` — two rules added: a path under an
  existing wildcard is **not** a new subpath and needs no `exports` entry
  (otherwise the standing "include all three conditions" rule invites a
  redundant one), and UI modules split by path with no barrel and no
  `src/ui/index.ts` entry.

Version cross-check before appending: `package.json` at `0.66.0`, both
`v0.66.0.md` files present, both `upcoming.md` files empty. No rotation.

## What the code disproved, and open notes

Nothing in the brief or the epic spec was contradicted by the code. Three
things it left to this stage, decided and recorded in `spec.md`:

1. **`REVIEW_ICON_NAMES` is two names.** The epic called naming the vocabulary
   "a real design step", and the grep it asked for narrows it hard: the whole
   of `proposit-mobile`'s review surface draws exactly three icons — the two
   assessment-axis marks (`src/components/review-axis-icons.tsx`, used at
   `review-chips.tsx:356,420`) and the stance-menu trigger
   (`claim-stance-control.tsx:126,205`) — while `grep -rl Icon src/reviews/
   src/screens/review-*.tsx` returns nothing at all. The axis marks are the
   only review concept both clients mark, and mobile's artwork is vendored from
   the same Material source as the web app's for exactly that reason
   (`review-axis-icons.tsx:4-6`), a cross-platform claim nothing currently
   checks. The stance affordance is not a third name: mobile has one trigger,
   the server has three vote buttons, and the epic's non-goals keep the control
   shapes different. Any assignment-value or operator name would have obliged
   the mobile slice to invent artwork it renders nowhere, which criterion 13
   ("copy-only") forbids. The union grows by adding a name — a compile error in
   both repos until both map it.
2. **The publish-gate sentence is not exported.** The brief's table marks it
   *server-internal*, epic criterion 10 scopes it to one server file, and
   mobile's nearest string gates a local draft on auth (epic `## Notes`,
   correction 5). A string only one consumer would import is exactly what this
   repo's `AGENTS.md` says to push back on. The server slice deduplicates it
   locally; nothing here blocks that.
3. **The fragment and the composed sentence share one copy of the words.**
   Both are exported as the brief requires, but writing the sentence twice
   three lines apart is the very defect the epic exists to fix, so the body is
   declared once without its first letter and the two exports supply `D` and
   `d`.

`REVIEW_PILL_LABELS` carries a `contested` key at runtime, inherited from
spreading `CONCLUSION_VALUE_LABELS` — the same shape both clients build today.
It is invisible to a typed consumer (`Record<TAssignmentPill, string>`), and
narrowing it would change what the clients get for no gain.

Not runnable here, by construction: nothing in this repo consumes the new
module, so `tsc` and the duplicate test are its only exercise. The two client
slices are where a wrong string or a missing icon name would show up.
