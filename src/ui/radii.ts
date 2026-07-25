export const radius = {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
} as const

export type TRadiusKey = keyof typeof radius
