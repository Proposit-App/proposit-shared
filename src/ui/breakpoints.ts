export const breakpoint = {
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
} as const

export type TBreakpointKey = keyof typeof breakpoint
