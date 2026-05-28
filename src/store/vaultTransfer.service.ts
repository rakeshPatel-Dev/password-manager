import { encryptJson } from '../crypto/vaultCrypto'
import { db } from '../database/db'
import { getMeta } from '../database/meta'
import type { AppSettings, AuthConfig, RecoveryConfig } from '../types'
import type { VaultStoreContext } from './vaultStore.shared'
import { DEFAULT_SETTINGS, isLegacyExportBundle, isReadableExportBundle, META_KEYS } from './vaultStore.shared'

export async function exportVault(context: VaultStoreContext): Promise<string> {
  const [metaRows, settings] = await Promise.all([
    db.meta.toArray(),
    Promise.resolve(context.get().settings),
  ])

  const bundle = {
    version: 2 as const,
    exportedAt: new Date().toISOString(),
    format: 'human-readable' as const,
    settings,
    folders: context.get().folders,
    entries: context.get().entries,
    meta: metaRows,
  }

  return JSON.stringify(bundle, null, 2)
}

export async function importVault(context: VaultStoreContext, raw: string): Promise<void> {
  const parsed: unknown = JSON.parse(raw)

  if (isLegacyExportBundle(parsed)) {
    await db.transaction('rw', db.meta, db.folders, db.entries, async () => {
      await db.entries.clear()
      await db.folders.clear()
      await db.meta.clear()

      if (parsed.meta.length > 0) {
        await db.meta.bulkPut(parsed.meta)
      }

      if (parsed.folders.length > 0) {
        await db.folders.bulkPut(parsed.folders)
      }

      if (parsed.entries.length > 0) {
        await db.entries.bulkPut(parsed.entries)
      }
    })
  } else if (isReadableExportBundle(parsed)) {
    const key = context.get().key
    if (!key) {
      throw new Error('Unlock the vault before importing a readable export.')
    }

    const folderRows = await Promise.all(
      parsed.folders.map(async (folder) => ({
        id: folder.id,
        encrypted: await encryptJson({ name: folder.name }, key),
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      })),
    )

    const entryRows = await Promise.all(
      parsed.entries.map(async (entry) => ({
        id: entry.id,
        encrypted: await encryptJson(
          {
            title: entry.title,
            username: entry.username,
            email: entry.email,
            password: entry.password,
            website: entry.website,
            notes: entry.notes,
          },
          key,
        ),
        folderId: entry.folderId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    )

    await db.transaction('rw', db.meta, db.folders, db.entries, async () => {
      await db.entries.clear()
      await db.folders.clear()
      await db.meta.clear()

      if (parsed.meta.length > 0) {
        await db.meta.bulkPut(parsed.meta)
      }

      if (folderRows.length > 0) {
        await db.folders.bulkPut(folderRows)
      }

      if (entryRows.length > 0) {
        await db.entries.bulkPut(entryRows)
      }
    })
  } else {
    throw new Error('Invalid vault export format.')
  }

  const [authConfig, recoveryConfig, settings] = await Promise.all([
    getMeta<AuthConfig>(META_KEYS.auth),
    getMeta<RecoveryConfig>(META_KEYS.recovery),
    getMeta<AppSettings>(META_KEYS.settings),
  ])

  const restoredSettings = isReadableExportBundle(parsed) ? parsed.settings : settings ?? DEFAULT_SETTINGS

  context.set({
    isConfigured: Boolean(authConfig && recoveryConfig),
    authConfig,
    settings: restoredSettings,
    isUnlocked: false,
    key: null,
    folders: [],
    entries: [],
    searchTerm: '',
    selectedFolderId: 'all',
  })
}
