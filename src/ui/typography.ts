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
    h1: { fontSize: 36, lineHeight: 40, letterSpacing: -0.6 },
    h2: { fontSize: 30, lineHeight: 36, letterSpacing: -0.45 },
    h3: { fontSize: 24, lineHeight: 32, letterSpacing: -0.24 },
    h4: { fontSize: 20, lineHeight: 28, letterSpacing: -0.1 },
    lead: { fontSize: 18, lineHeight: 28, letterSpacing: 0 },
    body: { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
    small: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
    caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.12 },
    code: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
}
