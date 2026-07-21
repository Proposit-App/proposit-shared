# Outcome — won't do (2026-07-21)

**Resolution: wontfix.**

This slice existed only to unblock the mobile native premise-graph
(`proposit-mobile/2026-07-13-argument-graph-view-native`, cap
`see-a-premise-graph`). That capability is now deliberately **Omitted** in mobile
(local override `overrides: proposit-shared/cap-41894d`), and its consumer item
is closed wontfix alongside this one. With no consumer, there is no reason to
extract `createArgumentGraph` + the `elkjs` layout out of `proposit-server` into
`@proposit/shared`.

The server keeps its graph code where it is (`proposit-server/src/engine/graph`)
— no change, no parity obligation. If a native graph is ever revived, re-open
this extraction then.

No code changed. DoD items (tests/docs/review/version) N/A for an abandonment.
