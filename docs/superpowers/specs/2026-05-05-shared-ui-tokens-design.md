# Shared UI Tokens — Design Spec

**Date:** 2026-05-05
**Status:** Design / awaiting human approval
**Audience:** the `@proposit/shared` agent (primary implementer); the `proposit-server` and `@proposit/proposit-mobile` agents (downstream consumers, not implementers of this spec)
**Lives at:** workspace root (`/Users/brian/Projects/Proposit-App/docs/superpowers/`); not in any git repo

---

## 1. Goal

Establish a single source of truth for design tokens (colors, typography, spacing, radii, shadows, motion, z-index, breakpoints, sizing) and brand assets (Proposit logos as inline SVG strings) shared between the Next.js web app (`proposit-server`) and the React Native / Expo mobile app (`proposit-mobile`). Both apps will support light and dark color schemes from these tokens.

The shared package owns the *values*. Each app owns its own *consumption* (CSS generation on web, runtime hook on mobile). This spec covers only the source-of-truth package; downstream consumption is documented as a recommendation in §7 but is out of scope for the implementing agent.

## 2. Source-of-truth relationship

`@proposit/shared/ui` is the canonical source for tokens. The server's `globals.css` `@theme` block (which currently does not exist — the server's `docs/design-system.md` describes a target state) will eventually be generated from this package; the server's `docs/design-system.md` §1 should be updated at that time to point to `@proposit/shared/ui` as the source.

The mobile app reads tokens directly as TypeScript objects via a small runtime hook that picks light or dark based on `Appearance.getColorScheme()`.

## 3. Package shape

### 3.1 File layout

New top-level area in `proposit-shared/src/ui/`:

```
proposit-shared/src/ui/
├── index.ts                      # umbrella re-exports of every sub-module
├── colors.ts                     # { light, dark } parallel palettes + colorSchemeFor()
├── typography.ts                 # font families, weights, text-style scale
├── spacing.ts                    # 4px-based scale
├── radii.ts                      # sm / md / lg / xl / full
├── shadows.ts                    # dual-shape: { css, native }
├── motion.ts                     # durations (seconds), easing (numeric + CSS forms)
├── z-index.ts                    # dropdown / popover / dialog / toast
├── breakpoints.ts                # sm / md / lg / xl
├── sizing.ts                     # icon-*, field-*, target-min
└── assets/
    ├── index.ts                  # re-exports + propositLogoFor()
    ├── proposit-logo-black.ts
    ├── proposit-logo-white.ts
    └── proposit-letter-logo-black.ts
```

### 3.2 `package.json` exports

Add to the `exports` map:

```jsonc
"./ui": {
    "types": "./dist/ui/index.d.ts",
    "import": "./dist/ui/index.js",
    "default": "./dist/ui/index.js"
},
"./ui/assets": {
    "types": "./dist/ui/assets/index.d.ts",
    "import": "./dist/ui/assets/index.js",
    "default": "./dist/ui/assets/index.js"
},
"./ui/*": {
    "types": "./dist/ui/*.d.ts",
    "import": "./dist/ui/*.js",
    "default": "./dist/ui/*.js"
}
```

(Pattern matches existing sub-paths like `./consts` and `./consts/*`. The explicit `./ui/assets` entry is required because Node's `./ui/*` pattern resolves `@proposit/shared/ui/assets` to `./dist/ui/assets.js` — a non-existent file — rather than the directory's `index.js`; the existing `package.json` follows the same convention for `./schemas/api/auth` etc. Any future nested directory under `ui/` needs its own explicit entry. The `default` condition alongside `import` is required by the existing exports-map convention; do not omit it.)

### 3.3 Import constraints

- **Both umbrella and sub-path imports work.** The umbrella `@proposit/shared/ui` is safe here because every file under `src/ui/` is pure data with no `typebox` dependency, so the typebox-via-babel-preset-expo bug (documented in `proposit-mobile/CLAUDE.md`, which only triggers for barrels that transitively pull in typebox) does not apply. Sub-path imports remain available for tree-shaking and as a forward-compatibility hedge: if a future `ui/` addition ever needs typebox, do *not* re-export it through `ui/index.ts` without first sub-pathing the consumer. v0 has no such modules.
- **No DOM, no Node-only APIs.** Enforced by `proposit-shared`'s `tsconfig.json` `lib: ["ES2022"]`. All exports are pure data plus tiny pure helpers.
- **No new dependencies in `proposit-shared`.** This work uses only TypeScript primitives.

