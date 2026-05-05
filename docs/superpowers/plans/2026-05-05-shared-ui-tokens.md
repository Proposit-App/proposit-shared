# Shared UI Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@proposit/shared/ui` — a new sub-entry exporting design tokens (colors, typography, spacing, radii, shadows, motion, z-index, breakpoints, sizing) plus three Proposit logo SVGs as inline-string brand assets, with a `colorSchemeFor` helper for light/dark and a `propositLogoFor` helper for scheme-aware logo selection. Bundle + tag + publish as `0.4.0` after human go/no-go.

**Architecture:** Pure-data exports under `src/ui/`. No runtime tooling — values consumed directly by mobile (TS objects) and indirectly by the server later (a small CSS-emitter script the server agent will write). Each token category is its own file with a single typed export. `colors` ships parallel `light`/`dark` palettes with identical key sets. Three brand-logo files re-extract `viewBox` + intrinsic dimensions from source SVGs in `proposit-server/public/`. Tests assert structural invariants (parity, hex-shape, SVG-shape). TDD: one file at a time, test-first, commit after each green run.

**Tech Stack:** TypeScript 6.x with `verbatimModuleSyntax: true` and `lib: ["ES2022"]` (no DOM, no Node-only APIs). ESM with `.js` relative-import extensions. vitest 4.x for tests. pnpm 10.23.0+. No new dependencies.

**Spec:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-05-05-shared-ui-tokens-design.md` (workspace-root, not in git).

**Constraints worth re-stating:**

- Filenames are kebab-case. TS identifiers are camelCase for values, PascalCase prefixed `T` for types.
- `verbatimModuleSyntax: true` means `import type` / `export type` for type-only.
- Sub-path imports from `proposit-shared` use `.js` extensions even for `.ts` source — `from "./types.js"`, not `from "./types"`.
- Every commit message must be free of co-author trailers (project convention).
- `pnpm run check` is the gate before publishing (`typecheck`, `lint`, `test`, `build`).

---

## Task 1: Create `src/ui/spacing.ts` with test (token-pattern smoke test)

**Files:**

- Create: `src/ui/__tests__/spacing.test.ts`
- Create: `src/ui/spacing.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/spacing.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { spacing } from "../spacing.js"

