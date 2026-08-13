---
from: proposit-app
---

> Routed by the orchestrator on 2026-08-13.

# Own the recognized-topic allowlist in shared so both clients read one copy

## Problem

`proposit-shared/arguments/see-an-arguments-topic-tag` cannot be realized on
mobile. The capability's whole content is a recognition rule — "only a
*recognized* topic is lifted out of the title; a title that merely begins with a
word and a colon is left exactly as written" — and that rule exists in only one
place, inside a web component.

## Root cause

The allowlist and the parse live in
`proposit-server/src/components/client/arguments/argument-card.tsx:65-91`:

- `KNOWN_TOPICS`, a 14-entry `Set` (Ethics, Science, Technology, Politics,
  Philosophy, Economics, Society, Culture, Health, Environment, Law, Education,
  Religion, History)
- `splitCategory(title)`, which matches `^([A-Z][A-Za-z]+):\s+(.+)$` and returns
  `{ category, title }` only when the captured prefix is in the set.

The same pair is repeated in
`.../view/[argumentId]/[version]/components/text-view-hosts/argument/argument-header-host.tsx`
for the argument header, so web already carries it twice.

`@proposit/shared@0.68.0` exports neither. `grep -rniE "topic|splitCategory"
node_modules/@proposit/shared/dist` returns only an unrelated fixture.

## Proposed fix

Promote both into `@proposit/shared` — the allowlist as a const and the parse as
a pure function returning `{ topic: string | null; title: string }`. Web replaces
its two copies with the import; mobile imports the same one.

The data model has no `category` column, so this is a title parse by necessity;
a real column would supersede it. That does not change where the rule should
live in the meantime.

## Consumer impact

- `proposit-server`: two local copies deleted, replaced by the import. No
  behavior change if the promoted set and regex are byte-identical to the
  current ones.
- `proposit-mobile`: unblocks `see-an-arguments-topic-tag`, which is `Missing`
  here and is one of the two entries still holding the mobile-parity epic open.
  Mobile deliberately did **not** copy the list — a second copy of a "which
  prefixes are topics?" rule is this workspace's recurring defect shape and has
  already bitten three times in this epic.

## Test cases

- `"Ethics: Why X"` parses to topic `Ethics`, title `Why X`.
- `"Re: your point"` parses to topic `null`, title unchanged — `Re` is not in
  the allowlist.
- `"Kant: the categorical imperative"` parses to topic `null`, title unchanged.
- `"A title: with a colon in the middle"` — no leading allowlisted prefix, title
  unchanged.
- Lowercase and multi-word prefixes never match (the regex requires a single
  capitalised word).
- Web renders exactly what it rendered before the promotion, on both the catalog
  card and the argument header.