## 4. Token values

### 4.1 Colors (`src/ui/colors.ts`)

Two parallel palettes with the same key set. The token shape mirrors the server's `docs/design-system.md` §1 vocabulary so the eventual CSS emitter is mechanical.

```ts
export interface TColorPalette {
    background: string
    foreground: string
    muted: string
    mutedForeground: string
    border: string
    input: string
    ring: string

    disabled: string
    disabledForeground: string

    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    accent: string
    accentForeground: string

    destructive: string
    destructiveForeground: string
    success: string
    successForeground: string
    warning: string
    warningForeground: string
    info: string
    infoForeground: string

    argumentPublished: string
    argumentUnpublished: string
    argumentArchived: string

    reactionUpvote: string
    reactionDownvote: string

    verdictAgree: string
    verdictDisagree: string
    verdictInconclusive: string

    nodeHealthy: string
    nodeUnhealthy: string
    nodeWarning: string
}

export const colors: { light: TColorPalette; dark: TColorPalette } = {
    light: {
        background: "#ffffff",
        foreground: "#0f172a",
        muted: "#f1f5f9",
        mutedForeground: "#64748b",
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#2563eb",

        disabled: "#e2e8f0",
        disabledForeground: "#94a3b8",

        primary: "#2563eb",
        primaryForeground: "#ffffff",
        secondary: "#f1f5f9",
        secondaryForeground: "#0f172a",
        accent: "#f1f5f9",
        accentForeground: "#0f172a",

        destructive: "#dc2626",
        destructiveForeground: "#ffffff",
        success: "#16a34a",
        successForeground: "#ffffff",
        warning: "#d97706",
        warningForeground: "#1e293b",
        info: "#2563eb",
        infoForeground: "#ffffff",

        argumentPublished: "#16a34a",
        argumentUnpublished: "#d97706",
        argumentArchived: "#64748b",

        reactionUpvote: "#0d9488",
        reactionDownvote: "#dc2626",

        verdictAgree: "#16a34a",
        verdictDisagree: "#dc2626",
        verdictInconclusive: "#64748b",

        nodeHealthy: "#16a34a",
        nodeUnhealthy: "#dc2626",
        nodeWarning: "#d97706",
    },
    dark: {
        background: "#020617",
        foreground: "#f8fafc",
        muted: "#1e293b",
        mutedForeground: "#94a3b8",
        border: "#334155",
        input: "#334155",
        ring: "#60a5fa",

        disabled: "#1e293b",
        disabledForeground: "#64748b",

        primary: "#60a5fa",
        primaryForeground: "#0f172a",
        secondary: "#1e293b",
        secondaryForeground: "#f8fafc",
        accent: "#1e293b",
        accentForeground: "#f8fafc",

        destructive: "#f87171",
        destructiveForeground: "#0f172a",
        success: "#4ade80",
        successForeground: "#0f172a",
        warning: "#fbbf24",
        warningForeground: "#0f172a",
        info: "#60a5fa",
        infoForeground: "#0f172a",

        argumentPublished: "#4ade80",
        argumentUnpublished: "#fbbf24",
        argumentArchived: "#94a3b8",

        reactionUpvote: "#2dd4bf",
        reactionDownvote: "#f87171",

        verdictAgree: "#4ade80",
        verdictDisagree: "#f87171",
        verdictInconclusive: "#94a3b8",

        nodeHealthy: "#4ade80",
        nodeUnhealthy: "#f87171",
        nodeWarning: "#fbbf24",
    },
}

export type TColorScheme = "light" | "dark"

export const colorSchemeFor = (scheme: TColorScheme): TColorPalette =>
    colors[scheme]
```

**Naming convention note.** Token *keys* in TS use camelCase (`mutedForeground`, `argumentPublished`) per the project's brain-style TypeScript conventions. The downstream CSS emitter on the server will translate these to kebab-case CSS custom properties (`--color-muted-foreground`, `--color-argument-published`) to match the conventions in `proposit-server/docs/design-system.md` §1. The shared package itself does not emit CSS; the translation is purely a server-side concern.

