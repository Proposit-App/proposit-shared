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
