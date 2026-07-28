# Spec: text-safe success token and a paired ink for `stringToColor`

Two contrast defects found by a manual browser-QA sweep of `proposit-server` root-cause here. Both
are the same shape: **a token that is only safe as a fill is handed out with no paired ink**, so
each consumer invents one — or forgets to. The fix closes both at the source.

Request: [`initial-request.md`](./initial-request.md).

## Verified premises

Every number below was recomputed in this repo before writing this spec, not copied from the
request.

| Claim | Verified |
| --- | --- |
| light `success` `#5e7f38` as text fails AA | 4.17 (`background`) / 4.60 (`backgroundElevated`) / 3.96 (`muted`); floor 4.5 |
| `#557232` clears AA on all three light grounds | 4.96 / 5.47 / 4.71 |
| dark `success` `#82a857` already clears AA | 7.09 / 6.41 / 5.94 |
| a luminance-chosen black/white ink clears AA against **any** fill | worst case over the whole 24-bit colour cube is **4.582:1** at `#ae5d6c` |
| the same, over hashed names | worst 4.582:1 (`user1582` → `#d2441a`); `qa_manual` 10.97, `f` 5.89 |

### One request claim is wrong

The request states `proposit-mobile` "consumes `stringToColor` and has the **same avatar defect**".
It does not. Mobile has zero references to `stringToColor`, and `src/components/user-avatar.tsx`
renders an `expo-image` or an Ionicons person glyph — there is no hashed fill and no initial to make
illegible. The escalation (which this repo's own upstream author wrote from the server side)
over-read the shared dependency.

That removes a *second victim today*, not the justification. `stringToColor` lives here and returns
half of a pair; the correct half is not derivable by a consumer without re-deriving WCAG luminance,
which is exactly what the server had to do. Fixing it here is the root-cause fix regardless of how
many consumers are currently bitten.

The request's minor detail about the second "known victim" is also off: `f` hashes to `#cc0000`,
not the dark green quoted from the session. Immaterial — the guarantee under test is *every* hash,
not two samples.

## Scope

### 1. `successAsText`

Add to `TColorPalette` and both palettes in `src/ui/colors.ts`, beside `primaryAsText` /
`warningAsText`:

- `colors.light.successAsText = "#557232"`
- `colors.dark.successAsText = "#82a857"` (the fill itself, matching how the other two `*AsText`
  tokens are defined in dark)

Purely additive. The `success` fill is **not** darkened: it is correct as a fill, and changing it
would repaint every filled success surface across both apps.

### 2. `stringToColor` returns a pair

`stringToColor(str)` returns `{ fill, ink }` instead of a bare fill string. `ink` is `#000000` or
`#ffffff`, chosen by the fill's WCAG relative luminance against the crossover point
`L = √(1.05 × 0.05) − 0.05 ≈ 0.1791`, where black and white contrast equally.

Two properties are load-bearing and must be stated in the source, because both look like arbitrary
choices:

- **The inks are absolute, not palette tokens.** The fill does not change with the colour scheme, so
  the ink must not either. Any scheme-dependent ink reintroduces the original defect in the opposite
  direction.
- **The full black/white range is required.** The darkest palette token (`#0d0e0b`) bottoms out at
  4.40:1 for mid-luminance fills — under the floor. Pure black/white holds 4.582:1 across the entire
  colour cube.

The placeholder path (`"?"` → `#bdbdbd`) keeps its fill and gains an ink like any other.

**Breaking, deliberately.** The request offers a fill-only overload for compatibility; this spec
declines it. There is exactly one consumer of `stringToColor` in the workspace (`proposit-server`'s
`UserAvatar` plus its test), the repo is pre-1.0 where a minor may break, and a two-shape API leaves
the wrong shape reachable — the fill-only form is precisely the call that caused the defect. One
function, one truth. Release notes call the shape change out.

## Out of scope

- Darkening the `success` fill (see above).
- A general `contrastRatio` / `relativeLuminance` export. Nothing outside this file needs one today;
  `colors.test.ts` already carries a private copy for assertions. Export it when a second caller
  exists, not before.
- Consumer repins. `proposit-server` deletes `src/ui/local-tokens.ts` and its `inkForFill` shim when
  it repins; that is server-side work, tracked by the `ponytail:` comments already in its source.
- `proposit-mobile` — nothing to fix there (see above), and nothing to do on repin.

## Capabilities

No product delta. Design tokens and a hash utility sit under no entry in this node's capability
ledger (`arguments`, `auth`, `authoring`, `moderation`, `profile`, `reviews`), and no user-facing
capability changes state. Nothing to declare or reconcile.

## Acceptance

1. `successAsText` clears 4.5:1 against `background`, `backgroundElevated`, and `muted` in **both**
   schemes — asserted by extending the existing `*AsText` test rather than adding a parallel one.
2. The raw `success` fill still **fails** that check in light mode, asserted explicitly. This is the
   guard that keeps fill and text apart: without it, a future "fix" that darkens the fill would pass
   the suite.
3. `stringToColor`'s ink clears 4.5:1 against its own fill, asserted as a sweep over many names —
   the guarantee is "every hash", not "these two". Includes `qa_manual` and `f`.
4. `stringToColor("?")` still returns the neutral placeholder fill `#bdbdbd`.
5. `pnpm run check` passes.
