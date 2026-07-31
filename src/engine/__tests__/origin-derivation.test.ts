import { describe, test, expect } from "vitest"
import {
    deriveEnthymemeContradictions,
    deriveEnthymemeSuggestions,
} from "../origin-derivation.js"
import {
    mutateMarkExpressionEnthymeme,
    mutateMarkPremiseEnthymeme,
} from "../mutations/origin.js"
import {
    buildOriginScene,
    makeAnchor,
    makeDocument,
    makeLink,
    type TOriginTestScene,
} from "./origin-fixtures.js"
import type { TOriginStance } from "../../schemas/model/origin.js"

function attach(scene: TOriginTestScene, stance: TOriginStance) {
    const document = makeDocument(scene)
    scene.engine.setOriginDocument(document)
    scene.engine.setOriginLink(makeLink(scene, document.id, stance))
    return document
}

describe("enthymeme suggestions", () => {
    test("an argument with no source text yields none", () => {
        const scene = buildOriginScene()

        expect(
            deriveEnthymemeSuggestions(scene.engine.getProjectSnapshot())
        ).toEqual([])
    })

    test("a seed-stance document with wholly unanchored content yields none", () => {
        const scene = buildOriginScene()
        attach(scene, "seed")

        expect(
            deriveEnthymemeSuggestions(scene.engine.getProjectSnapshot())
        ).toEqual([])
    })

    test("a representation-stance document suggests every unanchored premise and claim expression", () => {
        const scene = buildOriginScene()
        attach(scene, "representation")

        const suggestions = deriveEnthymemeSuggestions(
            scene.engine.getProjectSnapshot()
        )

        expect(suggestions).toContainEqual({
            targetType: "premise",
            targetId: scene.premiseId,
        })
        expect(suggestions).toContainEqual({
            targetType: "expression",
            targetId: scene.claimBoundExpressionId,
        })
    })

    test("a premise-bound variable expression is never suggested", () => {
        const scene = buildOriginScene()
        attach(scene, "representation")

        const suggestions = deriveEnthymemeSuggestions(
            scene.engine.getProjectSnapshot()
        )

        expect(suggestions.map((s) => s.targetId)).not.toContain(
            scene.premiseBoundExpressionId
        )
    })

    test("anchored content is not suggested", () => {
        const scene = buildOriginScene()
        const document = attach(scene, "representation")
        scene.engine.addOriginAnchor(
            makeAnchor(scene, document.id, "premise", scene.premiseId)
        )

        const suggestions = deriveEnthymemeSuggestions(
            scene.engine.getProjectSnapshot()
        )

        expect(suggestions.map((s) => s.targetId)).not.toContain(
            scene.premiseId
        )
    })

    test("already-marked content is not suggested", () => {
        const scene = buildOriginScene()
        attach(scene, "representation")
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, true)

        const suggestions = deriveEnthymemeSuggestions(
            scene.engine.getProjectSnapshot()
        )

        expect(suggestions.map((s) => s.targetId)).not.toContain(
            scene.premiseId
        )
    })
})

describe("enthymeme contradictions", () => {
    test("content both anchored and marked is reported under representation", () => {
        const scene = buildOriginScene()
        const document = attach(scene, "representation")
        const anchor = makeAnchor(
            scene,
            document.id,
            "premise",
            scene.premiseId
        )
        scene.engine.addOriginAnchor(anchor)
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, true)

        expect(
            deriveEnthymemeContradictions(scene.engine.getProjectSnapshot())
        ).toEqual([
            {
                targetType: "premise",
                targetId: scene.premiseId,
                anchorIds: [anchor.id],
            },
        ])
    })

    test("the same state under seed reports nothing", () => {
        const scene = buildOriginScene()
        const document = attach(scene, "seed")
        scene.engine.addOriginAnchor(
            makeAnchor(scene, document.id, "premise", scene.premiseId)
        )
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, true)

        expect(
            deriveEnthymemeContradictions(scene.engine.getProjectSnapshot())
        ).toEqual([])
    })

    test("an argument with no source text reports nothing", () => {
        const scene = buildOriginScene()
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, true)

        expect(
            deriveEnthymemeContradictions(scene.engine.getProjectSnapshot())
        ).toEqual([])
    })

    test("a marked but unanchored premise is not a contradiction", () => {
        const scene = buildOriginScene()
        attach(scene, "representation")
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, true)

        expect(
            deriveEnthymemeContradictions(scene.engine.getProjectSnapshot())
        ).toEqual([])
    })

    test("a marked and anchored claim expression is reported", () => {
        const scene = buildOriginScene()
        const document = attach(scene, "representation")
        const anchor = makeAnchor(
            scene,
            document.id,
            "expression",
            scene.claimBoundExpressionId
        )
        scene.engine.addOriginAnchor(anchor)
        mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            true
        )

        expect(
            deriveEnthymemeContradictions(scene.engine.getProjectSnapshot())
        ).toContainEqual({
            targetType: "expression",
            targetId: scene.claimBoundExpressionId,
            anchorIds: [anchor.id],
        })
    })
})

describe("the declared-never-derived invariant", () => {
    test("neither derivation writes an enthymeme value", () => {
        const scene = buildOriginScene()
        const document = attach(scene, "representation")
        scene.engine.addOriginAnchor(
            makeAnchor(scene, document.id, "premise", scene.premiseId)
        )

        const before = JSON.stringify(scene.engine.getProjectSnapshot())

        deriveEnthymemeSuggestions(scene.engine.getProjectSnapshot())
        deriveEnthymemeContradictions(scene.engine.getProjectSnapshot())

        expect(JSON.stringify(scene.engine.getProjectSnapshot())).toBe(before)
        for (const premise of Object.values(
            scene.engine.getProjectSnapshot().premises
        )) {
            expect("enthymeme" in premise.premise).toBe(false)
            for (const expression of Object.values(premise.expressions)) {
                expect("enthymeme" in expression).toBe(false)
            }
        }
    })
})
