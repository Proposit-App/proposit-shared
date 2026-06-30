// Drift guard: the committed `content.generated.ts` must match the `.md`
// fixtures it was generated from. If this fails, the `.md` files were edited
// without regenerating — run `pnpm run gen:fixtures` and commit the result.
import { describe, expect, test } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
    figureAboutByCurationId,
    documentMarkdownByCurationId,
    documentAboutByCurationId,
} from "../historical-figures/content.generated.js"

const MD_EXT = ".md"
const ABOUT_BASENAME = "about"
const ABOUT_SUFFIX = "-about"

const figuresDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "historical-figures"
)

function reconstructFromDisk() {
    const figureAbout: Record<string, string> = {}
    const documentMarkdown: Record<string, string> = {}
    const documentAbout: Record<string, string> = {}

    const figureDirs = readdirSync(figuresDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)

    for (const curationId of figureDirs) {
        const dirPath = join(figuresDir, curationId)
        for (const fileName of readdirSync(dirPath)) {
            if (!fileName.endsWith(MD_EXT)) continue
            const base = fileName.slice(0, fileName.length - MD_EXT.length)
            const content = readFileSync(join(dirPath, fileName), "utf8")
            if (base === ABOUT_BASENAME) {
                figureAbout[curationId] = content
            } else if (base.endsWith(ABOUT_SUFFIX)) {
                const docId = base.slice(0, base.length - ABOUT_SUFFIX.length)
                documentAbout[docId] = content
            } else {
                documentMarkdown[base] = content
            }
        }
    }
    return { figureAbout, documentMarkdown, documentAbout }
}

describe("content.generated.ts", () => {
    test("matches the .md fixtures on disk (run `pnpm run gen:fixtures` if this fails)", () => {
        const { figureAbout, documentMarkdown, documentAbout } =
            reconstructFromDisk()
        expect(figureAboutByCurationId).toEqual(figureAbout)
        expect(documentMarkdownByCurationId).toEqual(documentMarkdown)
        expect(documentAboutByCurationId).toEqual(documentAbout)
    })
})
