# Add maxLength caps to unbounded stored free-text schema fields

Tags: `tech-debt`, `product`

Covers argument `title`/`description`, claim `title`, and moderation report
`note`. Escalated by `proposit-server` (epic **server-security-posture-hardening**,
child **api-input-validation-constraint-audit**, Gap B), routed down through the
orchestration root on 2026-07-25.

## Product changes

Yes — each cap is a user-visible input limit where none existed. Treat every
capped field as a `changed:` capability refinement at the point the cap actually
enforces (i.e. once consumers repin), not when the schema lands.

## Technical changes

**Problem.** Several stored user-authored free-text fields are declared as bare
`Type.String()` (no `maxLength`) and land in unbounded Postgres `.text()` columns.
The shared schema is the backend trust boundary for these writes, so an unbounded
string reaches the DB unchecked — a storage-exhaustion surface where one request
can persist an arbitrarily large value.

**Root cause.** The schemas were authored without length constraints; the server
applies them faithfully, so there is no server-side cap to add without changing
the shared schema. The columns are `.text()`, so the DB does not backstop it.

**Affected fields** (schema → server persist → DB column):

| Field | Shared schema | Persisted at (server) | DB column |
|---|---|---|---|
| argument `title` | `schemas/model/arguments.ts` `MutableArgumentFieldsSchema.title` (`Type.String()`) | via `UpdateArgumentRequestSchema` | `migrations/20250212235750_args_initial.ts` `.text()` |
| argument `description` | `schemas/model/arguments.ts` `.description` (`Type.Optional(Type.String())`) | same | `migrations/20260227015915_add_argument_description.ts` `.text()` |
| claim `title` | `schemas/model/claims.ts` (`Type.String()`) | claim persist | `.text()` |
| moderation report `note` | `schemas/api/moderation/index.ts` `ReportContentRequest.note` (`Type.Optional(Type.String())`) | `src/model/moderation.ts:35` | `migrations/20260713193601_moderation_reports_and_blocks.ts:27` `.text().nullable()` |

**Proposed fix.** Add a `maxLength` to each field in its shared schema.

Sizing method: set each cap comfortably above the longest value currently stored
**in production** — query `max(length(col))` per column on prod before choosing —
so no realistic existing row is rejected. First-pass suggestions (verify against
prod, then round up):

- argument `title` → **300** (short single-line titles; local dev max was 70)
- argument `description` → **10_000** (long-form; local dev max was 225)
- claim `title` → **1_000** (sentence-length claims; local dev max was 73)
- moderation `note` → **5_000** (free-text report note)

**Rollout question to settle in the spec.** These newly reject previously-accepted
input. Either do a log-and-accept pass for one release (server logs an over-cap
value but still stores it), confirm nothing legitimate is being clipped, then flip
to hard-reject; or ship hard-enforced with caps sized far enough above real data
that the warn pass is unnecessary. The suggested values already aim for the
latter.

## Meta changes

None.

## Consumer impact

- **proposit-server:** repin after publish; the existing `parseRequest` /
  `Value.Parse` call sites then enforce the caps automatically — no server code
  change beyond the repin. An over-cap body returns 400 at the API. Server already
  validated this pattern in the Gap A fix. Tracked as
  [the server repin item](tcw://W/proposit-server/2026-07-20-repin-proposit-shared-after-security-escalations-publish-maxlength-caps-isplatformdisabled),
  which is blocked on this item publishing.
- **proposit-mobile:** the mobile write forms for these fields should add a
  matching UX `maxLength` (soft mirror; the backend cap is the real control). A
  mobile-node escalation should follow once the caps are set.

## Test cases

- Schema unit test per field: `Value.Check(Schema, { title: "x".repeat(cap + 1) })`
  is `false`; at exactly `cap` it is `true`.
- Server post-repin spot-check (belongs to the server item, listed here for
  traceability): PATCH/POST an over-cap `title`/`note` → 400 with the validation
  error envelope; at-cap → 2xx.

## Dedupe note

The shared work board (inbox/backlog/active/completed) was checked on 2026-07-20 —
no existing item covers these caps. The inbox item
`2026-07-20-remove-mis-specified-choose-a-username-at-registration-capability` is
unrelated (a capability-master removal, not a length cap).

The username field already has a hard backend cap (`/^[\w-]{0,32}$/` in
`consts/identity.ts`, enforced imperatively in the server's `src/model/user.ts`) —
**out of scope here**. Folding that regex into `UserModifyRequest.username`
declaratively is a separate optional defense-in-depth item.
