import {
  createVaultKey,
  createAuthConfig,
  createRecoveryConfig,
  decryptJson,
  decryptRecoveryKey,
  encryptJson,
  generateRecoveryKey,
  importRawAesKey,
  verifyAuthPassword,
  verifyRecoveryKeyInput,
  unwrapVaultKeyFromMaster,
  unwrapVaultKeyFromRecovery,
  wrapVaultKeyForMaster,
} from '../crypto/vaultCrypto'
import { db } from '../database/db'
import { getMeta, removeMeta, setMeta } from '../database/meta'
import type { PasskeyConfig, RecoveryConfig } from '../types'
import { DEFAULT_SETTINGS, META_KEYS } from './vaultStore.shared'
import type { VaultStoreContext } from './vaultStore.shared'
import { getMasterVaultKey, loadVaultContents, setMasterVaultKey } from './vaultPersistence.service'
import type { FolderSecret, VaultEntrySecret } from '../types'

const PASSKEY_RP_ID = window.location.hostname || 'localhost'
const PASSKEY_SECRET_LENGTH = 32

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const normalized = padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')
  const binary = atob(normalized)
  const output = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index)
  }

  return output
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PASSKEY_SECRET_LENGTH))
}

function readPasskeyPrfBytes(credential: PublicKeyCredential): Uint8Array | null {
  const extensionResults = credential.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer | Uint8Array | null } }
  }

  const result = extensionResults.prf?.results?.first
  if (!result) {
    return null
  }

  return result instanceof Uint8Array ? result : new Uint8Array(result)
}

export async function bootstrapVault(context: VaultStoreContext): Promise<void> {
  const [authConfig, recoveryConfig, settings, passkeyConfig] = await Promise.all([
    getMeta(META_KEYS.auth),
    getMeta(META_KEYS.recovery),
    getMeta(META_KEYS.settings),
    getMeta<PasskeyConfig>(META_KEYS.passkey),
  ])
  const setupPending = await getMeta<boolean>(META_KEYS.setupPending)

  context.set({
    isBootstrapping: false,
    isConfigured: Boolean(authConfig && recoveryConfig) && !setupPending,
    setupPending: Boolean(setupPending),
    authConfig,
    settings: settings ?? DEFAULT_SETTINGS,
    passkeyConfig: passkeyConfig ?? null,
  })
}

export async function setupVault(context: VaultStoreContext, password: string): Promise<string> {
  const { authConfig, key: masterWrappingKey } = await createAuthConfig(password)
  const vaultKey = await createVaultKey()
  const recoveryKey = generateRecoveryKey()
  const recoveryConfig = await createRecoveryConfig(recoveryKey, vaultKey)
  const wrappedVaultKey = await wrapVaultKeyForMaster(vaultKey, masterWrappingKey)

  await Promise.all([
    setMeta(META_KEYS.auth, authConfig),
    setMasterVaultKey(wrappedVaultKey),
    setMeta(META_KEYS.recovery, recoveryConfig),
    setMeta(META_KEYS.settings, DEFAULT_SETTINGS),
    setMeta(META_KEYS.setupPending, true),
  ])

  context.set({
    isConfigured: false,
    setupPending: true,
    isUnlocked: false,
    authConfig,
    settings: DEFAULT_SETTINGS,
    passkeyConfig: null,
    key: vaultKey,
    folders: [],
    entries: [],
    searchTerm: '',
    selectedFolderId: 'all',
    lastActivityAt: Date.now(),
  })

  return recoveryKey
}

export async function completeVaultSetup(context: VaultStoreContext): Promise<void> {
  await removeMeta(META_KEYS.setupPending)

  context.set((state) => ({
    setupPending: false,
    isConfigured: Boolean(state.authConfig),
    isUnlocked: Boolean(state.key),
  }))
}

