import type { TApiClientConfig } from "./config.js"

/**
 * Resolves `config.baseUrl` to a string. Called per-request (not cached) so
 * that a thunk-form baseUrl can re-read environment variables on each call.
 */
export function resolveBaseUrl(config: TApiClientConfig): string {
    return typeof config.baseUrl === "function"
        ? config.baseUrl()
        : config.baseUrl
}
