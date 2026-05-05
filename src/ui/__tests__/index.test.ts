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
