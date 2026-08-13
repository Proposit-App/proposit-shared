# Spec: Declare the seven undeclared cross-platform capabilities in the master

Ledger-only. No source, no schema, no version bump, no publish.

## Problem

Seven user-facing behaviors the web app ships are described by no capability on
any node. The parity epic measures gaps as `(mobile Missing) ∩ (server
Supported)`, so a behavior neither ledger carries a row for is invisible from
both sides — and a consumer may not declare a cross-platform capability locally,
so mobile cannot record a status for any of them until the master declares them.

`tcw capabilities search` was run for `curated`, `showcase`, `official`, `seal`,
`readers`, `lean`, `tally`, `respond`, `counter`, `topic`, `tag`, `category`,
`status`, `hidden`, `moderation`, `count`, `stat`, `outdated`, `superseded`,
`latest`, and `version`. **None of the seven already exists**, under any name.

## Capability changes

Seven new entries, all seeded `Status: Missing`. The master is runtime-agnostic
and asserts no support of its own — every one of its ~107 existing entries reads
`Missing` for that reason. Consumers assert reality by overriding:
`proposit-server` asserts all seven `Supported`; `proposit-mobile` asserts per
behavior, with #2 and #3 staying `Missing` deliberately. Both are separate items
on their own nodes and are out of scope here.

| Path                                            | Name                                                | Feature          |
| ----------------------------------------------- | --------------------------------------------------- | ---------------- |
| `arguments/see-that-an-argument-is-curated`     | See that an argument is official curated content     | argument-browse  |
| `reviews/see-how-other-readers-decided`         | See how other readers have decided a claim or premise | argument-review |
| `arguments/respond-to-a-claim-inline`           | Respond to a claim in support or in counter          | argument-authoring |
| `arguments/see-an-arguments-topic-tag`          | See an argument's topic as a tag                     | argument-browse  |
| `arguments/see-status-and-shape-while-reading`  | See an argument's status and shape while reading it  | argument-browse  |
| `profile/see-my-body-of-work-counted`           | See my body of work counted                          | user-profile     |
| `arguments/know-when-a-version-is-superseded`   | Be told I'm reading a superseded version             | argument-browse  |

### No `capabilities.yaml` sidecar — deliberate

The completion gate blocks `tcw work complete` when a path under `new:` still
reads `Missing`. On this node all seven **must** stay `Missing`: that is what the
master means. A `new:` sidecar would therefore be a gate this item is designed to
fail. The work↔capability link is carried the other way instead, by
`Planning doc=<this slug>` on each of the seven, which is the forward pointer the
capabilities process prescribes for a newly declared entry.

## How each entry's wording and namespace was decided

Every description was written after reading the web source it describes, not from
the request's summary. Namespace follows the nearest standing neighbours.

**1 · `arguments/see-that-an-argument-is-curated`** — `arguments/` because it is a
recognition-while-browsing behavior, next to `see-ai-generated-disclosure` and
`see-where-content-came-from`; `Feature: argument-browse` matches both.

The wording trap: web draws the creator's avatar *and* a seal
(`argument-card.tsx:351-408`) plus a "Curated showcase" origin label
(`origin.tsx:65-67`); mobile ships the seal and the label, with the avatar
landing separately. So the description names **no ornament** — it says what the
user learns (this is official Proposit curated content, not an ordinary user's
argument) and where they learn it (in the list, and while reading). Any platform
that conveys that satisfies the entry, whatever it draws. `Subject` links
`user/curated-user` (the synthetic accounts curated work publishes under) and
`import-origin` (the `platform` field the treatment keys off).

**2 · `reviews/see-how-other-readers-decided`** — `reviews/`, not `arguments/`,
because the signal *is* other readers' review decisions: the claim side rolls up
claim reactions, which `reviews/set-a-claims-assignment-by-reacting` already
declares to be review assignments, and the premise side rolls up operator
decisions. It sits beside `reviews/see-each-claims-assignment` and
`reviews/decide-a-premise-while-reading`; `Feature: argument-review`,
`Subject: review/claim-assignment, review/operator-assignment`.

