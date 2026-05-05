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
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
        },
    },
    lg: {
        css: "0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.10)",
        native: {
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 6,
        },
    },
}
