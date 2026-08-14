# Plan: Declare the seven undeclared cross-platform capabilities in the master

Seven `tcw capabilities add` calls plus their field sets and bodies. No code.

## Step 0 — precondition (done at spec time)

`tcw capabilities search` run across twenty-one terms; none of the seven exists.
`tcw capabilities check`, `tcw validate`, and `tcw capabilities drift` all clean
on the branch point, so any failure afterwards is this item's doing.

## Step 1 — declare each entry

For each row, in this order:

```
tcw capabilities add <path> "<Name>" --status Missing
tcw capabilities set  <path> --field "Planning doc=2026-08-13-declare-the-seven-undeclared-cross-platform-capabilities-in-the-master"
tcw capabilities set  <path> --field "Feature=<feature>"
tcw capabilities set  <path> --field "Subject=<terms>"   # only where a term genuinely applies
```

| #   | Path                                           | Feature            | Subject                                            |
| --- | ---------------------------------------------- | ------------------ | -------------------------------------------------- |
| 1   | `arguments/see-that-an-argument-is-curated`    | argument-browse    | `user/curated-user`, `import-origin`               |
| 2   | `reviews/see-how-other-readers-decided`        | argument-review    | `review/claim-assignment`, `review/operator-assignment` |
| 3   | `arguments/respond-to-a-claim-inline`          | argument-authoring | —                                                  |
| 4   | `arguments/see-an-arguments-topic-tag`         | argument-browse    | —                                                  |
| 5   | `arguments/see-status-and-shape-while-reading` | argument-browse    | —                                                  |
| 6   | `profile/see-my-body-of-work-counted`          | user-profile       | —                                                  |
| 7   | `arguments/know-when-a-version-is-superseded`  | argument-browse    | —                                                  |

All five Subject terms were resolved with `tcw taxonomy show` first; the nested
ones need their full path (`user/curated-user`, not `curated-user`). All seven
Features are registered `[F]` entries on this node.

## Step 2 — write each `description.md`

The bodies are the deliverable. Constraints they must satisfy, checked one by one
at the end:

- **#1 names no ornament.** No avatar, no seal, no badge — what the user learns,
  not what a platform draws.
- **#2 promises no number to an ordinary reader.** Qualitative lean, the
  enough-readers threshold, the owner-only raw tallies, and the "context for your
  decision, not a verdict on it" framing.
- **#3 does not read as either neighbour.** It must be visibly not
  `rebuke-a-premises-claim` (authoring your own draft) and not
  `create-a-counterargument` (forking). Say that it writes into the argument
  being read and that any verified signed-in reader can do it.
- **#4 says only recognized topics are lifted**, so a naive title split does not
  pass as compliance.
- **#6 says "your own profile"** and describes the fourth figure as reactions
  received, not replies.
- **#7 stays unscoped as to audience** — no promise about who sees it.

## Step 3 — no `capabilities.yaml` sidecar

Skipped deliberately; rationale in `spec.md`. `Planning doc` on each of the seven
carries the link instead.

## Step 4 — verify

```
tcw capabilities check     # expect: capabilities OK
tcw validate               # expect: validate OK
tcw capabilities drift     # expect: no capability drift, exit 0
tcw capabilities list | grep -c .   # expect: baseline + 7
git status --short         # expect: only docs/ paths
```

Then re-read all seven bodies against the Step 2 constraint list before writing
`outcome.md`.
