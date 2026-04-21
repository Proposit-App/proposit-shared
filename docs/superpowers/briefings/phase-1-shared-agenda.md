# proposit-shared — Phase 1 Agenda

**Cross-repo overview:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-04-21-phase-1-remaining-overview.md` — read first. This briefing is shared's slice.

## Where shared fits

Shared owns work in one of the three remaining sub-projects, conditionally:

- **1C — mobile auth:** if `proposit-server` introduces a new mobile-session endpoint, shared owns the TypeBox request/response schemas.
- **1D — mobile read + review loop:** no expected work. Existing schemas cover it.
- **1E — publish pipeline:** no work.

Current baseline: `@proposit/shared@0.2.1` on main + public npm, with factory (`createApiClient`) + exports-map `default` conditions. `@proposit/proposit-core@0.9.1` is the pinned peer dep.

## 1C — Conditional schema work

**Wait for** `proposit-server` agent to post a `DECISION: auth endpoint → <choice>` message on the `phase-1-1c-auth` broker conversation. Until that decision lands, you have nothing to do.

### Case A — Server introduces a new mobile-session endpoint

Your job: add TypeBox request/response schemas. Likely shape (confirm in the broker conversation with server):

Create `src/schemas/api/auth/mobile-session.ts`:

```ts
import { Type } from "typebox"

export const TMobileSessionRequest = Type.Object({
    provider: Type.Union([
        Type.Literal("google"),
        Type.Literal("twitter"),
        // others as server supports them
    ]),
    providerToken: Type.String(),
})

export type TMobileSessionRequest = typeof TMobileSessionRequest.static

export const TMobileSessionResponse = Type.Object({
    token: Type.String(),
    expiresAt: Type.String({ format: "date-time" }),
})

export type TMobileSessionResponse = typeof TMobileSessionResponse.static
```

Expose via a new barrel `src/schemas/api/auth/index.ts` and add an exports-map entry `./schemas/api/auth` with `types` + `import` + `default` conditions (see shared's existing exports pattern — every entry has all three).

Update `package.json` exports and `CLAUDE.md` "Package structure" list.

**Publish process:**

1. Spec + plan in the normal locations.
2. Run `pnpm run check` — all 170 tests + typecheck + lint + build green.
3. Tarball dry-run into `proposit-server` if server needs to validate the shape before mobile consumes it.
4. Version bump: `pnpm version minor` — `0.2.1 → 0.3.0`. Minor bump because pre-1.0 convention allows breaking changes on minor; this is an additive change, so the minor is conservative but correct under the convention.
5. `pnpm publish --access public` (human completes OTP).
6. Push branch + tag.
7. Open PR → main, merge.
8. Post `READY: @proposit/shared@0.3.0 published with TMobileSessionRequest/Response under /schemas/api/auth` on the broker.

### Case B — Server reuses NextAuth cookies

Your job: nothing. Document the decision in the broker conversation reply (acknowledge the `DECISION:`) and stand down.

## 1D and 1E — Standby

No planned work in either. Watch `phase-1-1d-read-review` only if you're curious — not required.

## Conventions

- **Broker signals:** `READY:`, `BLOCKED:`, `DECISION:`, `QUESTION:`. See the overview doc §3.
- **Exports-map discipline:** every new exports entry gets `types` + `import` + `default` conditions. This was the fix shipped in 0.2.1; don't regress it when adding new entries.
- **Pre-1.0 versioning policy** (per `CLAUDE.md`): minor bumps may include breaking changes. New additive schemas + exports entries qualify as minor. This doesn't break existing consumers because the new entry is a new sub-path; existing imports are untouched.
- **Spec/plan pattern:** `<repo>/docs/superpowers/specs/` and `<repo>/docs/superpowers/plans/`.
- **Branching:** `phase-1/pr-1c-mobile-auth-shared` feature branch. PR to main. No integration branch needed.

## What good progress looks like

- Watch the `phase-1-1c-auth` broker conversation. Within ~1 day of server posting the audit, you should know whether you have work.
- If you have work: schema + publish + merge within ~3-5 days. The change is small; most of the time is coordination + publish ceremony.
- If you don't have work: cleanly stand down with a single acknowledgment on the broker.

## Follow-up note (not this phase)

Mobile's CLAUDE.md documents a typebox + `babel-preset-expo` transform bug: under mobile Jest tests, importing from `@proposit/shared/consts` (barrel) triggers a chain through `typebox` which `babel-preset-expo`'s Object-rename pass breaks. This is NOT a shared-package bug — it's a mobile toolchain interaction. No action required on shared unless the investigation later concludes that changing how shared exposes schema modules (e.g., not re-exporting typebox types in a particular way) would help. For now, the note exists so you don't accidentally chase it.