export async function registerPasskey(context: VaultStoreContext): Promise<{ ok: boolean; message: string }> {
  const state = context.get()
  if (!state.isUnlocked || !state.key) {
    return { ok: false, message: 'Unlock the vault before creating a passkey.' }
  }

  if (!window.PublicKeyCredential) {
    return { ok: false, message: 'Passkeys are not supported in this browser.' }
  }

  const challenge = generateChallenge()
  const passkeySalt = generateChallenge()
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'PassVault',
        id: PASSKEY_RP_ID,
      },
      user: {
        id: challenge,
        name: 'local-user',
        displayName: 'PassVault User',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      timeout: 60000,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      extensions: {
        prf: {
          eval: {
            first: passkeySalt,
          },
        },
      },
      attestation: 'none',
    },
  })

  if (!credential || credential.type !== 'public-key') {
    return { ok: false, message: 'Passkey registration was cancelled.' }
  }

  const prfBytes = readPasskeyPrfBytes(credential)
  if (!prfBytes) {
    return { ok: false, message: 'This browser or passkey does not support local PRF passkeys.' }
  }

  const credentialId = bytesToBase64Url(new Uint8Array(credential.rawId))
  const wrappingKey = await importRawAesKey(prfBytes)
  const wrappedVaultKey = await wrapVaultKeyForMaster(state.key, wrappingKey)
  const passkeyConfig: PasskeyConfig = {
    version: 1,
    createdAt: new Date().toISOString(),
    credentialId,
    salt: bytesToBase64Url(passkeySalt),
    rpId: PASSKEY_RP_ID,
    wrappedVaultKey,
  }

  await Promise.all([
    setMeta(META_KEYS.passkey, passkeyConfig),
    db.passkeys.put(passkeyConfig),
  ])

  context.set({ passkeyConfig })
  return { ok: true, message: 'Passkey created successfully.' }
}

export async function unlockVaultWithPasskey(context: VaultStoreContext): Promise<boolean> {
  const passkeyConfig = await getMeta<PasskeyConfig>(META_KEYS.passkey)
  if (!passkeyConfig || !window.PublicKeyCredential) {
    return false
  }

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: generateChallenge(),
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: [
        {
          id: base64UrlToBytes(passkeyConfig.credentialId),
          type: 'public-key',
        },
      ],
      rpId: passkeyConfig.rpId,
      extensions: {
        prf: {
          eval: {
            first: base64UrlToBytes(passkeyConfig.salt),
          },
        },
      },
    },
  })

  if (!credential || credential.type !== 'public-key') {
    return false
  }

  const prfBytes = readPasskeyPrfBytes(credential)
  if (!prfBytes) {
    return false
  }

  const wrappingKey = await importRawAesKey(prfBytes)
  const vaultKey = await unwrapVaultKeyFromMaster(passkeyConfig.wrappedVaultKey, wrappingKey)
  const decrypted = await loadVaultContents(vaultKey)

  context.set({
    isUnlocked: true,
    key: vaultKey,
    folders: decrypted.folders,
    entries: decrypted.entries,
    lastActivityAt: Date.now(),
  })

  return true
}

export async function unlockVault(context: VaultStoreContext, password: string): Promise<boolean> {
  const authConfig = context.get().authConfig
  if (!authConfig) {
    return false
  }

  const verification = await verifyAuthPassword(password, authConfig)
  if (!verification.valid || !verification.key) {
    return false
  }

  const legacyKey = verification.key

  const vaultKeyMeta = await getMasterVaultKey()
  const recoveryConfig = await getMeta<RecoveryConfig>(META_KEYS.recovery)

  let vaultKey: CryptoKey = legacyKey
  let migrated = false

  if (vaultKeyMeta) {
    vaultKey = await unwrapVaultKeyFromMaster(vaultKeyMeta, legacyKey)
  } else if (recoveryConfig) {
    migrated = true
  }

  const decrypted = await loadVaultContents(vaultKey)

  if (migrated && recoveryConfig) {
    const recoveryKey = await decryptRecoveryKey(recoveryConfig, legacyKey)
    const nextVaultKey = await createVaultKey()
    const nextWrappedVaultKey = await wrapVaultKeyForMaster(nextVaultKey, legacyKey)
    const nextRecoveryConfig = await createRecoveryConfig(recoveryKey, nextVaultKey)

    await db.transaction('rw', db.meta, db.folders, db.entries, async () => {
      const folderRows = await db.folders.toArray()
      const entryRows = await db.entries.toArray()

      for (const folder of folderRows) {
        if (!folder.id) {
          continue
        }

        const secret = await decryptJson<FolderSecret>(folder.encrypted, legacyKey)
        const encrypted = await encryptJson(secret, nextVaultKey)
        await db.folders.update(folder.id, { encrypted })
      }

      for (const entry of entryRows) {
        if (!entry.id) {
          continue
        }

        const secret = await decryptJson<VaultEntrySecret>(entry.encrypted, legacyKey)
        const encrypted = await encryptJson(secret, nextVaultKey)
        await db.entries.update(entry.id, { encrypted })
      }

      await setMasterVaultKey(nextWrappedVaultKey)
      await setMeta(META_KEYS.recovery, nextRecoveryConfig)
    })

    vaultKey = nextVaultKey
  }

  context.set({
    isUnlocked: true,
    key: vaultKey,
    folders: decrypted.folders,
    entries: decrypted.entries,
    lastActivityAt: Date.now(),
  })

  return true
}

