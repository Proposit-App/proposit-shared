// ID-independent content digest of a curated argument: a SHA-256 hex over the
// normalized content only — the ordered claims (symbol/title/body) and ordered
// premises (role/title/`ExprNode` tree shape). No UUIDs, no timestamps, no
// argument title/description. Two arguments that are content-identical hash
// equal regardless of database ids; this is the change-detection key the
// deploy-time reconcile compares against the stored digest.

import { sha256Hex } from "./sha256.js"
import type { CuratedArgument, ExprNode } from "../curated-argument/index.js"

// Project an ExprNode to a plain structure carrying only its shape — operator /
// symbol / nesting — with keys in a fixed order so serialization is stable.
function normalizeTree(node: ExprNode): unknown {
    if (node.type === "variable") {
        return { type: "variable", symbol: node.symbol }
    }
    if (node.type === "operator") {
        return {
            type: "operator",
            operator: node.operator,
            children: node.children.map(normalizeTree),
        }
    }
    return { type: "formula", children: node.children.map(normalizeTree) }
}

export function curatedArgumentContentDigest(curated: CuratedArgument): string {
    const normalized = {
        claims: curated.claims.map((claim) => ({
            symbol: claim.symbol,
            title: claim.title,
            body: claim.body,
        })),
        premises: curated.premises.map((premise) => ({
            role: premise.role,
            title: premise.title,
            tree: normalizeTree(premise.tree),
        })),
    }
    // The normalized object is built with a fixed key order at every level, so
    // `JSON.stringify` is deterministic and id-free.
    return sha256Hex(JSON.stringify(normalized))
}
