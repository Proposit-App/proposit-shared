// Pure-JS SHA-256 (FIPS 180-4) over a UTF-8 string, returning lowercase hex.
//
// Dependency-free and runtime-agnostic on purpose: no Node `crypto`, no Web
// `crypto.subtle`, not even `TextEncoder`. UTF-8 encoding is done by hand so the
// whole module ships safely to `dist/` under this package's no-DOM/no-Node rule.
// `@proposit/proposit-core`'s checksum helper is FNV-1a (32-bit, non-crypto), so
// it cannot be reused where a real SHA-256 content digest is wanted.

// Round constants: first 32 bits of the fractional parts of the cube roots of
// the first 64 primes.
const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function rotateRight(value: number, bits: number): number {
    return (value >>> bits) | (value << (32 - bits))
}

// Encode a JS (UTF-16) string as UTF-8 bytes, handling surrogate pairs.
function utf8Bytes(input: string): number[] {
    const bytes: number[] = []
    for (let i = 0; i < input.length; i++) {
        let code = input.charCodeAt(i)
        if (code < 0x80) {
            bytes.push(code)
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
        } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
            // High surrogate followed by a low surrogate → one code point.
            const low = input.charCodeAt(i + 1)
            code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00)
            i++
            bytes.push(
                0xf0 | (code >> 18),
                0x80 | ((code >> 12) & 0x3f),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f)
            )
        } else {
            bytes.push(
                0xe0 | (code >> 12),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f)
            )
        }
    }
    return bytes
}

export function sha256Hex(input: string): string {
    const hash = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
        0x1f83d9ab, 0x5be0cd19,
    ])

    const bytes = utf8Bytes(input)
    const bitLength = bytes.length * 8

    // Pad: append 0x80, then zero bytes until length ≡ 56 (mod 64).
    bytes.push(0x80)
    while (bytes.length % 64 !== 56) {
        bytes.push(0)
    }
    // Append the original message length as a 64-bit big-endian integer.
    const high = Math.floor(bitLength / 0x100000000)
    const low = bitLength >>> 0
    bytes.push(
        (high >>> 24) & 0xff,
        (high >>> 16) & 0xff,
        (high >>> 8) & 0xff,
        high & 0xff,
        (low >>> 24) & 0xff,
        (low >>> 16) & 0xff,
        (low >>> 8) & 0xff,
        low & 0xff
    )

    const schedule = new Uint32Array(64)
    for (let offset = 0; offset < bytes.length; offset += 64) {
        for (let i = 0; i < 16; i++) {
            const j = offset + i * 4
            schedule[i] =
                (bytes[j] << 24) |
                (bytes[j + 1] << 16) |
                (bytes[j + 2] << 8) |
                bytes[j + 3]
        }
        for (let i = 16; i < 64; i++) {
            const w15 = schedule[i - 15]
            const w2 = schedule[i - 2]
            const s0 = rotateRight(w15, 7) ^ rotateRight(w15, 18) ^ (w15 >>> 3)
            const s1 = rotateRight(w2, 17) ^ rotateRight(w2, 19) ^ (w2 >>> 10)
            schedule[i] = (schedule[i - 16] + s0 + schedule[i - 7] + s1) >>> 0
        }

        let a = hash[0]
        let b = hash[1]
        let c = hash[2]
        let d = hash[3]
        let e = hash[4]
        let f = hash[5]
        let g = hash[6]
        let h = hash[7]

        for (let i = 0; i < 64; i++) {
            const bigS1 =
                rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
            const choice = (e & f) ^ (~e & g)
            const temp1 = (h + bigS1 + choice + K[i] + schedule[i]) >>> 0
            const bigS0 =
                rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
            const majority = (a & b) ^ (a & c) ^ (b & c)
            const temp2 = (bigS0 + majority) >>> 0

            h = g
            g = f
            f = e
            e = (d + temp1) >>> 0
            d = c
            c = b
            b = a
            a = (temp1 + temp2) >>> 0
        }

        hash[0] = (hash[0] + a) >>> 0
        hash[1] = (hash[1] + b) >>> 0
        hash[2] = (hash[2] + c) >>> 0
        hash[3] = (hash[3] + d) >>> 0
        hash[4] = (hash[4] + e) >>> 0
        hash[5] = (hash[5] + f) >>> 0
        hash[6] = (hash[6] + g) >>> 0
        hash[7] = (hash[7] + h) >>> 0
    }

    let hex = ""
    for (let i = 0; i < 8; i++) {
        hex += hash[i].toString(16).padStart(8, "0")
    }
    return hex
}
