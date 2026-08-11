# Spec — Add the shared review copy and icon-name modules under ui/argument/review

The delegated brief in `initial-request.md` is binding and is not restated here.
This spec records only what the brief left open: the concrete export names and
signatures, the `REVIEW_ICON_NAMES` vocabulary, and two scope calls the brief's
wording table did not settle.

## Capability changes

**None.** The epic's spec established there is no ledger delta for any slice — a
reader can do exactly the same things afterward. No `capabilities.yaml` sidecar.

## Problem

Per the brief: both clients declare the same review strings independently, most
starkly `PROVENANCE_TOOLTIP` as `Record<TAssignmentProvenance, string>` over the
same shared type with a different `default` value
(`proposit-server/src/components/client/review/review-pills.tsx:251-254` vs
`proposit-mobile/src/arguments/review-chips.tsx:91-95`). This item adds the one
place those strings will live; it changes no client.

## Goals

1. Two new files under `src/ui/argument/review/` holding review copy and a
   review icon-name vocabulary, reachable from an installed tarball with no
   `package.json` edit.
2. Every export feature-prefixed, flat, and typed against the already-shared
   `TAssignmentPill` / `TAssignmentProvenance`.
3. A composed default-provenance tooltip that reads as one sentence, plus the
   fragment it is composed from, so both server call sites keep working.

## Non-goals

- Moving the engine-owned labels. `consts.ts` re-exports them.
- A barrel for the new folder, or any edit to `src/ui/index.ts` or
  `package.json`.
- A message-catalog / key-lookup layer.
- Touching either client. Adoption is the other two slices.

## Design

### `src/ui/argument/review/consts.ts`

