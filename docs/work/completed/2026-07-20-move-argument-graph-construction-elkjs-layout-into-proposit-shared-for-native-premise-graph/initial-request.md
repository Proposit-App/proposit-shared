# Move argument graph construction + elkjs layout into @proposit/shared (for native premise-graph)

Escalated from the mobile capability-gaps epic
(`2026-07-11-close-mobile-capability-gaps-vs-proposit-shared-master`). Blocks the
mobile item `2026-07-13-argument-graph-view-native` (cap `see-a-premise-graph`).

## Problem

The argument→graph construction (`createArgumentGraph`) and the `elkjs` layout
(`getLayoutedElements`) live in **`proposit-server/src/engine/graph`**
(server-local, consumed by the web `@xyflow/react` graph). Mobile cannot import
server code, and reimplementing graph semantics in mobile would violate the
"platform-agnostic logic belongs in `@proposit/shared`" rule (workspace AGENTS.md).

## Proposed fix

Move the **renderer-agnostic** parts into `@proposit/shared`:
- `createArgumentGraph` (argument model → nodes/edges) — pure data transform.
- The `elkjs` layout wrapper (`getLayoutedElements`) — elkjs is pure JS, runtime
  agnostic; keep the shared boundary free of any DOM/React-Flow/MUI types.
- Shared node/edge types (`TArgumentFlowNode`, `TArgumentFlowEdge`).

Leave the **rendering** (web `@xyflow/react` nodes; future mobile
`react-native-svg`) in each consumer. Server refactors to consume the shared
utils (no behavior change); mobile then builds the native per-premise renderer.

## Consumer impact

- **server**: refactor `src/engine/graph` imports to `@proposit/shared` (parity).
- **mobile**: once shared + published, build the native per-premise graph with
  `react-native-svg` (already a dep) over the shared graph + layout. `elkjs`
  becomes a shared dependency, not a mobile one.