**Why `reactionUpvote` is teal, not blue.** Decoupled from `primary` so a future brand recolor doesn't silently re-tint upvotes. The chosen teal (`#0d9488` / `#2dd4bf`) is positive without colliding with `success`/`verdictAgree` (green) or `info` (blue).

### 4.2 Typography (`src/ui/typography.ts`)

**Font-family handoff contract.** `fontFamily.sans = "Roboto"` and `fontFamily.mono = "Fira Code"` are *logical* names. Each consumer adapts:
- **Web (`proposit-server`):** the existing `next/font/google` loader exposes Roboto and Fira Code as CSS variables (`var(--font-roboto)`, `var(--font-fira-code)`). The token-CSS emitter writes `--font-sans: var(--font-roboto)` so call sites read the logical name.
- **Mobile (`@proposit/proposit-mobile`):** when fonts are wired up, `expo-font` registers the family name verbatim — `Font.loadAsync({ Roboto: require(...), "Fira Code": require(...) })` — so `fontFamily.sans` works as a direct RN `style={{ fontFamily }}` value.

```ts
export const fontFamily = {
    sans: "Roboto",
    mono: "Fira Code",
} as const

export const fontWeight = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
} as const

export interface TTextStyle {
    fontSize: number       // unitless; web emitter appends "px", RN uses raw
    lineHeight: number     // same convention
    letterSpacing: number  // same convention; matches RN semantics directly
}

export const textStyle: Record<
    "h1" | "h2" | "h3" | "h4" | "lead" | "body" | "small" | "caption" | "code",
    TTextStyle
> = {
    h1:      { fontSize: 36, lineHeight: 40, letterSpacing: -0.6 },
    h2:      { fontSize: 30, lineHeight: 36, letterSpacing: -0.45 },
    h3:      { fontSize: 24, lineHeight: 32, letterSpacing: -0.24 },
    h4:      { fontSize: 20, lineHeight: 28, letterSpacing: -0.1 },
    lead:    { fontSize: 18, lineHeight: 28, letterSpacing: 0 },
    body:    { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
    small:   { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
    caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.12 },
    code:    { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
}
```

The `code` text style is paired with `fontFamily.mono` at the consumer site; the shared module doesn't bind family-to-style.

The server currently loads Roboto, Fira Code, Manrope, Work Sans, and Space Mono via `next/font/google`. Only Roboto and Fira Code are in active use; the other three are not part of v0 of the token system. Add them later if a real consumer needs them.

### 4.3 Spacing (`src/ui/spacing.ts`)

Matches Tailwind v4's default 4px-based scale, keyed by the same numeric labels Tailwind uses so mobile and web share the same vocabulary.

```ts
export const spacing = {
    0: 0,
    0.5: 2,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
} as const

export type TSpacingKey = keyof typeof spacing
```

(Note: numeric-literal keys produce a numeric-literal-union type — `keyof typeof spacing` is `0 | 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24` — *not* a string union. Index with numeric literals: `spacing[0.5]`, `spacing[4]`. The implementing agent should verify with `tsc` that the inferred `TSpacingKey` looks right before locking in.)

### 4.4 Radii (`src/ui/radii.ts`)

```ts
export const radius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
} as const
```

### 4.5 Shadows (`src/ui/shadows.ts`)

Dual-shape because CSS `box-shadow` and React Native's shadow props are different idioms. Both forms are pre-formatted from the same visual decision; consumers pick.

```ts
export interface TShadow {
    css: string  // also valid as React Native's `boxShadow` style prop on RN 0.76+
    native: {
        // iOS-style legacy shadow props; Android uses `elevation`.
        // For RN 0.76+, prefer the `css` field assigned to `style.boxShadow`
        // for unified rendering across iOS and Android. The native object is
        // retained for older targets and explicit per-property control.
        shadowColor: string
        shadowOffset: { width: number; height: number }
        shadowOpacity: number
        shadowRadius: number
        elevation: number  // Android
    }
}

export const shadow: Record<"sm" | "md" | "lg", TShadow> = {
    sm: {
        css: "0 1px 2px 0 rgba(0,0,0,0.05)",
        native: {
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
    },
    md: {
        css: "0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10)",
        native: {
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.10,
            shadowRadius: 6,
            elevation: 3,
        },
    },
    lg: {
        css: "0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.10)",
        native: {
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.10,
            shadowRadius: 15,
            elevation: 6,
        },
    },
}
```

