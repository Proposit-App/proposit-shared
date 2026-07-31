import { describe, test, expect } from "vitest"
import { PropositArgumentEngine } from "../../engine.js"
import type { TProjectSnapshot } from "../../engine.js"
import {
    buildOriginScene,
    makeAnchor,
    makeDocument,
    makeLink,
} from "../../__tests__/origin-fixtures.js"
import {
    mutateAddOriginAnchor,
    mutateAttachOriginDocument,
    mutateAttributeOriginDocument,
    mutateDetachOriginDocument,
    mutateMarkExpressionEnthymeme,
    mutateMarkPremiseEnthymeme,
    mutateRemoveOriginAnchor,
    mutateSetOriginStance,
} from "../origin.js"
import type { TPropositionalExpressionCombined } from "../../../schemas/logic.js"

// Only a variable expression can carry the mark — core reports a mark on an
// operator or formula expression as a Presentable violation.
function asVariableExpression(expression: TPropositionalExpressionCombined) {
    if (expression.type !== "variable") {
        throw new Error("expected a variable expression")
    }
    return expression
}

describe("enthymeme mutations", () => {
    test("a premise can be marked unspoken on an argument with no source text", () => {
        const scene = buildOriginScene()

        const { premise } = mutateMarkPremiseEnthymeme(
            scene.engine,
            scene.premiseId,
            true
        )

        expect(premise.enthymeme).toBe(true)
        expect(scene.engine.getOrigin().document).toBeUndefined()
    })

    test("a claim expression can be marked unspoken on an argument with no source text", () => {
        const scene = buildOriginScene()

        const { expression } = mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            true
        )

        expect(asVariableExpression(expression).enthymeme).toBe(true)
    })

    test("unmarking a premise deletes the key rather than writing false or null", () => {
        const scene = buildOriginScene()
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, true)

        const { premise } = mutateMarkPremiseEnthymeme(
            scene.engine,
            scene.premiseId,
            false
        )

        expect("enthymeme" in premise).toBe(false)
    })

    test("unmarking an expression deletes the key rather than writing false or null", () => {
        const scene = buildOriginScene()
        mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            true
        )

        const { expression } = mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            false
        )

        expect("enthymeme" in expression).toBe(false)
    })

    test("marking a premise returns a changeset carrying the modified premise", () => {
        const scene = buildOriginScene()

        const { changes } = mutateMarkPremiseEnthymeme(
            scene.engine,
            scene.premiseId,
            true
        )

        expect(changes.premises?.modified.map((p) => p.id)).toContain(
            scene.premiseId
        )
    })

    test("marking an expression returns a changeset carrying the modified expression", () => {
        const scene = buildOriginScene()

        const { changes } = mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            true
        )

        expect(changes.expressions?.modified.map((e) => e.id)).toEqual([
            scene.claimBoundExpressionId,
        ])
    })

    test("marks survive a snapshot round-trip", () => {
        const scene = buildOriginScene()
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, true)
        mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            true
        )

        const restored = PropositArgumentEngine.fromServerData(
            scene.engine.snapshot() as TProjectSnapshot,
            [],
            []
        )

        const snapshot = restored.getProjectSnapshot()
        expect(snapshot.premises[scene.premiseId]?.premise.enthymeme).toBe(true)
        expect(
            asVariableExpression(
                restored.getExpression(scene.claimBoundExpressionId)!
            ).enthymeme
        ).toBe(true)
    })

    test("marking an unknown premise throws", () => {
        const scene = buildOriginScene()

        expect(() =>
            mutateMarkPremiseEnthymeme(scene.engine, "no-such-premise", true)
        ).toThrow()
    })
})

describe("origin mutations", () => {
    test("attaching a document surfaces the document and link, with no changeset", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        const link = makeLink(scene, document.id, "seed")

        const result = mutateAttachOriginDocument(scene.engine, document, link)

        expect(result).toEqual({ document, link })
        expect("changes" in result).toBe(false)
        expect(scene.engine.getOrigin().document).toEqual(document)
        expect(scene.engine.getOrigin().link).toEqual(link)
    })

    test("setting the stance rewrites only the stance", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        mutateAttachOriginDocument(
            scene.engine,
            document,
            makeLink(scene, document.id, "seed")
        )

        const { link } = mutateSetOriginStance(scene.engine, "representation")

        expect(link.stance).toBe("representation")
        expect(scene.engine.getOrigin().link?.stance).toBe("representation")
    })

    test("setting the stance with no link attached throws", () => {
        const scene = buildOriginScene()

        expect(() =>
            mutateSetOriginStance(scene.engine, "representation")
        ).toThrow()
    })

    test("anchors are added and removed through the model surface", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        mutateAttachOriginDocument(
            scene.engine,
            document,
            makeLink(scene, document.id, "seed")
        )
        const anchor = makeAnchor(
            scene,
            document.id,
            "premise",
            scene.premiseId
        )

        mutateAddOriginAnchor(scene.engine, anchor)
        expect(scene.engine.getOrigin().anchors[scene.premiseId]).toEqual([
            anchor,
        ])

        mutateRemoveOriginAnchor(scene.engine, anchor.id)
        expect(scene.engine.getOrigin().anchors).toEqual({})
    })

    test("attributing the document sets the reference and leaves the digest alone", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        mutateAttachOriginDocument(
            scene.engine,
            document,
            makeLink(scene, document.id, "seed")
        )

        const result = mutateAttributeOriginDocument(scene.engine, {
            type: "unparsed",
            text: "Anon., Untitled.",
            citationTypeGuess: "unknown",
        })

        expect(result.document.reference).toEqual({
            type: "unparsed",
            text: "Anon., Untitled.",
            citationTypeGuess: "unknown",
        })
        expect(result.document.digest).toBe(document.digest)
        expect(result.document.checksum).toBe(document.checksum)
    })

    test("clearing the attribution deletes the key", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        mutateAttachOriginDocument(
            scene.engine,
            document,
            makeLink(scene, document.id, "seed")
        )
        mutateAttributeOriginDocument(scene.engine, {
            type: "unparsed",
            text: "Anon., Untitled.",
            citationTypeGuess: "unknown",
        })

        const result = mutateAttributeOriginDocument(scene.engine, undefined)

        expect("reference" in result.document).toBe(false)
    })

    test("detaching drops the document, the link, and every anchor together", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        mutateAttachOriginDocument(
            scene.engine,
            document,
            makeLink(scene, document.id, "representation")
        )
        mutateAddOriginAnchor(
            scene.engine,
            makeAnchor(scene, document.id, "premise", scene.premiseId)
        )

        mutateDetachOriginDocument(scene.engine)

        expect(scene.engine.getOrigin()).toEqual({
            document: undefined,
            link: undefined,
            anchors: {},
        })
    })
})
