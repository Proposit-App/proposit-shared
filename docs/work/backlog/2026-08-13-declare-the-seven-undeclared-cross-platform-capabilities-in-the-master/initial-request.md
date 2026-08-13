# Declare the seven undeclared cross-platform capabilities in the master

## Product changes

TBD

## Technical changes

TBD

## Meta changes

TBD

## Inbox contents

### Inbox manifest

- `2026-08-12-declare-the-seven-undeclared-cross-platform-capabilities-in-the-master.md`

### Inbox body

---
from: proposit-app
initiative: 2026-08-12-close-the-remaining-mobile-gaps-vs-the-web-app
---

# Declare the seven undeclared cross-platform capabilities in the master

Supersedes the escalation
`2026-08-12-declare-the-curated-showcase-capability-in-the-shared-master`, which
asked for the first of these seven. Batched deliberately: each undeclared
capability otherwise costs three items (declare here, assert on server, build on
mobile), and there are seven.

## Problem

Seven user-facing behaviors the web app ships are described by **no capability on
any node**. The mobile-parity epic measures gaps as
`(mobile Missing) ∩ (server Supported)`, so a behavior neither ledger describes is
invisible from both sides. One was found because a human remembered it; the other
six by an audit that went looking.

Until they are declared, mobile cannot record a status for them at all — a
consumer may not declare a cross-platform capability locally.

## Product changes

Declare each in the master, seeded `Status: Missing` (the master is
runtime-agnostic and asserts no support of its own), with a `Feature` link where
one fits. Consumers assert their real status by overriding.

Namespace suggestions are advisory — place them where they sit best alongside the
existing master.

| # | Behavior | Web evidence |
|---|---|---|
| 1 | **See that an argument is curated showcase content** — Proposit's own historical-figure work is marked as official. | `proposit-server/src/components/client/arguments/argument-card.tsx:351-408`; origin label `.../argument/origin.tsx:65-67` |
| 2 | **See how other readers have decided a claim or a premise** — a qualitative readership lean, never a raw number, once enough readers have weighed in. | `.../components/claim-verdict-meter.tsx:32-83` (threshold `:38`, labels `:45`); `proposit-server/src/components/client/review/premise-decision-tally.tsx:21-59` |
| 3 | **Respond to a claim inline, in support or in counter** — an inline composer on a published argument; support concludes the claim, counter concludes its negation. | `.../components/claim-respond-composer.tsx:42-247`; `.../text-view-hosts/claim/rebuke.ts:24,31,85` |
| 4 | **See an argument's topic as a tag** — a known topic prefix is lifted out of the title and shown as a category chip. | `argument-card.tsx:65-91`, chip `:379-394`; header `.../argument/argument-header-host.tsx:262-281` |
| 5 | **See an argument's status and shape while reading it** — Published/Draft, premise and claim counts, and a Hidden marker on a moderation-hidden version. | `.../argument/argument-header-host.tsx:335-360`; hidden chip `:304` |
| 6 | **See my own body of work counted** — arguments, published, drafts, reactions received. | `proposit-server/src/app/profile/page.tsx:73-93` |
| 7 | **Be told I am reading a superseded version** — with a link to the latest published one. | `proposit-server/src/components/client/argument/details.tsx:256-269` |

### A wording trap on #1 and #2

**#1** — web's treatment includes the **creator's avatar** and the seal; mobile
currently ships the seal and the origin label, with the avatar pending a repin. A
master description that names the avatar would be untrue of mobile. Word the
capability around *what the user learns* — that this is official curated content —
not around the specific ornaments either platform draws.

**#2** — web deliberately shows the lean **qualitatively** to ordinary readers and
the raw tallies **only to the argument's owner** (`claim-stance-control.tsx:160,183,214`),
and the review wizard adds "Their decisions don't affect yours." That asymmetry is
the capability, not an implementation detail; a description promising "see the
counts" would misdescribe what most users get.

## Technical changes

None. This is a ledger-only change: `tcw capabilities add <ns/path> "<Name>"
--status Missing`, plus `Feature=` / `Subject=` links. No source, no schema, no
publish.

## Consumer impact

- `proposit-server` asserts all seven `Supported` — it already ships every one.
  Tracked as `2026-08-12-assert-the-newly-declared-capabilities-and-correct-two-dishonest-ledger-entries`.
- `proposit-mobile` asserts per behavior: #1 and #4–#7 become `Supported` as their
  builds land; **#2 and #3 are declared `Missing`** and tracked as their own items
  rather than built in this epic.

## Test cases

- `tcw capabilities check` and `tcw validate` pass on this node.
- Each of the seven resolves by path from both consumers, so each can override it.
- No description asserts a platform-specific ornament that only one consumer draws.
