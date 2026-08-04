# Add a destructiveAsText colour token so unfilled error controls can meet AA

Surfaced 2026-07-30 while fixing `proposit-server`'s outlined accent buttons. The
server fix landed for `primary` and `warning`; `error`/`destructive` could not be
fixed because the token it needs does not exist here.

## Product changes

Destructive controls that are drawn as text or outline rather than a filled
button are below WCAG AA in **both** colour schemes. Measured on the server's
resolved palette, `destructive` used as text scores:

- light: 4.45 (page) / 4.91 (elevated) / 4.23 (muted)
- dark: 5.15 (page) / 4.66 (elevated) / 4.32 (muted)

It fails the 4.5:1 floor on the page and muted grounds in both schemes.

## Technical changes

`src/ui/colors.ts` declares the `*AsText` family for three accents —
`primaryAsText` (:32), `successAsText` (:43), `warningAsText` (:47) — with the
rationale in the header comment at :10-12: the fill token is too light to use as
text, so `*AsText` is the same hue pushed dark enough to clear AA, and in dark
mode the fill is already safe so the token equals the fill.

`destructive` (:38) has no such sibling. Add `destructiveAsText` to the interface
and to both palettes (light :89, dark :136), following the existing convention.

The existing guard at `src/ui/__tests__/colors.test.ts:61` enumerates every
`*AsText` token and asserts contrast against each background, so a new token is
covered automatically — no new test scaffolding needed. Verify it actually picks
the new token up rather than assuming it.

## Meta changes

The server side is not just a repin — its theme keeps an explicit allowlist. Per
`proposit-server`'s guidance: "To make another accent text-safe, add its
`*AsText` token and extend `ACCENTS_USABLE_AS_TEXT` in `mui-theme.ts` rather
than darkening the fill." So the server change is: extend that allowlist, then
drop the local overrides at the call sites below. The server has its own guard at
`src/ui/__tests__/tokens.test.ts` asserting every `*AsText` token clears AA
against every background it can land on.

Consumers blocked on this, to repin and finish after publish:

- `proposit-server` — 6 outlined/text `color="error"` buttons left untouched:
  `account-management-form.tsx:119`, `argument-header-host.tsx:260`,
  `review-section/index.tsx:158`, `report-queue.tsx:355`, `claim-detail.tsx:981`,
  `share-review-panel.tsx:185`; plus `operator-not-badge.tsx:7` (9px bold
  `error.main`).

Note for whoever picks this up: do NOT "fix" the server side by converting those
buttons to `contained`. `argument-header-host.tsx:256-259` carries an explicit
design comment — counter actions are a clay outline, not a loud fill, so citron
stays reserved for the single forward action. The token is the correct fix.
