// YAML serialize / parse for curated arguments. Thin wrappers over the `yaml`
// package plus TypeBox validation against `CuratedArgumentYamlSchema`, so a
// malformed argument never round-trips silently.

import { Value } from "typebox/value"
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"
import {
    CuratedArgumentYamlSchema,
    type TCuratedArgumentYaml,
} from "./schema.js"

function firstError(value: unknown): string {
    const [error] = [...Value.Errors(CuratedArgumentYamlSchema, value)]
    return error?.message ?? "unknown validation error"
}

export function serializeArgumentYaml(curated: TCuratedArgumentYaml): string {
    if (!Value.Check(CuratedArgumentYamlSchema, curated)) {
        throw new Error(
            `Cannot serialize curated argument — does not match the YAML schema: ${firstError(
                curated
            )}`
        )
    }
    return stringifyYaml(curated)
}

export function parseArgumentYaml(yamlString: string): TCuratedArgumentYaml {
    let raw: unknown
    try {
        raw = parseYaml(yamlString)
    } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause)
        throw new Error(`Invalid YAML: ${message}`)
    }
    if (!Value.Check(CuratedArgumentYamlSchema, raw)) {
        throw new Error(
            `Parsed YAML does not match the curated-argument schema: ${firstError(
                raw
            )}`
        )
    }
    return raw as TCuratedArgumentYaml
}
