/**
 * Configuration for the api-client factory. Consumers provide this once at
 * module setup and obtain a bound client via `createApiClient(config)`.
 *
 * Auth is consumer responsibility — wrap `fetchImpl` to inject tokens, refresh,
 * retry, or telemetry. The factory itself is auth-agnostic.
 */
export interface TApiClientConfig {
    /**
     * Prepended to every request URL. Empty string for same-origin.
     *
     * Function form is resolved lazily per-request — use this when the base
     * URL depends on environment variables that may not be available at
     * module-evaluation time (e.g., Next.js build-time static analysis).
     */
    baseUrl: string | (() => string)
    /** The fetch implementation. Consumer wraps for auth / retry / telemetry. */
    fetchImpl: typeof fetch
    /** Optional baseline headers merged into every request. Reserved; not yet consumed by *Impl functions — wire in later if needed. */
    defaultHeaders?: Record<string, string>
}
