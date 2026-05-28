import { decryptJson } from '../crypto/vaultCrypto'
import { db } from '../database/db'
import { getMeta, setMeta } from '../database/meta'
import type { DecryptedEntry, DecryptedFolder, EncryptedPayload } from '../types'
import { META_KEYS } from './vaultStore.shared'
import type { VaultStoreContext } from './vaultStore.shared'
import type { FolderSecret, VaultEntrySecret } from '../types'

export async function getMasterVaultKey(): Promise<EncryptedPayload | null> {
  return getMeta<EncryptedPayload>(META_KEYS.vaultKey)
}

export async function setMasterVaultKey(payload: EncryptedPayload): Promise<void> {
  await setMeta(META_KEYS.vaultKey, payload)
}

export async function loadVaultContents(key: CryptoKey): Promise<{ folders: DecryptedFolder[]; entries: DecryptedEntry[] }> {
  const [folderRows, entryRows] = await Promise.all([
    db.folders.toArray(),
    db.entries.toArray(),
  ])

  const folders = await Promise.all(
    folderRows.map(async (row) => {
      const secret = await decryptJson<FolderSecret>(row.encrypted, key)
      return {
        id: row.id ?? -1,
        name: secret.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    }),
  )

  const entries = await Promise.all(
    entryRows.map(async (row) => {
      const secret = await decryptJson<VaultEntrySecret>(row.encrypted, key)
      return {
        id: row.id ?? -1,
        folderId: row.folderId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ...secret,
      }
    }),
  )

  return {
    folders: folders.filter((folder) => folder.id !== -1),
    entries: entries.filter((entry) => entry.id !== -1),
  }
}

export function createVaultContext(get: VaultStoreContext['get'], set: VaultStoreContext['set']): VaultStoreContext {
  return { get, set }
}
