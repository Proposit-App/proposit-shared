import type { TObjectLimitTypes } from "./schemas/model/users.js"

export class NoSessionError extends Error {
    constructor(message: string) {
        super(message)

        this.name = "NoSessionError"
        Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    }
}

export class PermissionsDeniedError extends Error {
    constructor(message: string) {
        super(message)

        this.name = "PermissionsDeniedError"
        Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    }
}

export class ObjectNotFoundError extends Error {
    constructor(message: string) {
        super(message)

        this.name = "ObjectNotFoundError"
        Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    }
}

export class LimitExceededError extends Error {
    readonly limitType: TObjectLimitTypes

    constructor(limitType: TObjectLimitTypes) {
        super(`Limit exceeded for ${limitType}`)

        this.name = "LimitExceededError"
        this.limitType = limitType
        Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    }
}

export class RedirectError extends Error {
    constructor() {
        super(`Redirect required`)

        this.name = "RedirectError"
        Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    }
}

export class PublishValidationError extends Error {
    constructor(message: string) {
        super(message)

        this.name = "PublishValidationError"
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message)

        this.name = "ValidationError"
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export class ChecksumMismatchError extends Error {
    constructor(entity?: string) {
        super(
            entity
                ? `Checksum mismatch on ${entity}. Entity was modified by another operation.`
                : "Checksum mismatch. Entity was modified by another operation."
        )

        this.name = "ChecksumMismatchError"
        Object.setPrototypeOf(this, new.target.prototype)
    }
}
