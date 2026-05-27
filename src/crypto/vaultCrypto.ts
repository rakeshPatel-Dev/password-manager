import type { AuthConfig, EncryptedPayload, RecoveryConfig } from '../types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const PBKDF2_ITERATIONS = 250000
const KEY_BITS = 256
const RECOVERY_CONFIG_VERSION = 2

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

function randomBase64(byteLength: number): string {
  const random = crypto.getRandomValues(new Uint8Array(byteLength))
  return bytesToBase64(random)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function normalizeRecoveryKey(input: string): string {
  return input.trim().toUpperCase().replace(/\s|-/g, '')
}

function prettyRecoveryKey(raw: string): string {
  const chunks = raw.match(/.{1,4}/g)
  return chunks ? chunks.join('-') : raw
}

async function digestBase64(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(value))
  return bytesToBase64(new Uint8Array(digest))
}

async function deriveKeyRaw(password: string, saltBase64: string, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(base64ToBytes(saltBase64)),
      iterations,
      hash: 'SHA-256',
    },
    material,
    KEY_BITS,
  )

  return new Uint8Array(bits)
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toArrayBuffer(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function createVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: KEY_BITS }, true, ['encrypt', 'decrypt'])
}

async function exportVaultKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return bytesToBase64(new Uint8Array(exported))
}

async function importVaultKey(rawBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toArrayBuffer(base64ToBytes(rawBase64)), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

async function wrapVaultKey(vaultKey: CryptoKey, wrappingKey: CryptoKey): Promise<EncryptedPayload> {
  const raw = await exportVaultKey(vaultKey)
  return encryptJson({ raw }, wrappingKey)
}

async function unwrapVaultKey(payload: EncryptedPayload, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const parsed = await decryptJson<{ raw: string }>(payload, wrappingKey)
  return importVaultKey(parsed.raw)
}

export async function createAuthConfig(password: string): Promise<{ authConfig: AuthConfig; key: CryptoKey }> {
  const salt = randomBase64(16)
  const raw = await deriveKeyRaw(password, salt, PBKDF2_ITERATIONS)
  const verifier = await digestBase64(raw)
  const key = await importAesKey(raw)

  return {
    authConfig: {
      salt,
      iterations: PBKDF2_ITERATIONS,
      verifier,
      createdAt: new Date().toISOString(),
    },
    key,
  }
}

export async function verifyAuthPassword(
  password: string,
  authConfig: AuthConfig,
): Promise<{ valid: boolean; key: CryptoKey | null }> {
  const raw = await deriveKeyRaw(password, authConfig.salt, authConfig.iterations)
  const verifier = await digestBase64(raw)

  if (verifier !== authConfig.verifier) {
    return { valid: false, key: null }
  }

  return { valid: true, key: await importAesKey(raw) }
}

export async function encryptJson<T>(value: T, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const payload = encoder.encode(JSON.stringify(value))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(payload),
  )

  return {
    iv: bytesToBase64(iv),
    cipherText: bytesToBase64(new Uint8Array(encrypted)),
  }
}

export async function decryptJson<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
  const iv = base64ToBytes(payload.iv)
  const encrypted = base64ToBytes(payload.cipherText)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encrypted),
  )
  return JSON.parse(decoder.decode(decrypted)) as T
}

async function hashRecoveryKey(recoveryKey: string, saltBase64: string): Promise<string> {
  const normalized = normalizeRecoveryKey(recoveryKey)
  const merged = encoder.encode(`${normalized}:${saltBase64}`)
  return digestBase64(merged)
}

export function generateRecoveryKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

  return prettyRecoveryKey(hex)
}

export async function createRecoveryConfig(recoveryKey: string, key: CryptoKey): Promise<RecoveryConfig> {
  const salt = randomBase64(16)
  const verifier = await hashRecoveryKey(recoveryKey, salt)
  const recoveryWrappingKey = await createRecoveryWrappingKey(recoveryKey, salt)
  const encryptedKey = await encryptJson({ recoveryKey }, key)
  const wrappedVaultKey = await wrapVaultKey(key, recoveryWrappingKey)

  return {
    version: RECOVERY_CONFIG_VERSION,
    salt,
    verifier,
    encryptedKey,
    wrappedVaultKey,
  }
}

export async function verifyRecoveryKeyInput(input: string, recoveryConfig: RecoveryConfig): Promise<boolean> {
  const verifier = await hashRecoveryKey(input, recoveryConfig.salt)
  return verifier === recoveryConfig.verifier
}

export async function decryptRecoveryKey(recoveryConfig: RecoveryConfig, key: CryptoKey): Promise<string> {
  if (!recoveryConfig.encryptedKey) {
    throw new Error('Recovery key envelope is missing.')
  }

  const parsed = await decryptJson<{ recoveryKey: string }>(recoveryConfig.encryptedKey, key)
  return parsed.recoveryKey
}

export async function createRecoveryWrappingKey(recoveryKey: string, salt: string): Promise<CryptoKey> {
  const raw = await deriveKeyRaw(recoveryKey, salt, PBKDF2_ITERATIONS)
  return importAesKey(raw)
}

export async function createMasterWrappingKey(password: string, salt: string, iterations: number): Promise<CryptoKey> {
  const raw = await deriveKeyRaw(password, salt, iterations)
  return importAesKey(raw)
}

export async function wrapVaultKeyForMaster(vaultKey: CryptoKey, wrappingKey: CryptoKey): Promise<EncryptedPayload> {
  return wrapVaultKey(vaultKey, wrappingKey)
}

export async function unwrapVaultKeyFromMaster(payload: EncryptedPayload, wrappingKey: CryptoKey): Promise<CryptoKey> {
  return unwrapVaultKey(payload, wrappingKey)
}

export async function unwrapVaultKeyFromRecovery(payload: EncryptedPayload, recoveryKey: string, salt: string): Promise<CryptoKey> {
  const wrappingKey = await createRecoveryWrappingKey(recoveryKey, salt)
  return unwrapVaultKey(payload, wrappingKey)
}

export async function createWrappedVaultKeyForRecovery(vaultKey: CryptoKey, recoveryKey: string, salt: string): Promise<EncryptedPayload> {
  const wrappingKey = await createRecoveryWrappingKey(recoveryKey, salt)
  return wrapVaultKey(vaultKey, wrappingKey)
}
