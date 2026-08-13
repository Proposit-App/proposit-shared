# Outcome: Declare the seven undeclared cross-platform capabilities in the master

Seven capabilities declared in the runtime-agnostic master, all `Missing`. The
ledger went from 114 entries to 121. Nothing outside `docs/capabilities/` and
this item's own folder changed — no source, no schema, no `package.json`, no
version bump, no publish.

## What landed

| Path                                           | Name                                                  | Status  | Feature            | Subject                                                 |
| ---------------------------------------------- | ----------------------------------------------------- | ------- | ------------------ | ------------------------------------------------------- |
| `arguments/see-that-an-argument-is-curated`    | See that an argument is official curated content      | Missing | argument-browse    | `user/curated-user`, `import-origin`                    |
| `reviews/see-how-other-readers-decided`        | See how other readers have decided a claim or premise | Missing | argument-review    | `review/claim-assignment`, `review/operator-assignment` |
| `arguments/respond-to-a-claim-inline`          | Respond to a claim in support or in counter           | Missing | argument-authoring | —                                                       |
| `arguments/see-an-arguments-topic-tag`         | See an argument's topic as a tag                      | Missing | argument-browse    | —                                                       |
| `arguments/see-status-and-shape-while-reading` | See an argument's status and shape while reading it   | Missing | argument-browse    | —                                                       |
| `profile/see-my-body-of-work-counted`          | See my body of work counted                           | Missing | user-profile       | —                                                       |
| `arguments/know-when-a-version-is-superseded`  | Be told I'm reading a superseded version              | Missing | argument-browse    | —                                                       |

Each carries `Planning doc` pointing at this item. All seven ids minted by the
CLI: `cap-07782a`, `cap-9425ee`, `cap-d8b9d0`, `cap-dced7d`, `cap-d6ff1f`,
`cap-1f9b8e`, `cap-2c54bc`.

## The two wording traps, as resolved

**Curated showcase.** The body names no ornament — not the avatar, not the seal,
not the origin label. It says the user learns the argument is official Proposit
curated content, published under a historical figure's account rather than by an
ordinary user, and closes by stating explicitly that any treatment conveying that
satisfies the entry. Web draws avatar + seal + label; mobile currently draws seal
+ label; both are true of this description, and neither is privileged by it.

**Readership lean.** The asymmetry is stated as the capability, not omitted as an
implementation detail. The body promises a *qualitative* read only — leaning
holds, leaning falls, or split — says nothing appears until enough readers have
decided, states outright that an ordinary reader is never shown a count or a
percentage, and records that raw per-stance tallies are the argument owner's
alone. It closes with the framing the review surface puts in copy: other readers'
decisions do not affect yours. A consumer that shipped counts to everyone would
be *violating* this entry, not exceeding it.

## Judgment calls worth reviewing

- **#3 sits between two standing entries that must not absorb it.**
  `arguments/rebuke-a-premises-claim` is authoring-time, in your own draft;
  `arguments/create-a-counterargument` forks a new draft. The new entry writes a
  premise into the argument you are reading, and is open to any signed-in
  verified reader — not an owner or editor. The body says all three of those
  things so the distinction survives a future reader who has only the ledger.
- **#2 was placed under `reviews/`, not `arguments/`.** The signal is other
  readers' review decisions on both halves — claim reactions, which
  `reviews/set-a-claims-assignment-by-reacting` already declares to *be* review
  assignments, and premise-step operator decisions. The web surfaces are split
  across the argument view and the review wizard; the namespace follows the data
  and the neighbours rather than the screen.
- **No `capabilities.yaml` sidecar.** The gate blocks `complete` when a `new:`
  path still reads `Missing`, and here all seven must stay `Missing` — that is
  what the master means. Writing the sidecar would build a gate this item is
  designed to fail. `Planning doc` on each entry carries the link instead.
- **#7 is unscoped as to audience.** Web gates the notice on the viewer not being
  a participant, so an editor sees editorial notices instead. That carve-out is a
  web layout decision; encoding it in a runtime-agnostic master would push it
  onto every consumer, so the body says when the notice fires and not who gets
  it.
- **#6 does not encode web's `published` filter predicate.** Web's tile counts
  `version > 0 && !published`, which is its own list filter's definition. The
  master says "how many are published, how many are still drafts" and leaves the
  predicate to each consumer.

## Verification

```
tcw capabilities check   →  capabilities OK          (exit 0)
tcw validate             →  validate OK              (exit 0)
tcw capabilities drift   →  no capability drift      (exit 0)
tcw capabilities list    →  121 entries (114 before)
prettier --check docs/capabilities/**/*.md → all files use Prettier code style
git status --short       →  only docs/capabilities/ paths
```

Contradiction sweep run before adding anything: `tcw capabilities search` across
`curated`, `showcase`, `official`, `seal`, `readers`, `lean`, `tally`, `respond`,
`counter`, `topic`, `tag`, `category`, `status`, `hidden`, `moderation`, `count`,
`stat`, `outdated`, `superseded`, `latest`, `version`. **None of the seven
already existed under any name**, and none of the seven contradicts a standing
entry. The only near-collisions were the two deliberate neighbours of #3, left
untouched.

## Not done here, by design

Consumer overrides. `proposit-server` asserts all seven `Supported`;
`proposit-mobile` asserts per behavior, with #2 and #3 staying `Missing`. Both
are separate items on their own nodes.