### 4.6 Motion (`src/ui/motion.ts`)

Durations in seconds (numeric, for `motion/react` and RN `Animated.timing`). Easing exported in both numeric form (for `motion/react` and RN `Easing.bezier`) and CSS string form (for plain CSS transitions and Tailwind utilities).

```ts
export const duration = {
    fast: 0.12,
    base: 0.2,
    slow: 0.35,
} as const

export const easing: {
    brand: [number, number, number, number]
    brandCss: string
} = {
    brand: [0.22, 1, 0.36, 1],
    brandCss: "cubic-bezier(0.22, 1, 0.36, 1)",
}
```

(Note: `easing.brand` is intentionally a mutable tuple, *not* `as const`. `motion/react`'s `BezierDefinition` and RN's `Easing.bezier(...arr)` both expect a mutable `[number, number, number, number]`; a `readonly` tuple from `as const` would not satisfy `BezierDefinition`. Don't add `as const` here.)

### 4.7 Z-index (`src/ui/z-index.ts`)

```ts
export const zIndex = {
    dropdown: 1000,
    popover: 1100,
    tooltip: 1150,
    dialog: 1200,
    toast: 1300,
} as const
```

### 4.8 Breakpoints (`src/ui/breakpoints.ts`)

Values match `proposit-server/docs/design-system.md` §1 (the current MUI breakpoint values, kept for migration parity).

```ts
export const breakpoint = {
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
} as const
```

Mobile won't use these for media queries (RN doesn't have them) but may use them for adaptive layouts via `Dimensions.get("window").width`.

### 4.9 Sizing (`src/ui/sizing.ts`)

```ts
export const sizing = {
    iconXs: 12,
    iconSm: 16,
    iconMd: 20,
    iconLg: 24,
    iconXl: 32,
    fieldSm: 32,
    fieldMd: 40,
    fieldLg: 48,
    targetMin: 40,  // a11y minimum tap target
} as const
```

## 5. Brand assets (`src/ui/assets/`)

### 5.1 Asset shape

```ts
export interface TBrandAsset {
    svg: string             // raw SVG markup, e.g. `<svg ...>...</svg>`
    viewBox: string         // e.g. "0 0 800 330"
    intrinsicWidth: number  // numeric width from the source SVG
    intrinsicHeight: number
}
```

Each asset's `svg`, `viewBox`, `intrinsicWidth`, and `intrinsicHeight` values come from reading the source SVG at implementation time. The implementing agent extracts them from the source files in `proposit-server/public/`:

- `proposit-logo-black.ts` ← `proposit-server/public/Proposit_Logo-black.svg`
- `proposit-logo-white.ts` ← `proposit-server/public/Proposit_Logo-white.svg`
- `proposit-letter-logo-black.ts` ← `proposit-server/public/Proposit_letter_logo-black.svg`

The `svg` value should be the exact contents of the source SVG, with the XML declaration (if present) stripped. Verify the SVG self-contains a `viewBox` attribute; if a source file lacks one, derive `viewBox="0 0 <width> <height>"` from its `width`/`height` attributes and document the substitution in the file's source comment.

**No white letter-mark in v0.** `Proposit_letter_logo-black.svg` exists in the source repo but `Proposit_letter_logo-white.svg` does not — creating one is design work outside this spec. v0 ships only the three assets above; if mobile dark mode needs a white letter-mark before that source is created, the consumer can fall back to `propositLogoWhite` (full mark) or render the black letter mark with a CSS/RN tint until a real asset lands. Tracked as a follow-up.

**Sample asset file** (`src/ui/assets/proposit-logo-black.ts`):

```ts
import type { TBrandAsset } from "./types.js"

// Source: proposit-server/public/Proposit_Logo-black.svg
// viewBox/dimensions extracted at implementation time; values below are placeholders.
export const propositLogoBlack: TBrandAsset = {
    svg: `<svg ...>...</svg>`,  // exact contents of source SVG, XML decl stripped
    viewBox: "0 0 800 330",
    intrinsicWidth: 800,
    intrinsicHeight: 330,
}
```