describe("spacing", () => {
    test("includes the documented Tailwind v4 4px-scale keys", () => {
        expect(Object.keys(spacing).map(Number).sort((a, b) => a - b)).toEqual([
            0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24,
        ])
    })

    test("each value is a non-negative integer in px", () => {
        for (const value of Object.values(spacing)) {
            expect(Number.isInteger(value)).toBe(true)
            expect(value).toBeGreaterThanOrEqual(0)
        }
    })

    test("specific anchor values match the spec", () => {
        expect(spacing[0]).toBe(0)
        expect(spacing[1]).toBe(4)
        expect(spacing[4]).toBe(16)
        expect(spacing[24]).toBe(96)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/spacing.test.ts`
Expected: FAIL — `Cannot find module '../spacing.js'`.

- [ ] **Step 3: Create `src/ui/spacing.ts`**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/spacing.test.ts`
Expected: PASS — three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/spacing.ts src/ui/__tests__/spacing.test.ts
git commit -m "feat(ui): add spacing tokens"
```

---

## Task 2: Create `src/ui/radii.ts` with test

**Files:**

- Create: `src/ui/__tests__/radii.test.ts`
- Create: `src/ui/radii.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/radii.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { radius } from "../radii.js"

describe("radius", () => {
    test("includes sm/md/lg/xl/full keys", () => {
        expect(Object.keys(radius).sort()).toEqual([
            "full", "lg", "md", "sm", "xl",
        ])
    })

    test("each value is a non-negative integer", () => {
        for (const value of Object.values(radius)) {
            expect(Number.isInteger(value)).toBe(true)
            expect(value).toBeGreaterThanOrEqual(0)
        }
    })

    test("full is 9999 (pill)", () => {
        expect(radius.full).toBe(9999)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/radii.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/radii.ts`**

```ts
export const radius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
} as const

export type TRadiusKey = keyof typeof radius
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/radii.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/radii.ts src/ui/__tests__/radii.test.ts
git commit -m "feat(ui): add radius tokens"
```

---

## Task 3: Create `src/ui/z-index.ts` with test

**Files:**

- Create: `src/ui/__tests__/z-index.test.ts`
- Create: `src/ui/z-index.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/z-index.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { zIndex } from "../z-index.js"

describe("zIndex", () => {
    test("layers ascend dropdown < popover < tooltip < dialog < toast", () => {
        expect(zIndex.dropdown).toBeLessThan(zIndex.popover)
        expect(zIndex.popover).toBeLessThan(zIndex.tooltip)
        expect(zIndex.tooltip).toBeLessThan(zIndex.dialog)
        expect(zIndex.dialog).toBeLessThan(zIndex.toast)
    })

    test("each value is a positive integer", () => {
        for (const value of Object.values(zIndex)) {
            expect(Number.isInteger(value)).toBe(true)
            expect(value).toBeGreaterThan(0)
        }
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/z-index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/z-index.ts`**

```ts
export const zIndex = {
    dropdown: 1000,
    popover: 1100,
    tooltip: 1150,
    dialog: 1200,
    toast: 1300,
} as const

export type TZIndexKey = keyof typeof zIndex
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/z-index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/z-index.ts src/ui/__tests__/z-index.test.ts
git commit -m "feat(ui): add z-index tokens"
```

---

## Task 4: Create `src/ui/breakpoints.ts` with test

**Files:**

- Create: `src/ui/__tests__/breakpoints.test.ts`
- Create: `src/ui/breakpoints.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/breakpoints.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { breakpoint } from "../breakpoints.js"

describe("breakpoint", () => {
    test("matches MUI parity values from server design-system.md §1", () => {
        expect(breakpoint.sm).toBe(600)
        expect(breakpoint.md).toBe(900)
        expect(breakpoint.lg).toBe(1200)
        expect(breakpoint.xl).toBe(1536)
    })

    test("breakpoints ascend monotonically", () => {
        expect(breakpoint.sm).toBeLessThan(breakpoint.md)
        expect(breakpoint.md).toBeLessThan(breakpoint.lg)
        expect(breakpoint.lg).toBeLessThan(breakpoint.xl)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/breakpoints.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/breakpoints.ts`**

```ts
export const breakpoint = {
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
} as const

export type TBreakpointKey = keyof typeof breakpoint
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/breakpoints.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/breakpoints.ts src/ui/__tests__/breakpoints.test.ts
git commit -m "feat(ui): add breakpoint tokens"
```

---

## Task 5: Create `src/ui/sizing.ts` with test

**Files:**

- Create: `src/ui/__tests__/sizing.test.ts`
- Create: `src/ui/sizing.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/sizing.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { sizing } from "../sizing.js"

describe("sizing", () => {
    test("icon scale ascends xs..xl", () => {
        expect(sizing.iconXs).toBeLessThan(sizing.iconSm)
        expect(sizing.iconSm).toBeLessThan(sizing.iconMd)
        expect(sizing.iconMd).toBeLessThan(sizing.iconLg)
        expect(sizing.iconLg).toBeLessThan(sizing.iconXl)
    })

    test("field scale ascends sm..lg", () => {
        expect(sizing.fieldSm).toBeLessThan(sizing.fieldMd)
        expect(sizing.fieldMd).toBeLessThan(sizing.fieldLg)
    })

    test("targetMin meets or exceeds 40px (a11y minimum)", () => {
        expect(sizing.targetMin).toBeGreaterThanOrEqual(40)
    })

    test("each value is a positive integer", () => {
        for (const value of Object.values(sizing)) {
            expect(Number.isInteger(value)).toBe(true)
            expect(value).toBeGreaterThan(0)
        }
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/sizing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/sizing.ts`**

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
    targetMin: 40,
} as const

export type TSizingKey = keyof typeof sizing
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/sizing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/sizing.ts src/ui/__tests__/sizing.test.ts
git commit -m "feat(ui): add sizing tokens"
```

---

## Task 6: Create `src/ui/motion.ts` with test

**Files:**

- Create: `src/ui/__tests__/motion.test.ts`
- Create: `src/ui/motion.ts`

Note: `easing.brand` is intentionally a *mutable* tuple `[number, number, number, number]` (no `as const`). `motion/react`'s `BezierDefinition` and RN's `Easing.bezier(...)` both expect mutable; a `readonly` tuple from `as const` would not satisfy `BezierDefinition`.

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/motion.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { duration, easing } from "../motion.js"

describe("duration", () => {
    test("fast < base < slow", () => {
        expect(duration.fast).toBeLessThan(duration.base)
        expect(duration.base).toBeLessThan(duration.slow)
    })

    test("each value is a positive number in seconds", () => {
        for (const value of Object.values(duration)) {
            expect(typeof value).toBe("number")
            expect(value).toBeGreaterThan(0)
        }
    })
})

describe("easing.brand", () => {
    test("is a 4-tuple of numbers", () => {
        expect(easing.brand).toHaveLength(4)
        for (const n of easing.brand) {
            expect(typeof n).toBe("number")
        }
    })

    test("matches the documented bezier control points", () => {
        expect(easing.brand).toEqual([0.22, 1, 0.36, 1])
    })
})

describe("easing.brandCss", () => {
    test("renders the same control points as a CSS cubic-bezier string", () => {
        expect(easing.brandCss).toBe("cubic-bezier(0.22, 1, 0.36, 1)")
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/motion.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/motion.ts`**

```ts
export const duration = {
    fast: 0.12,
    base: 0.2,
    slow: 0.35,
} as const

export type TDurationKey = keyof typeof duration

export const easing: {
    brand: [number, number, number, number]
    brandCss: string
} = {
    brand: [0.22, 1, 0.36, 1],
    brandCss: "cubic-bezier(0.22, 1, 0.36, 1)",
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/motion.test.ts`
Expected: PASS — six tests green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/motion.ts src/ui/__tests__/motion.test.ts
git commit -m "feat(ui): add motion tokens (duration + brand easing)"
```

---

## Task 7: Create `src/ui/typography.ts` with test

**Files:**

- Create: `src/ui/__tests__/typography.test.ts`
- Create: `src/ui/typography.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/typography.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { fontFamily, fontWeight, textStyle } from "../typography.js"

describe("fontFamily", () => {
    test("sans is Roboto, mono is Fira Code (logical names)", () => {
        expect(fontFamily.sans).toBe("Roboto")
        expect(fontFamily.mono).toBe("Fira Code")
    })
})

describe("fontWeight", () => {
    test("regular/medium/semibold/bold ascend", () => {
        expect(fontWeight.regular).toBeLessThan(fontWeight.medium)
        expect(fontWeight.medium).toBeLessThan(fontWeight.semibold)
        expect(fontWeight.semibold).toBeLessThan(fontWeight.bold)
    })
})

describe("textStyle", () => {
    test("includes the nine documented styles", () => {
        expect(Object.keys(textStyle).sort()).toEqual([
            "body", "caption", "code", "h1", "h2", "h3", "h4", "lead", "small",
        ])
    })

    test("each style has fontSize, lineHeight, letterSpacing", () => {
        for (const style of Object.values(textStyle)) {
            expect(typeof style.fontSize).toBe("number")
            expect(typeof style.lineHeight).toBe("number")
            expect(typeof style.letterSpacing).toBe("number")
            expect(style.fontSize).toBeGreaterThan(0)
            expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize)
        }
    })

    test("h1 is largest, caption is smallest among the headings + body", () => {
        const sizes = Object.values(textStyle).map((s) => s.fontSize)
        expect(textStyle.h1.fontSize).toBe(Math.max(...sizes))
        expect(textStyle.caption.fontSize).toBe(Math.min(...sizes))
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/typography.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/typography.ts`**

```ts
export const fontFamily = {
    sans: "Roboto",
    mono: "Fira Code",
} as const

export type TFontFamilyKey = keyof typeof fontFamily

export const fontWeight = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
} as const

export type TFontWeightKey = keyof typeof fontWeight

export interface TTextStyle {
    fontSize: number
    lineHeight: number
    letterSpacing: number
}

export type TTextStyleKey =
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "lead"
    | "body"
    | "small"
    | "caption"
    | "code"

export const textStyle: Record<TTextStyleKey, TTextStyle> = {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/typography.test.ts`
Expected: PASS — five tests green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/typography.ts src/ui/__tests__/typography.test.ts
git commit -m "feat(ui): add typography tokens (font family, weight, text-style scale)"
```

---

## Task 8: Create `src/ui/shadows.ts` with test

**Files:**

- Create: `src/ui/__tests__/shadows.test.ts`
- Create: `src/ui/shadows.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/shadows.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { shadow } from "../shadows.js"

describe("shadow", () => {
    test("includes sm / md / lg keys", () => {
        expect(Object.keys(shadow).sort()).toEqual(["lg", "md", "sm"])
    })

    test("each level has both css and native shapes", () => {
        for (const level of Object.values(shadow)) {
            expect(typeof level.css).toBe("string")
            expect(level.css.length).toBeGreaterThan(0)
            expect(level.native).toMatchObject({
                shadowColor: expect.any(String),
                shadowOffset: {
                    width: expect.any(Number),
                    height: expect.any(Number),
                },
                shadowOpacity: expect.any(Number),
                shadowRadius: expect.any(Number),
                elevation: expect.any(Number),
            })
        }
    })

    test("shadowOpacity is between 0 and 1; elevation is positive", () => {
        for (const level of Object.values(shadow)) {
            expect(level.native.shadowOpacity).toBeGreaterThan(0)
            expect(level.native.shadowOpacity).toBeLessThanOrEqual(1)
            expect(level.native.elevation).toBeGreaterThan(0)
            expect(Number.isInteger(level.native.elevation)).toBe(true)
        }
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/shadows.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/shadows.ts`**

```ts
export interface TShadow {
    /**
     * Box-shadow CSS string. Also valid as React Native's `boxShadow` style
     * prop on RN 0.76+; prefer this on RN over the legacy `native` shape for
     * unified iOS/Android rendering.
     */
    css: string
    /**
     * Legacy iOS-style shadow props (`shadowColor`/`shadowOffset`/
     * `shadowOpacity`/`shadowRadius`) plus Android `elevation`. Retained for
     * older RN targets and explicit per-property control.
     */
    native: {
        shadowColor: string
        shadowOffset: { width: number; height: number }
        shadowOpacity: number
        shadowRadius: number
        elevation: number
    }
}

export type TShadowKey = "sm" | "md" | "lg"

export const shadow: Record<TShadowKey, TShadow> = {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/shadows.test.ts`
Expected: PASS — three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/shadows.ts src/ui/__tests__/shadows.test.ts
git commit -m "feat(ui): add shadow tokens (dual css + native shape)"
```

---

## Task 9: Create `src/ui/colors.ts` with test (parity + hex shape + scheme helper)

**Files:**

- Create: `src/ui/__tests__/colors.test.ts`
- Create: `src/ui/colors.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/colors.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import { colors, colorSchemeFor } from "../colors.js"

const HEX_RE = /^#[0-9a-f]{6}$/

describe("colors", () => {
    test("light and dark have identical key sets", () => {
        const lightKeys = Object.keys(colors.light).sort()
        const darkKeys = Object.keys(colors.dark).sort()
        expect(darkKeys).toEqual(lightKeys)
    })

    test("every value matches /^#[0-9a-f]{6}$/", () => {
        for (const palette of [colors.light, colors.dark]) {
            for (const [key, value] of Object.entries(palette)) {
                expect(value, `colors.<scheme>.${key} = ${value}`).toMatch(
                    HEX_RE,
                )
            }
        }
    })

    test("warning foreground on warning bg meets WCAG AA in light mode", () => {
        // Sanity: warning is amber, foreground is dark slate — should NOT be
        // white, which fails AA on amber.
        expect(colors.light.warningForeground).not.toBe("#ffffff")
    })

    test("reactionUpvote is decoupled from primary", () => {
        expect(colors.light.reactionUpvote).not.toBe(colors.light.primary)
        expect(colors.dark.reactionUpvote).not.toBe(colors.dark.primary)
    })
})

describe("colorSchemeFor", () => {
    test("returns the light palette for 'light'", () => {
        expect(colorSchemeFor("light")).toBe(colors.light)
    })

    test("returns the dark palette for 'dark'", () => {
        expect(colorSchemeFor("dark")).toBe(colors.dark)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/colors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/colors.ts`**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/colors.test.ts`
Expected: PASS — six tests green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/colors.ts src/ui/__tests__/colors.test.ts
git commit -m "feat(ui): add color tokens (light/dark palettes + scheme helper)"
```

---

## Task 10: Extract the three brand SVGs and create asset modules

**Files:**

- Read (do not modify): `../proposit-server/public/Proposit_Logo-black.svg`
- Read (do not modify): `../proposit-server/public/Proposit_Logo-white.svg`
- Read (do not modify): `../proposit-server/public/Proposit_letter_logo-black.svg`
- Create: `src/ui/assets/types.ts`
- Create: `src/ui/assets/proposit-logo-black.ts`
- Create: `src/ui/assets/proposit-logo-white.ts`
- Create: `src/ui/assets/proposit-letter-logo-black.ts`
- Create: `src/ui/assets/index.ts`
- Create: `src/ui/__tests__/assets.test.ts`

Note: this task is one logical unit because the four asset files share the same shape and are all consumed via `assets/index.ts`. Read all three source SVGs first to extract their `viewBox` and intrinsic dimensions, then write all four files in one pass.

- [ ] **Step 1: Read the three source SVGs**

Use `Read` (not `cat`) on:

- `../proposit-server/public/Proposit_Logo-black.svg`
- `../proposit-server/public/Proposit_Logo-white.svg`
- `../proposit-server/public/Proposit_letter_logo-black.svg`

For each, capture:

- The full `<svg ...>...</svg>` markup. Strip any leading XML declaration (`<?xml ... ?>`) and any leading XML comments. Keep the `<svg>` tag and its contents verbatim.
- The `viewBox="..."` attribute value. If absent, derive `viewBox="0 0 <width> <height>"` from the `width` / `height` attributes on the root `<svg>` element and add a comment in the asset file noting the substitution.
- `intrinsicWidth` / `intrinsicHeight`: read from the `viewBox`'s 3rd and 4th numbers (width and height of the viewBox), or the root `<svg>`'s `width`/`height` attributes if `viewBox` is absent.

- [ ] **Step 2: Write the failing test**

Write `src/ui/__tests__/assets.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import {
    propositLogoBlack,
    propositLogoWhite,
    propositLetterLogoBlack,
    propositLogoFor,
} from "../assets/index.js"
import type { TBrandAsset } from "../assets/index.js"

const VIEWBOX_RE = /^-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? \d+(?:\.\d+)? \d+(?:\.\d+)?$/

const allAssets: ReadonlyArray<readonly [string, TBrandAsset]> = [
    ["propositLogoBlack", propositLogoBlack],
    ["propositLogoWhite", propositLogoWhite],
    ["propositLetterLogoBlack", propositLetterLogoBlack],
]

describe("brand assets", () => {
    test.each(allAssets)("%s is a valid TBrandAsset", (_, asset) => {
        expect(asset.svg).toMatch(/^<svg[\s>]/)
        expect(asset.svg).toContain("</svg>")
        expect(asset.viewBox).toMatch(VIEWBOX_RE)
        expect(asset.intrinsicWidth).toBeGreaterThan(0)
        expect(asset.intrinsicHeight).toBeGreaterThan(0)
    })

    test.each(allAssets)("%s.svg has no XML declaration", (_, asset) => {
        expect(asset.svg).not.toMatch(/^<\?xml/)
    })
})

describe("propositLogoFor", () => {
    test("returns the black full logo for 'light'", () => {
        expect(propositLogoFor("light")).toBe(propositLogoBlack)
    })

    test("returns the white full logo for 'dark'", () => {
        expect(propositLogoFor("dark")).toBe(propositLogoWhite)
    })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/assets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/ui/assets/types.ts`**

```ts
export interface TBrandAsset {
    svg: string
    viewBox: string
    intrinsicWidth: number
    intrinsicHeight: number
}
```

- [ ] **Step 5: Create the three asset files**

For each, fill in the actual SVG markup, viewBox, and dimensions captured in Step 1. Use template literals for the `svg` field (backticks). The shape below is the template — replace the `...REPLACE_WITH_*...` placeholders with real values.

Write `src/ui/assets/proposit-logo-black.ts`:

```ts
import type { TBrandAsset } from "./types.js"

// Source: proposit-server/public/Proposit_Logo-black.svg
export const propositLogoBlack: TBrandAsset = {
    svg: `...REPLACE_WITH_RAW_SVG_MARKUP_FROM_SOURCE...`,
    viewBox: "...REPLACE_WITH_VIEWBOX...",
    intrinsicWidth: 0, // REPLACE_WITH_VIEWBOX_WIDTH
    intrinsicHeight: 0, // REPLACE_WITH_VIEWBOX_HEIGHT
}
```

Write `src/ui/assets/proposit-logo-white.ts`:

```ts
import type { TBrandAsset } from "./types.js"

// Source: proposit-server/public/Proposit_Logo-white.svg
export const propositLogoWhite: TBrandAsset = {
    svg: `...REPLACE_WITH_RAW_SVG_MARKUP_FROM_SOURCE...`,
    viewBox: "...REPLACE_WITH_VIEWBOX...",
    intrinsicWidth: 0, // REPLACE_WITH_VIEWBOX_WIDTH
    intrinsicHeight: 0, // REPLACE_WITH_VIEWBOX_HEIGHT
}
```

Write `src/ui/assets/proposit-letter-logo-black.ts`:

```ts
import type { TBrandAsset } from "./types.js"

// Source: proposit-server/public/Proposit_letter_logo-black.svg
export const propositLetterLogoBlack: TBrandAsset = {
    svg: `...REPLACE_WITH_RAW_SVG_MARKUP_FROM_SOURCE...`,
    viewBox: "...REPLACE_WITH_VIEWBOX...",
    intrinsicWidth: 0, // REPLACE_WITH_VIEWBOX_WIDTH
    intrinsicHeight: 0, // REPLACE_WITH_VIEWBOX_HEIGHT
}
```

Important: in template-literal strings, escape backticks (`` ` ``) and `${...}` if they appear in the SVG markup. Most SVG sources contain neither; verify per file.

- [ ] **Step 6: Create `src/ui/assets/index.ts`**

```ts
import type { TBrandAsset } from "./types.js"
import type { TColorScheme } from "../colors.js"
import { propositLogoBlack } from "./proposit-logo-black.js"
import { propositLogoWhite } from "./proposit-logo-white.js"
import { propositLetterLogoBlack } from "./proposit-letter-logo-black.js"

export { propositLogoBlack, propositLogoWhite, propositLetterLogoBlack }
export type { TBrandAsset }

export const propositLogoFor = (scheme: TColorScheme): TBrandAsset =>
    scheme === "dark" ? propositLogoWhite : propositLogoBlack
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/assets.test.ts`
Expected: PASS — eight tests green (6 from `test.each` + 2 from `propositLogoFor`).

If a test fails because `viewBox` doesn't match the regex, the source SVG likely uses comma-separated viewBox numbers (`0,0,800,330`); convert to space-separated form (`0 0 800 330`) and document in the file's source comment.

If a test fails because `intrinsicWidth`/`intrinsicHeight` is `0`, you forgot to replace the placeholder; check each asset file.

- [ ] **Step 8: Commit**

```bash
git add src/ui/assets src/ui/__tests__/assets.test.ts
git commit -m "feat(ui): add Proposit brand-logo assets (inline SVG strings)"
```

---

## Task 11: Create `src/ui/index.ts` umbrella

**Files:**

- Create: `src/ui/__tests__/index.test.ts`
- Create: `src/ui/index.ts`

- [ ] **Step 1: Write the failing test**

Write `src/ui/__tests__/index.test.ts`:

```ts
import { describe, test, expect } from "vitest"
import * as ui from "../index.js"

describe("ui umbrella", () => {
    test("re-exports tokens", () => {
        expect(ui.colors).toBeDefined()
        expect(ui.colorSchemeFor).toBeDefined()
        expect(ui.fontFamily).toBeDefined()
        expect(ui.textStyle).toBeDefined()
        expect(ui.spacing).toBeDefined()
        expect(ui.radius).toBeDefined()
        expect(ui.shadow).toBeDefined()
        expect(ui.duration).toBeDefined()
        expect(ui.easing).toBeDefined()
        expect(ui.zIndex).toBeDefined()
        expect(ui.breakpoint).toBeDefined()
        expect(ui.sizing).toBeDefined()
    })

    test("re-exports brand assets and helper", () => {
        expect(ui.propositLogoBlack).toBeDefined()
        expect(ui.propositLogoWhite).toBeDefined()
        expect(ui.propositLetterLogoBlack).toBeDefined()
        expect(ui.propositLogoFor).toBeDefined()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/__tests__/index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/index.ts`**

```ts
export * from "./colors.js"
export * from "./typography.js"
export * from "./spacing.js"
export * from "./radii.js"
export * from "./shadows.js"
export * from "./motion.js"
export * from "./z-index.js"
export * from "./breakpoints.js"
export * from "./sizing.js"
export * from "./assets/index.js"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/__tests__/index.test.ts`
Expected: PASS — two tests green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/index.ts src/ui/__tests__/index.test.ts
git commit -m "feat(ui): add umbrella index re-exporting all token modules"
```

---

## Task 12: Update `package.json` exports map

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Read the current `package.json` exports block**

Read `package.json` and locate the `exports` block. Identify the existing `"./consts"`, `"./consts/*"`, `"./schemas"`, `"./schemas/*"` entries — the new `./ui` entries follow the same pattern.

- [ ] **Step 2: Add three new entries to the `exports` map**

Insert the following entries into the `exports` map, placed alphabetically between `./schemas/*` and `./utils` (or wherever fits the alphabetical ordering of the existing entries — match the existing style):

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

The `./ui/assets` entry is required because `./ui/*` resolves `@proposit/shared/ui/assets` to `./dist/ui/assets.js` (a file that does not exist), not `./dist/ui/assets/index.js`. Same convention as the existing `./schemas/api/auth` entry.

- [ ] **Step 3: Run typecheck and lint to verify the package.json is well-formed**

Run: `pnpm run typecheck && pnpm run lint`
Expected: PASS for both.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm run test`
Expected: PASS — all `src/ui/__tests__/` tests green plus all pre-existing tests.

- [ ] **Step 5: Build to verify `dist/ui/` populates**

Run: `pnpm run build`
Expected: PASS. Verify `dist/ui/index.js`, `dist/ui/assets/index.js`, and `dist/ui/colors.js` (etc.) all exist:

```bash
ls dist/ui/ dist/ui/assets/
```

Expected output includes: `index.js`, `index.d.ts`, `colors.js`, `assets/index.js`, etc.

- [ ] **Step 6: Commit**

```bash
git add package.json
git commit -m "feat(ui): publish @proposit/shared/ui sub-paths in exports map"
```

---

## Task 13: Run the full check pipeline

**Files:** none modified — verification only.

- [ ] **Step 1: Run `pnpm run check`**

Run: `pnpm run check`
Expected: PASS — typecheck, lint, test, and build all green.

If anything fails, fix in place and re-run. Common issues:

- ESLint may complain about `0.5` as a numeric object key (older lint configs); if so, the existing config already allows it (other consts use similar shapes).
- Prettier may reformat — run `pnpm run prettify` and re-commit any drift.

- [ ] **Step 2: Inspect the published surface**

Run: `pnpm pack --pack-destination /tmp`
Expected: Produces `/tmp/proposit-shared-0.3.2.tgz` (version still 0.3.2 — bump comes in Task 14).

Inspect the tarball contents:

```bash
tar -tzf /tmp/proposit-shared-0.3.2.tgz | grep "package/dist/ui/"
```

Expected: includes `package/dist/ui/index.js`, `package/dist/ui/index.d.ts`, `package/dist/ui/assets/index.js`, `package/dist/ui/colors.js`, etc.

Clean up:

```bash
rm /tmp/proposit-shared-0.3.2.tgz
```

- [ ] **Step 3: No commit (verification-only task)**

---

## Task 14: Version bump, changelog, release notes — offer to user

**Files:**

- Rename: `docs/release-notes/upcoming.md` → `docs/release-notes/0.4.0.md`
- Rename: `docs/changelogs/upcoming.md` → `docs/changelogs/0.4.0.md`
- Create: new empty `docs/release-notes/upcoming.md`
- Create: new empty `docs/changelogs/upcoming.md`
- Modify: `package.json` (via `pnpm version minor`)

This task is gated on **explicit human go/no-go** per the workspace convention ("After a major set of changes, **offer** `pnpm version patch|minor|major`"). Do not run `pnpm version` without confirmation.

- [ ] **Step 1: Update `docs/changelogs/upcoming.md`**

Append a bullet to the existing `docs/changelogs/upcoming.md`:

```markdown
- feat(ui): add `@proposit/shared/ui` sub-entry — design tokens (colors with light/dark palettes, typography, spacing, radii, shadows, motion, z-index, breakpoints, sizing) and Proposit brand-logo SVG assets. New exports: `./ui`, `./ui/assets`, `./ui/*`.
```

- [ ] **Step 2: Update `docs/release-notes/upcoming.md`**

Append a section to the existing `docs/release-notes/upcoming.md`:

```markdown
### New features

- New `@proposit/shared/ui` sub-entry providing design tokens shared between `proposit-server` and `proposit-mobile`. Exports semantic color palettes (light + dark), a typography scale, spacing, radii, shadows (dual CSS + native shape for React Native), motion durations and easing, z-index layers, breakpoints, sizing, and three Proposit brand-logo SVG assets as inline strings. Consumers add the dependency on `^0.4.0` and read tokens directly; see the spec in the workspace `docs/superpowers/specs/2026-05-05-shared-ui-tokens-design.md` for the full surface.
```

- [ ] **Step 3: Commit pre-version content**

```bash
git add docs/changelogs/upcoming.md docs/release-notes/upcoming.md
git commit -m "docs(ui): add v0.4.0 changelog and release-notes entries"
```

- [ ] **Step 4: Surface the version-bump offer to the user**

Send the user the following message verbatim:

> All token files committed and `pnpm run check` is green. Ready to cut `0.4.0`. Running `pnpm version minor` will bump `package.json` to `0.4.0`, create a commit, and tag `v0.4.0`. I'll also rename `docs/release-notes/upcoming.md` → `0.4.0.md` and `docs/changelogs/upcoming.md` → `0.4.0.md`, then create fresh empty `upcoming.md` files for subsequent work. Confirm to proceed, or hold for further changes.

Wait for explicit confirmation. **Do not proceed to Step 5 without it.**

- [ ] **Step 5: On confirmation — bump version**

Run:

```bash
pnpm version minor
```

Expected: `package.json` `version` becomes `0.4.0`; a commit is created; a `v0.4.0` tag is placed at that commit.

- [ ] **Step 6: Rename the upcoming docs to versioned filenames**

```bash
git mv docs/release-notes/upcoming.md docs/release-notes/0.4.0.md
git mv docs/changelogs/upcoming.md docs/changelogs/0.4.0.md
```

- [ ] **Step 7: Recreate empty `upcoming.md` files**

Write `docs/release-notes/upcoming.md`:

```markdown
# Upcoming release notes
```

Write `docs/changelogs/upcoming.md`:

```markdown
# Upcoming changelog
```

- [ ] **Step 8: Commit the docs rename + recreate**

```bash
git add docs/release-notes/0.4.0.md docs/changelogs/0.4.0.md docs/release-notes/upcoming.md docs/changelogs/upcoming.md
git commit -m "docs: archive 0.4.0 notes and reset upcoming.md"
```

- [ ] **Step 9: Verify tag is on the right commit**

```bash
git log --oneline -5
git tag -l v0.4.0
```

Expected: the `v0.4.0` tag points to the `pnpm version minor` commit (Step 5), not the docs-archive commit (Step 8). That's correct — the tag captures the version-bump commit.

---

## Task 15: Publish — offer to user, then publish

**Files:** none modified.

This task is gated on **explicit human go/no-go**. Publishing pushes to the public npm registry and cannot be reversed easily.

- [ ] **Step 1: Surface the publish offer**

Send the user the following message verbatim:

> `0.4.0` is committed and tagged locally. To publish to npm, run `pnpm publish --access public` from this repo. That uploads the package and makes `@proposit/shared@0.4.0` available to `proposit-server`, `proposit-mobile`, and any other consumer. Confirm to proceed, or hold.

Wait for explicit confirmation. **Do not proceed to Step 2 without it.**

- [ ] **Step 2: On confirmation — publish**

Run:

```bash
pnpm publish --access public
```

Expected: tarball uploads successfully; `npm view @proposit/shared version` reports `0.4.0` within ~1 minute.

- [ ] **Step 3: Push the commits and tag to the remote**

```bash
git push origin main
git push origin v0.4.0
```

Expected: both pushes succeed.

- [ ] **Step 4: Notify the orchestrator on the broker**

Run:

```bash
broker send --to "Proposit-App/orchestrator" "READY: shared-ui-tokens v0.4.0 published — @proposit/shared/ui exports tokens (colors light+dark, typography, spacing, radii, shadows dual-shape, motion, z-index, breakpoints, sizing) and three brand-logo SVG assets. Spec: docs/superpowers/specs/2026-05-05-shared-ui-tokens-design.md"
```

Expected: the message is dispatched. The orchestrator picks up the signal and routes follow-up work (server adoption, mobile adoption) according to the spec's §7.

- [ ] **Step 5: No commit (publish + push are the artifacts)**

---

## Definition of done

All of the following are true:

1. `src/ui/` contains 10 token files plus `assets/` (4 files) and `__tests__/` (10 test files).
2. `package.json` `exports` map includes `./ui`, `./ui/assets`, and `./ui/*` with `types`/`import`/`default` conditions.
3. `pnpm run check` passes from a clean clone.
4. `dist/ui/` populates correctly on build, mirroring the `src/ui/` structure.
5. `0.4.0` is tagged and published to npm.
6. `docs/release-notes/0.4.0.md` and `docs/changelogs/0.4.0.md` describe the release.
7. The orchestrator has received a `READY:` signal on the broker.
