export const zIndex = {
    dropdown: 1000,
    popover: 1100,
    tooltip: 1150,
    dialog: 1200,
    toast: 1300,
} as const

export type TZIndexKey = keyof typeof zIndex
