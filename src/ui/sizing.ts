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
