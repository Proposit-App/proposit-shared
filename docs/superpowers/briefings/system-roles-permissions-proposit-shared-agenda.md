# System Roles & Permissions — `proposit-shared` agenda

**Initiative:** `system-roles-permissions` · **Repo role:** primary (permission vocabulary + ability factory) · **Status:** Phase 0 research spike → vocabulary + factory.

Overview spec (workspace root, not in this repo): `docs/superpowers/specs/2026-06-02-system-roles-permissions-overview.md`. You will not have that path locally; the orchestrator relays its contents on request. This briefing is your entry point.

## Capability changes

**`proposit-shared` adds NO `capabilities.md` for this initiative** — a deliberate decision. `capabilities.md` document _user-facing application surfaces_; this repo ships an enforcement primitive and an SDK. You own the permission rules as **code** at a new `@proposit/shared/permissions` sub-entry. The user-facing capability docs live in `proposit-server` route folders and in the orchestrator's product layer — not here. So your **first implementation-branch commit does NOT touch any `capabilities.md`** (the generic process-inbox-initiative "first commit reconciles caps" clause is server-only on this initiative).

## Single-agent constraint

You are the **sole** `proposit-shared` agent for this initiative. You own this repo's research, spec feedback, implementation, code review, and integration support end-to-end. Use **subagents** for read-only research and for code review (the dual-review strategy below) — do **not** ask the orchestrator to spawn a separate top-level researcher, reviewer, or second dev for this repo.

## Your first task — Phase 0 research spike (read-only; no code)

Resolve the dependency fork before any vocabulary is written. Spin up a research subagent (read-only + web) to answer, with citations:

1. **`@casl/ability`** — current published version; is it ESM-native and compatible with `lib: ["ES2022"]` / `"type": "module"`? Bundle/install size. **React Native compatibility** (pure JS, no Node/DOM globals?). The **rule-serialization API** (`pack`/`unpack` / `rulesToQuery`) — shape and stability. Peer-dep footprint.
2. Sketch what a **~100-line in-house ability** of the same shape would cost to own instead (the `can(action, subject, conditions?)` + condition-matching surface we actually need), so the tradeoff is concrete.
3. **Permission-id convention** — confirm **colon** ids (`argument:delete`) as canonical; this matches what's persisted in the server's `systemRoles` table and referenced across the codebase. (Grounding: `src/consts/roles.ts` `SystemRoles` already uses colon ids.)

Return a synthesized **ADR** (recommendation + evidence + risks) to the orchestrator via `SendMessage`. Do **not** add the dependency or write the module yet — the orchestrator folds the ADR into the overview spec and the user makes the call at the human-check gate.

## Phase 1 (after the spike + per-slice spec + dual-review + human check)

New `@proposit/shared/permissions` sub-entry:

- `TAction` (`create/read/update/delete/hide/unhide/publish`), `TSubject` (`Argument`/`User`/`Account`/`RegistrationInvitation`/`all`), `TPermissionContext` (`systemPermissions: Set<string>` + per-subject relationship context).
- `defineAbilityFor(ctx)` — system roles short-circuit to allow (`admin:full-access` ⇒ manage-all; `argument:hide`/`unhide`/`delete` ⇒ the matching action on `Argument`); relationship + state rules expressed as conditions (anyone reads a published argument; participants read/edit unpublished ones — generalizing `canEditArgument`). Decide per use-case between **per-context ability** (build for one `(user, argument)` — mutations) and **subject-stamping** (stamp `participantRole` onto the subject — feeds).
- Re-home `canEditArgument(role, published)` (`src/consts/roles.ts:51`) on top of the ability so there is one mechanism, not a pile of `canX` helpers. Keep predicates named `can*`/`check*`; reserve `assert*` for the server's throwing wrappers.
- **Exhaustive pure-function table tests** over `(systemPermissions × participantRole × object-state × action)` — cheap because the resolver is pure. Cover every short-circuit and every relationship/state rule.
- `pnpm version` bump; add the `./permissions` subpath to `package.json` `exports` with all three conditions (`types`/`import`/`default`).

## Constraints (repo baseline — not exhaustive)

- `lib: ["ES2022"]`; **no `react`/`react-native`/`next`/`expo` deps** (a pure-JS `@casl/ability` is permissible _iff_ the spike clears it). No DOM/Node-only globals in `dist/` source.
- ESM: all relative imports in `src/` end in `.js`; directory imports use the explicit index path.
- `brain-style` (TypeScript sub-skill) for naming/casing. superpowers plugin baseline: TDD, systematic-debugging, verification-before-completion.
- **Dual-review** before reporting a slice done: a non-Claude model pass (qwen3.6 via Ollama) + a Claude subagent pass, synthesized — run inside your own session via subagents.
- **Publish is consumer-validation-gated** (orchestrator-coordinated): the new `@proposit/shared` is tarball-validated in `proposit-server` before `pnpm publish`. You publish **ahead of** server adoption.

## References

- `src/consts/roles.ts` — `SystemRoles` (colon ids), `SystemRolePresets`, `ParticipantRoles`, `canEditArgument` (the precedent to generalize).
- `src/api-client/` — SDK surface; `*Impl` docstrings may later carry a one-line `Requires:` note (lightweight, not a `capabilities.md`).
- `package.json` `exports` map — pattern for adding the `./permissions` subpath.
- Archived source brief (full v1 critique, Appendix A): held by the orchestrator at `docs/inbox/.archive/system-roles.md` — request relevant excerpts via `SendMessage`.
