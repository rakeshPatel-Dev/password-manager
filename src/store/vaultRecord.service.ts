import { encryptJson } from '../crypto/vaultCrypto'
import { db } from '../database/db'
import { setMeta } from '../database/meta'
import type { AppSettings, DecryptedEntry, FolderSecret, VaultEntrySecret } from '../types'
import { DEFAULT_SETTINGS, META_KEYS } from './vaultStore.shared'
import type { VaultStoreContext } from './vaultStore.shared'

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  return `https://${trimmed.replace(/^https?:\/\//i, '')}`
}

export async function addFolder(context: VaultStoreContext, name: string): Promise<void> {
  const key = context.get().key
  if (!key) {
    return
  }

  const now = new Date().toISOString()
  const encrypted = await encryptJson<FolderSecret>({ name: name.trim() }, key)
  const id = await db.folders.add({ encrypted, createdAt: now, updatedAt: now })

  context.set((state) => ({
    folders: [
      ...state.folders,
      {
        id: id as number,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
      },
    ],
  }))
}

export async function renameFolder(context: VaultStoreContext, folderId: number, name: string): Promise<void> {
  const key = context.get().key
  if (!key) {
    return
  }

  const now = new Date().toISOString()
  const encrypted = await encryptJson<FolderSecret>({ name: name.trim() }, key)
  await db.folders.update(folderId, { encrypted, updatedAt: now })

  context.set((state) => ({
    folders: state.folders.map((folder) =>
      folder.id === folderId ? { ...folder, name: name.trim(), updatedAt: now } : folder,
    ),
  }))
}

export async function deleteFolder(context: VaultStoreContext, folderId: number): Promise<void> {
  await db.transaction('rw', db.folders, db.entries, async () => {
    await db.folders.delete(folderId)
    await db.entries.where('folderId').equals(folderId).modify({ folderId: null })
  })

  context.set((state) => ({
    folders: state.folders.filter((folder) => folder.id !== folderId),
    entries: state.entries.map((entry) =>
      entry.folderId === folderId ? { ...entry, folderId: null } : entry,
    ),
    selectedFolderId: state.selectedFolderId === folderId ? 'all' : state.selectedFolderId,
  }))
}

export async function upsertEntry(
  context: VaultStoreContext,
  entry: Omit<DecryptedEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: number },
): Promise<void> {
  const key = context.get().key
  if (!key) {
    return
  }

  const now = new Date().toISOString()
  const payload: VaultEntrySecret = {
    title: entry.title,
    username: entry.username,
    email: entry.email,
    password: entry.password,
    website: normalizeWebsiteUrl(entry.website),
    notes: entry.notes,
  }

  const encrypted = await encryptJson(payload, key)

  if (entry.id) {
    const existing = context.get().entries.find((item) => item.id === entry.id)
    const createdAt = existing?.createdAt ?? now

    await db.entries.update(entry.id, {
      encrypted,
      folderId: entry.folderId,
      updatedAt: now,
    })

    context.set((state) => ({
      entries: state.entries.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              ...payload,
              folderId: entry.folderId,
              createdAt,
              updatedAt: now,
            }
          : item,
      ),
    }))

    return
  }

  const id = await db.entries.add({
    encrypted,
    folderId: entry.folderId,
    createdAt: now,
    updatedAt: now,
  })

  context.set((state) => ({
    entries: [
      ...state.entries,
      {
        id: id as number,
        ...payload,
        folderId: entry.folderId,
        createdAt: now,
        updatedAt: now,
      },
    ],
  }))
}

export async function deleteEntry(context: VaultStoreContext, id: number): Promise<void> {
  await db.entries.delete(id)
  context.set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }))
}

export async function saveSettings(context: VaultStoreContext, patch: Partial<AppSettings>): Promise<void> {
  const next = { ...context.get().settings, ...patch }
  await setMeta(META_KEYS.settings, next)
  context.set({ settings: next })
}

export async function clearVaultData(context: VaultStoreContext): Promise<void> {
  await db.transaction('rw', db.entries, db.folders, async () => {
    await db.entries.clear()
    await db.folders.clear()
  })

  context.set({ entries: [], folders: [], selectedFolderId: 'all' })
}

export async function deleteAccount(context: VaultStoreContext): Promise<void> {
  await db.transaction('rw', db.meta, db.entries, db.folders, async () => {
    await db.meta.clear()
    await db.entries.clear()
    await db.folders.clear()
  })

  context.set({
    isConfigured: false,
    isUnlocked: false,
    authConfig: null,
    settings: DEFAULT_SETTINGS,
    folders: [],
    entries: [],
    searchTerm: '',
    selectedFolderId: 'all',
    key: null,
  })
}
