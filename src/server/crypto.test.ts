import { beforeAll, describe, expect, it } from "vitest"

beforeAll(() => {
  process.env.INSTANT_VAULT_SECRET = "test-secret-for-crypto-roundtrip"
})

describe("crypto.server", () => {
  it("round-trips a secret through encrypt/decrypt", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto.server")
    const plaintext = "super-secret-admin-token-123"

    const encrypted = await encryptSecret(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(await decryptSecret(encrypted)).toBe(plaintext)
  })

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("./crypto.server")
    const a = await encryptSecret("same-input")
    const b = await encryptSecret("same-input")
    expect(a).not.toBe(b)
  })
})