export async function changeMasterPassword(
  context: VaultStoreContext,
  currentPassword: string,
  nextPassword: string,
): Promise<{ ok: boolean; message: string }> {
  const state = context.get()
  if (!state.authConfig || !state.key || !state.isUnlocked) {
    return { ok: false, message: 'Unlock the vault before changing the master password.' }
  }

  const activeVaultKey = state.key

  if (nextPassword.length < 10) {
    return { ok: false, message: 'New master password must be at least 10 characters.' }
  }

  const currentCheck = await verifyAuthPassword(currentPassword, state.authConfig)
  if (!currentCheck.valid) {
    return { ok: false, message: 'Current master password is incorrect.' }
  }

  const recoveryConfig = await getMeta<RecoveryConfig>(META_KEYS.recovery)
  if (!recoveryConfig) {
    return { ok: false, message: 'Recovery key metadata is missing.' }
  }

  const { authConfig: nextAuthConfig, key: nextMasterKey } = await createAuthConfig(nextPassword)
  const nextWrappedVaultKey = await wrapVaultKeyForMaster(activeVaultKey, nextMasterKey)

  await Promise.all([
    setMeta(META_KEYS.auth, nextAuthConfig),
    setMasterVaultKey(nextWrappedVaultKey),
  ])

  if (!recoveryConfig.wrappedVaultKey) {
    const recoveryKey = await decryptRecoveryKey(recoveryConfig, activeVaultKey)
    const nextRecoveryConfig = await createRecoveryConfig(recoveryKey, activeVaultKey)
    await setMeta(META_KEYS.recovery, nextRecoveryConfig)
  }

  context.set({ authConfig: nextAuthConfig, key: activeVaultKey, lastActivityAt: Date.now() })
  return { ok: true, message: 'Master password updated successfully.' }
}

export async function getRecoveryKey(context: VaultStoreContext): Promise<string> {
  const key = context.get().key
  if (!key) {
    throw new Error('Vault is locked.')
  }

  const recoveryConfig = await getMeta<RecoveryConfig>(META_KEYS.recovery)
  if (!recoveryConfig) {
    throw new Error('Recovery key not found.')
  }

  return decryptRecoveryKey(recoveryConfig, key)
}

export async function resetVaultWithRecoveryKey(
  context: VaultStoreContext,
  recoveryKey: string,
  nextPassword: string,
): Promise<{ ok: boolean; message: string }> {
  const recoveryConfig = await getMeta<RecoveryConfig>(META_KEYS.recovery)
  if (!recoveryConfig) {
    return { ok: false, message: 'Recovery key metadata is missing.' }
  }

  const valid = await verifyRecoveryKeyInput(recoveryKey, recoveryConfig)
  if (!valid) {
    return { ok: false, message: 'Recovery key is invalid.' }
  }

  if (!recoveryConfig.wrappedVaultKey) {
    return {
      ok: false,
      message: 'This vault was created before recovery wrapping was enabled. Unlock it once with the old master password to migrate first.',
    }
  }

  if (nextPassword.length < 10) {
    return { ok: false, message: 'New master password must be at least 10 characters.' }
  }

  const vaultKey = await unwrapVaultKeyFromRecovery(recoveryConfig.wrappedVaultKey, recoveryKey, recoveryConfig.salt)
  const decrypted = await loadVaultContents(vaultKey)
  const { authConfig: nextAuthConfig, key: nextMasterKey } = await createAuthConfig(nextPassword)
  const nextWrappedVaultKey = await wrapVaultKeyForMaster(vaultKey, nextMasterKey)

  await Promise.all([
    setMeta(META_KEYS.auth, nextAuthConfig),
    setMasterVaultKey(nextWrappedVaultKey),
  ])

  context.set({
    isConfigured: true,
    isUnlocked: true,
    authConfig: nextAuthConfig,
    settings: context.get().settings,
    entries: decrypted.entries,
    folders: decrypted.folders,
    searchTerm: '',
    selectedFolderId: 'all',
    key: vaultKey,
    lastActivityAt: Date.now(),
  })

  return { ok: true, message: 'Vault recovered and master password updated.' }
}