(Each of the three asset files follows the same shape — single typed export, no cross-file imports.)

### Consumption shape (informational; consumers implement, not this spec)

- **Web (`proposit-server`):** wrap the SVG string in a small component using `dangerouslySetInnerHTML`, *or* parse to JSX once at build time. Either is fine; the shared package is consumption-agnostic.
- **Mobile (`@proposit/proposit-mobile`):** use `react-native-svg`'s `SvgXml` component, which accepts a raw SVG markup string directly — `<SvgXml xml={asset.svg} width={w} height={h} />`. This is the standard supported path; do not attempt to render arbitrary SVG strings without `react-native-svg`. Mobile adds `react-native-svg` as a dep when the first logo renders (per §7.2).

### 5.2 Re-exports + helper

`src/ui/assets/index.ts`:

```ts
export {
    propositLogoBlack,
} from "./proposit-logo-black.js"
export {
    propositLogoWhite,
} from "./proposit-logo-white.js"
export {
    propositLetterLogoBlack,
} from "./proposit-letter-logo-black.js"
export type { TBrandAsset } from "./types.js"

import type { TColorScheme } from "../colors.js"
import { propositLogoBlack } from "./proposit-logo-black.js"
import { propositLogoWhite } from "./proposit-logo-white.js"

export const propositLogoFor = (
    scheme: TColorScheme,
): TBrandAsset =>
    scheme === "dark" ? propositLogoWhite : propositLogoBlack
```

