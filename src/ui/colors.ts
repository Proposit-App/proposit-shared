// Pure-data colour tokens for the Proposit design system — a quiet warm-neutral
// canvas with a single loud citron action per screen (sage/clay/amber/slate
// status hues). Framework-free (no MUI/React/DOM/Node) so both consumers can
// read it directly.
//
// FILLS VS TEXT: the accent/status tokens (`primary`, `warning`, …) are fill
// colours — they are meant to sit *behind* their `*Foreground` ink, not to be
// painted onto the page background. On the pale light-mode ground they are far
// too bright to read as text (citron measures ~1.48:1, amber ~2.92:1, against a
// 4.5:1 AA floor). The `*AsText` tokens are the same hue pushed far enough from
// the ground to clear AA on every background they can land on. In dark mode the
// bright fills usually already clear it, so there the `*AsText` token is
// generally the fill itself — `destructive` is the exception, its clay fill
// measuring 4.32:1 on the muted ground. Read `primaryAsText` as "primary,
// rendered as text" — the inverse of `primaryForeground`, which is the ink that
// sits on top of primary.

export interface TColorPalette {
    background: string
    backgroundElevated: string
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
    /** `primary` rendered as text on the page background (AA-safe). */
    primaryAsText: string
    secondary: string
    secondaryForeground: string
    accent: string
    accentForeground: string

    destructive: string
    destructiveForeground: string
    /** `destructive` rendered as text on the page background (AA-safe). */
    destructiveAsText: string
    success: string
    successForeground: string
    /** `success` rendered as text on the page background (AA-safe). */
    successAsText: string
    warning: string
    warningForeground: string
    /** `warning` rendered as text on the page background (AA-safe). */
    warningAsText: string
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
        background: "#f5f4ee",
        backgroundElevated: "#ffffff",
        foreground: "#25251e",
        muted: "#f0eee6",
        mutedForeground: "#6b6a60",
        border: "#e5e3d8",
        input: "#e5e3d8",
        ring: "#aeda2e",

        disabled: "#e5e3d8",
        disabledForeground: "#a9a79a",

        primary: "#aeda2e",
        primaryForeground: "#1b2306",
        primaryAsText: "#5a7118",
        secondary: "#f0eee6",
        secondaryForeground: "#25251e",
        accent: "#f0eee6",
        accentForeground: "#25251e",

        destructive: "#b25545",
        destructiveForeground: "#ffffff",
        destructiveAsText: "#a75041",
        success: "#5e7f38",
        successForeground: "#ffffff",
        successAsText: "#557232",
        warning: "#b08a2c",
        warningForeground: "#ffffff",
        warningAsText: "#826621",
        info: "#4e68a8",
        infoForeground: "#ffffff",

        argumentPublished: "#5e7f38",
        argumentUnpublished: "#b08a2c",
        argumentArchived: "#7b7a6f",

        reactionUpvote: "#5e7f38",
        reactionDownvote: "#b25545",

        verdictAgree: "#5e7f38",
        verdictDisagree: "#b25545",
        verdictInconclusive: "#7b7a6f",

        nodeHealthy: "#5e7f38",
        nodeUnhealthy: "#b25545",
        nodeWarning: "#b08a2c",
    },
    dark: {
        background: "#0d0e0b",
        backgroundElevated: "#191a15",
        foreground: "#edebe1",
        muted: "#20211a",
        mutedForeground: "#8f8e80",
        border: "#2a2b24",
        input: "#2a2b24",
        ring: "#c9f24a",

        disabled: "#20211a",
        disabledForeground: "#5d5d53",

        primary: "#c9f24a",
        primaryForeground: "#0d0e0b",
        primaryAsText: "#c9f24a",
        secondary: "#191a15",
        secondaryForeground: "#edebe1",
        accent: "#20211a",
        accentForeground: "#edebe1",

        destructive: "#c56a5b",
        destructiveForeground: "#0d0e0b",
        // Unlike the other *AsText tokens, this one differs from its fill in
        // dark mode too: the clay fill measures 4.32:1 on the muted ground,
        // just under the body-text floor, so it is nudged lighter rather than
        // reused as-is.
        destructiveAsText: "#c87263",
        success: "#82a857",
        successForeground: "#0d0e0b",
        successAsText: "#82a857",
        warning: "#d9b84c",
        warningForeground: "#0d0e0b",
        warningAsText: "#d9b84c",
        info: "#6e86c4",
        infoForeground: "#0d0e0b",

        argumentPublished: "#82a857",
        argumentUnpublished: "#d9b84c",
        argumentArchived: "#8f8e80",

        reactionUpvote: "#82a857",
        reactionDownvote: "#c56a5b",

        verdictAgree: "#82a857",
        verdictDisagree: "#c56a5b",
        verdictInconclusive: "#8f8e80",

        nodeHealthy: "#82a857",
        nodeUnhealthy: "#c56a5b",
        nodeWarning: "#d9b84c",
    },
}

export type TColorScheme = "light" | "dark"

export const colorSchemeFor = (scheme: TColorScheme): TColorPalette =>
    colors[scheme]
