# Outcome

Both defects closed at the source. One commit of code
(`0bf9e05 feat(ui,utils)!: add successAsText token; stringToColor returns { fill, ink }`),
four files plus docs.

## What shipped

### `successAsText`

`src/ui/colors.ts` — added to `TColorPalette` and both palettes:
`light #557232`, `dark #82a857` (the fill itself, matching how `primaryAsText` / `warningAsText`
are defined in dark). Purely additive; the `success` fill is untouched.

Measured on the built artifact, not just in the test:

| Ground | light `success` (fill) | light `successAsText` | dark `successAsText` |
| --- | --- | --- | --- |
| `background` | 4.17 ✗ | **4.96** | 7.09 |
| `backgroundElevated` | 4.60 | **5.47** | 6.41 |
| `muted` | 3.96 ✗ | **4.71** | 5.94 |

### `stringToColor` → `{ fill, ink }`

`src/utils/utils.ts` — the hash is unchanged, so every existing fill is byte-identical; what
changes is that the fill now arrives with an ink derived from its own WCAG relative luminance,
switched at the crossover point (0.1791) where black and white contrast equally. `"?"` still
yields `#bdbdbd`, now paired like any other fill.

Breaking, deliberately — no fill-only overload was kept. Migration is `stringToColor(n)` →
`stringToColor(n).fill`, and it is a compile error rather than a silent behaviour change.

## Verification

`pnpm run check` green: typecheck, lint, **996 tests across 102 files**, build.

Beyond the suite:

- **Exhaustive sweep of the colour cube** (every third value per channel, ~700k colours): the
  worst pairing of any fill with its luminance-chosen ink is **4.582:1** at `#ae5d6c` — above the
  4.5:1 floor with no exceptions. This is what licenses the claim "every hash", rather than a
  sample.
- **Sweep over 4,005 names** in the test itself, including the two the QA session caught
  (`qa_manual` → 10.97:1, `f` → 5.89:1).
- **The built `dist/` was executed**, not just compiled: `colors.light.successAsText` reads
  `#557232`, `stringToColor("qa_manual")` returns `{ fill: '#aac802', ink: '#000000' }`, and
  `stringToColor("?")` returns `{ fill: '#bdbdbd', ink: '#000000' }`.

### The tests that matter

- The `*AsText` contrast sweep now **discovers tokens by suffix** instead of listing them, so the
  next `*AsText` token added is covered without a test edit — the way this one was missed.
- A **negative** test asserts the light `primary` / `warning` / `success` fills still *fail* AA as
  text against `background` and `muted`. It fails the day someone "fixes" contrast by darkening a
  fill, which is the mistake this whole class of token exists to prevent.

## Corrections to the request

Two claims in `initial-request.md` did not survive checking. Both came from the server-side author
of the escalation (me), and neither changes the fix.

1. **`proposit-mobile` does not have this defect.** The request says mobile "consumes
   `stringToColor` and has the same avatar defect". It has zero references to `stringToColor`;
   `src/components/user-avatar.tsx` renders an `expo-image` or an Ionicons person glyph — there is
   no hashed fill and no initial to make illegible. Mobile gains nothing on repin and needs no
   heads-up. The fix is still the root-cause fix: the function lives here and returned half a pair.
2. **The second "known victim" is misquoted.** `f` hashes to `#cc0000`, not the dark green in the
   request. Immaterial — the guarantee under test is every hash, not two samples.

## Not done, on purpose

- **No `contrastRatio` / `relativeLuminance` export.** Nothing outside these files needs one; the
  two test files each keep a small private copy. Export it when a real second caller appears.
- **No version bump or publish.** Publishing is gated on consumer-side validation coordinated at
  the workspace root.
- **No consumer repin.** `proposit-server` deletes `src/ui/local-tokens.ts` and its `inkForFill`
  shim when it repins; both already carry `ponytail:` comments naming this request as the upgrade
  path.

## Capabilities

No product delta — design tokens and a hash utility map to no entry in this node's ledger, and no
capability changed state. Nothing to reconcile.