(Define `TBrandAsset` in a co-located `assets/types.ts` so the asset files don't depend on each other.)

## 6. Tests

This package is published; tests are part of the build gate (`pnpm run check`). v0 needs the following minimal coverage:

- **Color palette parity:** assert `Object.keys(colors.light)` equals `Object.keys(colors.dark)` (set equality). Catches a missing dark-mode entry on future additions.
- **Color hex shape:** every value matches `/^#[0-9a-f]{6}$/`. Catches typos.
- **Brand asset shape:** every exported `TBrandAsset` has a non-empty `svg` starting with `<svg`, a non-empty `viewBox`, and positive `intrinsicWidth`/`intrinsicHeight`.
- **`colorSchemeFor` and `propositLogoFor`:** trivial behavior tests covering both scheme branches.

All token tests live in a single `src/ui/__tests__/` directory (one file per area: `colors.test.ts`, `typography.test.ts`, `assets.test.ts`, etc.). Do not nest a `__tests__/` inside `src/ui/assets/` — keep the tree shallow.

## 7. Downstream consumption (recommendations only — out of scope for this spec)

This spec ships only the shared package. The two implementations below are described so the per-repo agents have a clear next step. Each is its own follow-up spec.

### 7.1 `proposit-server` adoption (separate spec, owned by `proposit-server` agent)

1. Add `scripts/build-tokens-css.ts` that imports from `@proposit/shared/ui/*` and emits `src/app/_tokens.css` containing the equivalent Tailwind v4 `@theme { ... }` block (sourced from `colors.light` and the scheme-invariant tokens) plus a `.dark { ... }` override block (sourced from `colors.dark`). Translation of the JS shape into Tailwind v4's CSS conventions — kebab-case names, the `--text-name`/`--text-name--line-height` sub-property pattern for typography, unit appending (`px`) where needed — is a server-side concern and not specified here.
2. Add `predev` and `prebuild` script bindings so the file regenerates on every dev start and production build.
3. Add `@import "./_tokens.css";` at the top of `src/app/globals.css`.
4. While MUI remains in the tree, sync `src/components/shared/consts.ts`'s `RootThemeOpts` to the shared values. This is *not* a one-to-one wire-up: `RootThemeOpts` is MUI-shaped (`palette: { primary: { main, light, dark, contrastText }, ... }`, `typography: { h1: { fontSize, lineHeight, ... }, ... }`) while the shared exports are flat (`colors.light.primary: string`, `textStyle.h1: { fontSize, lineHeight, letterSpacing }`). The server agent writes a small translation function that maps the flat shared shape into MUI's nested shape — `primary.main = colors.light.primary`, `primary.contrastText = colors.light.primaryForeground`, derive MUI's `light`/`dark` palette variants by lightening/darkening (e.g., `chroma.js` or hand-pick), etc. This is non-trivial and should be its own commit within the server's adoption PR.
5. Update `proposit-server/docs/design-system.md` §1 to note that token *values* are sourced from `@proposit/shared/ui`. The `@theme` *block* still lives in `globals.css` (Tailwind v4 reads it there); it's just generated.

### 7.2 `@proposit/proposit-mobile` adoption (separate spec, owned by `proposit-mobile` agent)

1. Add `src/theme/use-theme.ts`:

    ```ts
    import { useEffect, useState } from "react"
    import { Appearance } from "react-native"
    import { colorSchemeFor, type TColorScheme } from "@proposit/shared/ui/colors"

    export const useTheme = () => {
        const [scheme, setScheme] = useState<TColorScheme>(
            (Appearance.getColorScheme() ?? "light") as TColorScheme,
        )
        useEffect(() => {
            const sub = Appearance.addChangeListener(({ colorScheme }) => {
                setScheme((colorScheme ?? "light") as TColorScheme)
            })
            return () => sub.remove()
        }, [])
        return { scheme, colors: colorSchemeFor(scheme) }
    }
    ```

2. Add `react-native-svg` when the first logo is rendered.
3. Add `expo-font` and load Roboto + Fira Code when the first text needs the brand font.

## 8. Versioning and change-management

- **This release: minor bump.** `@proposit/shared@0.3.2 → 0.4.0` (new exported sub-path = feature). Pre-1.0 caret-pin policy applies; consumers re-pin to `^0.4.0`. Note that npm caret on `0.x` does *not* cross minor versions — `proposit-server` and `proposit-mobile`, which currently pin `^0.3.x`, will not auto-receive `0.4.0`. Each consumer needs an explicit `pnpm add @proposit/shared@^0.4.0` in its own adoption PR.
- Adding a new token *key* → patch bump.
- Renaming or removing a token key → minor bump; called out in `docs/changelogs/upcoming.md`.
- Changing a token *value* (e.g., shifting brand primary) → patch bump; flagged in `docs/release-notes/upcoming.md` because both apps will visually shift.
- Adding a new asset → patch bump.
- All new sub-paths added to the package's `exports` map must declare `types`, `import`, and `default` conditions.

## 9. Out of scope

Explicitly NOT in this spec; each is a separate follow-up:

- The server's `_tokens.css` build script and `globals.css` `@theme` migration.
- The mobile `useTheme` hook, theme provider, font loading, and `react-native-svg` install.
- Icon vocabulary registry (a future `@proposit/shared/ui/icons` shipping semantic name keys with no glyphs; deferred per the brainstorming session).
- Component primitives and domain components in `proposit-shared`. This package is data + helpers only.
- Content formatters (`formatRelative`, `formatNumber`, etc.).
- Font *files*. Each app loads fonts via its platform's mechanism (`next/font` web, `expo-font` mobile); shared exports only font-name strings.
- Tailwind config in shared. Tailwind v4 reads the `@theme` block at the *consuming* site; the server's emitter handles it on its side.
- Raster icon files (`letter_icon-*.png`, app icons, splash). Each app keeps its own.

## 10. Agent execution notes

**Implementing agent:** `@proposit/shared`. Identity confirmable via `broker whoami` from inside `/Users/brian/Projects/Proposit-App/proposit-shared/`.

**Coordination signals (broker DMs to `Proposit-App/orchestrator`):**

- `READY: shared-ui-tokens v0.4.0 published` — when the new package version lands on npm.
- `BLOCKED: <on-whom> <what>` — only if a real cross-repo dependency surfaces. (None expected; this work is self-contained inside `proposit-shared`.)
- `QUESTION: orchestrator <what>` — if a token value or shape is ambiguous after reading this spec.

**No coordination required with `proposit-server` or `@proposit/proposit-mobile` agents during implementation.** Their consumption is a separate, follow-up workstream (§7).

**Build gate before publishing:** `pnpm run check` (typecheck + lint + test + build). After publishing, tag `v0.4.0` and ensure `dist/ui/*` files are present in the published tarball.

**After publishing:** offer the human a draft `docs/release-notes/upcoming.md` entry that calls out the new sub-path and the v0 token coverage; the human reviews before tagging the next version.
