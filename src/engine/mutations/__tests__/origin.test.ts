import { describe, test, expect } from "vitest"
import { CHECKSUM_CONFIG } from "../../../checksum.js"
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

describe("the enthymeme checksum invariant", () => {
    // `createChecksumConfig` unions the app's extra fields onto core's
    // per-entity defaults rather than replacing them, and core's defaults now
    // carry `enthymeme`. The mark is therefore checksum-bearing, and the whole
    // reason unmarking must DELETE the key is that a persisted `null`/`false`
    // would move every unmarked entity in the database off its checksum.
    test("the app's effective checksum config hashes the mark", () => {
        expect([...CHECKSUM_CONFIG.expressionFields!]).toContain("enthymeme")
    })

    test("marking changes an entity's checksum; unmarking restores it exactly", () => {
        const scene = buildOriginScene()
        const exprBefore = scene.engine.getExpression(
            scene.claimBoundExpressionId
        )!.checksum
        const premiseBefore = scene.engine
            .getPremise(scene.premiseId)!
            .toPremiseData().checksum

        mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            true
        )
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, true)

        expect(
            scene.engine.getExpression(scene.claimBoundExpressionId)!.checksum
        ).not.toBe(exprBefore)
        expect(
            scene.engine.getPremise(scene.premiseId)!.toPremiseData().checksum
        ).not.toBe(premiseBefore)

        mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            false
        )
        mutateMarkPremiseEnthymeme(scene.engine, scene.premiseId, false)

        expect(
            scene.engine.getExpression(scene.claimBoundExpressionId)!.checksum
        ).toBe(exprBefore)
        expect(
            scene.engine.getPremise(scene.premiseId)!.toPremiseData().checksum
        ).toBe(premiseBefore)
    })
})

describe("enthymeme mutation guards", () => {
    test("marking an operator expression is refused", () => {
        const scene = buildOriginScene()

        expect(() =>
            mutateMarkExpressionEnthymeme(
                scene.engine,
                scene.operatorExpressionId,
                true
            )
        ).toThrow(/only a claim can be marked unspoken/)
    })

    test("marking a premise-bound variable expression is refused", () => {
        const scene = buildOriginScene()

        expect(() =>
            mutateMarkExpressionEnthymeme(
                scene.engine,
                scene.premiseBoundExpressionId,
                true
            )
        ).toThrow(/bound to a premise/)
    })

    test("a returned changeset does not re-write itself on a later mutation", () => {
        const scene = buildOriginScene()
        const { changes } = mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            true
        )
        const captured = changes.expressions?.modified[0]

        mutateMarkExpressionEnthymeme(
            scene.engine,
            scene.claimBoundExpressionId,
            false
        )

        expect(asVariableExpression(captured!).enthymeme).toBe(true)
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

    test("attaching a link that points elsewhere is refused", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        const strayLink = makeLink(scene, "some-other-document", "seed")

        expect(() =>
            mutateAttachOriginDocument(scene.engine, document, strayLink)
        ).toThrow(/not the document being attached/)
    })

    test("replacing the source text drops the previous document's anchors", () => {
        const scene = buildOriginScene()
        const first = makeDocument(scene)
        mutateAttachOriginDocument(
            scene.engine,
            first,
            makeLink(scene, first.id, "representation")
        )
        mutateAddOriginAnchor(
            scene.engine,
            makeAnchor(scene, first.id, "premise", scene.premiseId)
        )

        const corrected = { ...makeDocument(scene), id: "corrected-document" }
        mutateAttachOriginDocument(
            scene.engine,
            corrected,
            makeLink(scene, corrected.id, "representation")
        )

        expect(scene.engine.getOrigin().document?.id).toBe("corrected-document")
        expect(scene.engine.getOrigin().anchors).toEqual({})
    })

    test("an anchor into a document that is not attached is refused", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        mutateAttachOriginDocument(
            scene.engine,
            document,
            makeLink(scene, document.id, "seed")
        )

        expect(() =>
            mutateAddOriginAnchor(
                scene.engine,
                makeAnchor(
                    scene,
                    "a-different-document",
                    "premise",
                    scene.premiseId
                )
            )
        ).toThrow(/not the attached source text/)
    })

    test("attributing the document keeps its anchors", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        mutateAttachOriginDocument(
            scene.engine,
            document,
            makeLink(scene, document.id, "seed")
        )
        mutateAddOriginAnchor(
            scene.engine,
            makeAnchor(scene, document.id, "premise", scene.premiseId)
        )

        mutateAttributeOriginDocument(scene.engine, {
            type: "unparsed",
            text: "Anon., Untitled.",
            citationTypeGuess: "unknown",
        })

        expect(scene.engine.getOrigin().anchors[scene.premiseId]).toHaveLength(
            1
        )
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
