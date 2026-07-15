/**
 * Symmetric encryption for credentials at rest.
 *
 * Uses Web Crypto AES-256-GCM — native everywhere (Node 20+, Cloudflare
 * Workers), no dependencies, fast enough for per-request use. The key is
 * derived once from INSTANT_VAULT_SECRET via SHA-256.
 *
 * Values are reversibly encrypted (not hashed): the backup engine must be able
 * to decrypt them to authenticate against S3 / the InstantDB Admin API.
 *
 * Payload format: base64( iv[12] || ciphertext ) — the GCM auth tag is
 * appended to the ciphertext by SubtleCrypto.
 */

const IV_BYTES = 12

let keyPromise: Promise<CryptoKey> | null = null

function getKey(): Promise<CryptoKey> {
  if (keyPromise) return keyPromise

  const secret = process.env.INSTANT_VAULT_SECRET
  if (!secret) {
    throw new Error(
      "Missing INSTANT_VAULT_SECRET. Add it to your .env file. See .env.example.",
    )
  }

  keyPromise = (async () => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(secret),
    )
    return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ])
  })()

  return keyPromise
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    ),
  )

  const payload = new Uint8Array(iv.length + ciphertext.length)
  payload.set(iv, 0)
  payload.set(ciphertext, iv.length)
  return toBase64(payload)
}

export async function decryptSecret(payload: string): Promise<string> {
  const key = await getKey()
  const bytes = fromBase64(payload)
  const iv = bytes.slice(0, IV_BYTES)
  const ciphertext = bytes.slice(IV_BYTES)

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  )
  return new TextDecoder().decode(plaintext)
}
