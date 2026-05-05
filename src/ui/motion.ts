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