Module header restates the three wording constraints from
`src/engine/review/assessment.ts:16-25,86-102` (no proof language; nothing
implying a granted inductive step establishes less than an entailment; nothing
borrowing the reader's accept/reject vocabulary).

Exports, in order:

| Export | Type | Value |
| --- | --- | --- |
| `CONCLUSION_VALUE_LABELS` | re-export | from `../../../engine/review/assessment.js` |
| `ARGUMENT_OUTCOME_LABELS` | re-export | from `../../../engine/review/assessment.js` |
| `REVIEW_PILL_LABELS` | `Record<TAssignmentPill, string>` | `{...CONCLUSION_VALUE_LABELS, skipped: "Skipped"}` — the spread both clients write today |
| `REVIEW_DEFAULT_VALUE_ORIGIN` | `string` | `"Derived from how this claim is used: grounded claims (citations, axioms, and claims they directly support) start true; claims the argument still has to reach start unknown."` |
| `REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP` | `string` | `"Default — derived from how this claim is used: …"` (same body, folded initial) |
| `REVIEW_PROVENANCE_TOOLTIPS` | `Record<TAssignmentProvenance, string>` | `{user: "Your assignment.", default: REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP}` |
| `REVIEW_STANCE_LABELS` | `as const` | `{agree: "Agree", disagree: "Disagree", unsure: "Unsure"}` |

**The fragment and the composed sentence share one copy of the words.** The
brief requires both exports (the fragment is interpolated sentence-initially at
`review-pills.tsx:186`, the composed form is the tooltip at `:253`), and the
epic's criterion 8 requires sentence case after the em dash — so the two differ
only in their first letter. Writing the sentence twice, three lines apart, is
the exact defect this epic exists to fix (cf. the intra-server publish gate at
`share-review-panel.tsx:76,103`). The body is therefore declared once as a
module-private const missing its first letter, and the two exports supply `D`
and `d`.

`REVIEW_STANCE_LABELS` is keyed `agree` / `disagree` / `unsure` rather than by
`TClaimReactionSelection["value"]` (`boolean | null`, not a usable key) — the
same semantic keys mobile's verdict tokens already use
(`theme.colors.verdictAgree`).

**The publish gate is not exported.** The brief's wording table marks it
*server-internal*, the epic's criterion 10 scopes it to one file
(`share-review-panel.tsx`), and mobile's nearest string gates a *local draft on
auth*, a different precondition on a different surface (epic `## Notes`,
correction 5). A string only one consumer would ever import does not belong in
this repo (`AGENTS.md` → *Push back on requests to*). The server slice
deduplicates it locally.

### `src/ui/argument/review/icons.ts`

```ts
export const REVIEW_ICON_NAMES = ["conclusionAxis", "argumentAxis"] as const
export type TReviewIconName = (typeof REVIEW_ICON_NAMES)[number]
```

Names only; no components, no glyphs, no runtime registry.

**Why these two, and only these two.** `satisfies Record<TReviewIconName, …>`
rejects extra keys as well as missing ones, so every name in the union is a
mark each client must actually draw. Grepping both review surfaces for what
they draw today:

- `proposit-server` review surface draws the conclusion-chip mark
  (`Iconography.Argument.Review`, `review-pills.tsx:383`) and the
  argument-chip mark (`Iconography.Argument.Outcome`, `:473`), plus
  assignment-value marks (`:72-83`), operator-decision marks (`:543-544`),
  per-stance vote marks (`claim-stance-control.tsx:153,182,206`) and generic
  chrome (close, copy, expand).
- `proposit-mobile`'s entire review surface draws exactly three icons:
  `ConclusionAxisIcon` and `ArgumentAxisIcon`
  (`src/components/review-axis-icons.tsx`, used at `review-chips.tsx:356,420`)
  and the stance-menu trigger (`claim-stance-control.tsx:126,205`). Its pills,
  its operator and claim decision screens, its done screen and its onboarding
  sheet draw none — `grep -rl Icon src/reviews/ src/screens/review-*.tsx`
  returns nothing.

The two axis marks are the only review concept both clients mark, and they are
also the one pair with a stated cross-platform contract: the mobile artwork is
vendored from Material Symbols specifically "so the same finding is
recognisable on either platform" (`review-axis-icons.tsx:4-6`) — a claim
nothing currently checks. The stance affordance is not a third name: mobile has
one trigger, the server has three vote buttons, and the epic's non-goals keep
the control shapes different. Adding assignment-value or operator names would
oblige the mobile slice to invent artwork it renders nowhere, which criterion 13
("copy-only") forbids.

The union grows by adding a name — which is then a compile error in both client
repos until both map it. That is the intended forcing function, and it is why
starting narrow costs nothing.

## Acceptance criteria

1. `src/ui/argument/review/consts.ts` and `…/icons.ts` exist; `git diff main
   --stat` shows no change to `src/ui/index.ts` or `package.json`.
2. Every export in both files is feature-prefixed (`REVIEW_…`), except the two
   engine re-exports, which keep their engine-owned names.
3. `consts.ts`'s module header restates the three wording constraints.
4. `REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP` has a lowercase letter immediately after
   the em dash, and contains `REVIEW_DEFAULT_VALUE_ORIGIN`'s wording verbatim
   from its second character on.
5. One new test in `src/ui/__tests__/` asserts `REVIEW_ICON_NAMES` has no
   duplicate entry. No other new test.
6. `pnpm run check` passes; the result is pasted into `outcome.md`.
7. `outcome.md` states whether the change needs a `@proposit/proposit-core`
   change (the epic flagged this as unverified).

## Risks

- **Nothing consumes the new module in this repo**, so only `tsc` and the
  duplicate test exercise it. Tarball resolution from both consumers is the
  orchestrator's check, not one this repo can run.
- **The icon vocabulary is the contract two other slices key their maps by.** If
  either client slice finds a review mark that both surfaces draw and this union
  omits, adding it is a shared publish. Mitigated by the grep above being over
  the whole review surface of both repos rather than over the files the request
  named.
- **The stance labels come from a sibling epic.** The words are decided
  (requester sign-off) and mobile already renders them, but the server still
  reads `"Support"` / `"Counter"` (`claim-stance-control.tsx:134,163`). Added
  last, in their own commit, so the rest of the module does not wait on it.