The wording trap: the asymmetry is the capability. `claim-verdict-meter.tsx:38`
and `premise-decision-tally.tsx:21` both gate on four or more decisions and both
are, in their own words, "deliberately number-free" — an ordinary reader gets
"leaning holds", "leaning falls", or "split", never a count or a percentage.
Raw per-stance tallies render only behind `userRole === "owner"`
(`claim-stance-control.tsx:160,183,214`). A description promising "see the
counts" would misdescribe what almost every user gets, so the description states
the qualitative read, the enough-readers threshold, the owner-only exception, and
the framing the review wizard adds in copy — that the lean is context for your
own decision, not a verdict on it (`premise-decision-tally.tsx:81`).

**3 · `arguments/respond-to-a-claim-inline`** — `arguments/`, because it happens
while reading an argument, not while authoring your own draft.
`Feature: argument-authoring`, because what it produces is a premise.

This is where the two nearby standing entries must **not** be widened:
`arguments/rebuke-a-premises-claim` is scoped "while authoring, rebuke a claim in
your draft", and `arguments/create-a-counterargument` forks a whole new draft.
This third thing is neither: `executeClaimResponse` (`rebuke.ts:24,31,85`) writes
a premise into **the argument being read**, concluding the claim for Support or
its negation for Counter, antecedent left open. It is gated on
`sessionProvider.canWrite` — any signed-in verified reader, not an owner or
editor (`session-context.tsx:22-24`) — so the description says so rather than
implying an authoring permission.

**4 · `arguments/see-an-arguments-topic-tag`** — `arguments/`,
`Feature: argument-browse`, alongside `see-metadata-in-the-list`. The description
records the one non-obvious behavior: only a **recognized** topic prefix is
lifted out of the title (`argument-card.tsx:65-91` allowlists fourteen), so a
title that merely starts with a word and a colon is left verbatim. Without that,
a consumer could implement a naive `split(":")` and honestly believe it complied.

**5 · `arguments/see-status-and-shape-while-reading`** — `arguments/`,
`Feature: argument-browse`. This is the reading-view counterpart to
`see-metadata-in-the-list`, and the name says "while reading it" to keep the two
distinguishable. Content taken from `argument-header-host.tsx:335-360`
(Published/Draft, premise count, claim count) and `:304` (the moderation Hidden
marker).

**6 · `profile/see-my-body-of-work-counted`** — `profile/`,
`Feature: user-profile`, next to `see-my-signed-in-identity`. Scoped to **your
own** profile: `page.tsx:73-93` computes the rail from the signed-in user's own
arguments. The fourth figure is described as "reactions your arguments have
received" because that is what it sums — up- and downvotes across your arguments
(`:84-87`), not replies. Web's exact `published` filter predicate is not encoded;
it is a web-side definition, and the master is runtime-agnostic.

**7 · `arguments/know-when-a-version-is-superseded`** — `arguments/`,
`Feature: argument-browse`, beside `see-version-history`,
`see-what-changed-between-versions`, and `see-a-prior-version-when-denied`, which
all live there. Content from `details.tsx:256-269`: told plainly, with a link to
the current version.

Noted but deliberately not encoded: web gates this notice on `!userParticipant`,
so an editor of the argument sees editorial notices instead. The description is
written unscoped as to audience rather than promising it to everyone — stating
web's participant carve-out in a runtime-agnostic master would push a web layout
decision onto every consumer.

## Non-goals

- **No consumer overrides.** `proposit-server` and `proposit-mobile` assert their
  own statuses on their own nodes, as their own items.
- **No status other than `Missing`.** #2 and #3 stay `Missing` on mobile on
  purpose; that is the consumers' business.
- **No widening of `arguments/rebuke-a-premises-claim` or
  `arguments/create-a-counterargument`** to absorb #3. They are three different
  actions.
- **No source, schema, `package.json`, or publish activity.**

## Acceptance criteria

1. All seven exist at the paths above, `Status: Missing`, each with a `Feature`
   that resolves and `Planning doc` pointing at this item.
2. `tcw capabilities check` and `tcw validate` pass.
3. `tcw capabilities drift` still exits zero.
4. No description names a platform-specific ornament, and none promises raw
   counts to an ordinary reader.
5. Nothing outside `docs/` is modified.
