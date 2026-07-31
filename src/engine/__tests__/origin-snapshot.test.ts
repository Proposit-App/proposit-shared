import { describe, test, expect } from "vitest"
import { PropositArgumentEngine } from "../engine.js"
import type { TProjectSnapshot } from "../engine.js"
import {
    buildOriginScene,
    makeAnchor,
    makeDocument,
    makeLink,
} from "./origin-fixtures.js"

describe("origin data on the reactive snapshot", () => {
    test("an argument with no source text carries the empty origin shape", () => {
        const { engine } = buildOriginScene()

        expect(engine.getProjectSnapshot().origin).toEqual({
            document: undefined,
            link: undefined,
            anchors: {},
        })
    })

    test("the origin slice is referentially stable across snapshots", () => {
        const { engine } = buildOriginScene()

        const first = engine.getProjectSnapshot().origin
        const second = engine.getProjectSnapshot().origin

        expect(second).toBe(first)
    })

    test("attaching a document and link surfaces both on the snapshot", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        const link = makeLink(scene, document.id, "representation")

        scene.engine.setOriginDocument(document)
        scene.engine.setOriginLink(link)

        const origin = scene.engine.getOrigin()
        expect(origin.document).toEqual(document)
        expect(origin.link).toEqual(link)
    })

    test("anchors are grouped by target id", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        scene.engine.setOriginDocument(document)
        scene.engine.setOriginLink(makeLink(scene, document.id, "seed"))

        const premiseAnchor = makeAnchor(
            scene,
            document.id,
            "premise",
            scene.premiseId
        )
        const expressionAnchor = makeAnchor(
            scene,
            document.id,
            "expression",
            scene.claimBoundExpressionId
        )
        const secondPremiseAnchor = makeAnchor(
            scene,
            document.id,
            "premise",
            scene.premiseId
        )

        scene.engine.addOriginAnchor(premiseAnchor)
        scene.engine.addOriginAnchor(expressionAnchor)
        scene.engine.addOriginAnchor(secondPremiseAnchor)

        const { anchors } = scene.engine.getOrigin()
        expect(anchors[scene.premiseId]).toEqual([
            premiseAnchor,
            secondPremiseAnchor,
        ])
        expect(anchors[scene.claimBoundExpressionId]).toEqual([
            expressionAnchor,
        ])
    })

    test("removeOriginAnchor drops the anchor and its now-empty group", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        scene.engine.setOriginDocument(document)
        scene.engine.setOriginLink(makeLink(scene, document.id, "seed"))
        const anchor = makeAnchor(
            scene,
            document.id,
            "premise",
            scene.premiseId
        )
        scene.engine.addOriginAnchor(anchor)

        scene.engine.removeOriginAnchor(anchor.id)

        expect(scene.engine.getOrigin().anchors).toEqual({})
    })

    test("clearOrigin returns the snapshot to the empty shape", () => {
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        scene.engine.setOriginDocument(document)
        scene.engine.setOriginLink(
            makeLink(scene, document.id, "representation")
        )
        scene.engine.addOriginAnchor(
            makeAnchor(scene, document.id, "premise", scene.premiseId)
        )

        scene.engine.clearOrigin()

        expect(scene.engine.getProjectSnapshot().origin).toEqual({
            document: undefined,
            link: undefined,
            anchors: {},
        })
    })

    test("fromServerData still accepts three arguments and yields the empty shape", () => {
        const scene = buildOriginScene()
        const snapshot = scene.engine.snapshot() as TProjectSnapshot

        const restored = PropositArgumentEngine.fromServerData(snapshot, [], [])

        expect(restored.getProjectSnapshot().origin).toEqual({
            document: undefined,
            link: undefined,
            anchors: {},
        })
    })

    test("fromServerData refuses anchors with no attached document", () => {
        // The shape a mis-cascaded document delete produces. Loading it
        // cleanly let the markdown export quote a source that is not attached,
        // because renderLogic reads anchors without checking for a document.
        const scene = buildOriginScene()
        const snapshot = scene.engine.snapshot() as TProjectSnapshot
        const anchor = makeAnchor(
            scene,
            "a-deleted-document",
            "premise",
            scene.premiseId
        )

        expect(() =>
            PropositArgumentEngine.fromServerData(snapshot, [], [], {
                document: null,
                link: null,
                anchors: [anchor],
            })
        ).toThrow(/not the attached source text/)
    })

    test("fromServerData refuses an anchor into a document other than the attached one", () => {
        const scene = buildOriginScene()
        const snapshot = scene.engine.snapshot() as TProjectSnapshot
        const document = makeDocument(scene)

        expect(() =>
            PropositArgumentEngine.fromServerData(snapshot, [], [], {
                document,
                link: makeLink(scene, document.id, "seed"),
                anchors: [
                    makeAnchor(
                        scene,
                        "another-document",
                        "premise",
                        scene.premiseId
                    ),
                ],
            })
        ).toThrow(/not the attached source text/)
    })

    test("fromServerData loads supplied origin data without notifying", () => {
        const scene = buildOriginScene()
        const snapshot = scene.engine.snapshot() as TProjectSnapshot
        const document = makeDocument(scene)
        const link = makeLink(scene, document.id, "representation")
        const anchor = makeAnchor(
            scene,
            document.id,
            "premise",
            scene.premiseId
        )

        const restored = PropositArgumentEngine.fromServerData(
            snapshot,
            [],
            [],
            { document, link, anchors: [anchor] }
        )

        const origin = restored.getOrigin()
        expect(origin.document).toEqual(document)
        expect(origin.link).toEqual(link)
        expect(origin.anchors[scene.premiseId]).toEqual([anchor])
    })
})
