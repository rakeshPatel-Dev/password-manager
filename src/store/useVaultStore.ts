import { create } from 'zustand'
import {
  createVaultKey,
  createAuthConfig,
  createRecoveryConfig,
  decryptJson,
  decryptRecoveryKey,
  encryptJson,
  generateRecoveryKey,
  verifyAuthPassword,
  verifyRecoveryKeyInput,
  unwrapVaultKeyFromMaster,
  unwrapVaultKeyFromRecovery,
  wrapVaultKeyForMaster,
} from '../crypto/vaultCrypto'
import { db } from '../database/db'
import { getMeta, setMeta } from '../database/meta'
import type {
  AppSettings,
  AuthConfig,
  DecryptedEntry,
  DecryptedFolder,
  EntryRecord,
  FolderSecret,
  EncryptedPayload,
  MetaRecord,
  RecoveryConfig,
  VaultEntrySecret,
  VaultExportBundle,
} from '../types'

const META_KEYS = {
  auth: 'authConfig',
  vaultKey: 'vaultKey',
  settings: 'settings',
  recovery: 'recoveryConfig',
} as const

const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  theme: 'dark',
}

interface VaultStore {
  isBootstrapping: boolean
  isConfigured: boolean
  isUnlocked: boolean
  authConfig: AuthConfig | null
  settings: AppSettings
  folders: DecryptedFolder[]
  entries: DecryptedEntry[]
  searchTerm: string
  selectedFolderId: number | 'all'
  lastActivityAt: number
  key: CryptoKey | null
  bootstrap: () => Promise<void>
  setupVault: (password: string) => Promise<string>
  unlockVault: (password: string) => Promise<boolean>
  changeMasterPassword: (currentPassword: string, nextPassword: string) => Promise<{ ok: boolean; message: string }>
  lockVault: () => void
  touch: () => void
  setSearchTerm: (value: string) => void
  setSelectedFolderId: (value: number | 'all') => void
  addFolder: (name: string) => Promise<void>
  renameFolder: (folderId: number, name: string) => Promise<void>
  deleteFolder: (folderId: number) => Promise<void>
  upsertEntry: (entry: Omit<DecryptedEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>
  deleteEntry: (id: number) => Promise<void>
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>
  getRecoveryKey: () => Promise<string>
  resetVaultWithRecoveryKey: (recoveryKey: string, nextPassword: string) => Promise<{ ok: boolean; message: string }>
  clearVaultData: () => Promise<void>
  deleteAccount: () => Promise<void>
  exportVault: () => Promise<string>
  importVault: (raw: string) => Promise<void>
}

async function getMasterVaultKey(): Promise<EncryptedPayload | null> {
  return getMeta<EncryptedPayload>(META_KEYS.vaultKey)
}

async function setMasterVaultKey(payload: EncryptedPayload): Promise<void> {
  await setMeta(META_KEYS.vaultKey, payload)
}

async function loadVaultContents(key: CryptoKey): Promise<{ folders: DecryptedFolder[]; entries: DecryptedEntry[] }> {
  return loadAllEncrypted(key)
}

async function loadAllEncrypted(key: CryptoKey): Promise<{ folders: DecryptedFolder[]; entries: DecryptedEntry[] }> {
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

export const useVaultStore = create<VaultStore>((set, get) => ({
  isBootstrapping: true,
  isConfigured: false,
  isUnlocked: false,
  authConfig: null,
  settings: DEFAULT_SETTINGS,
  folders: [],
  entries: [],
  searchTerm: '',
  selectedFolderId: 'all',
  lastActivityAt: Date.now(),
  key: null,

  bootstrap: async () => {
    const [authConfig, recoveryConfig, settings] = await Promise.all([
      getMeta<AuthConfig>(META_KEYS.auth),
      getMeta<RecoveryConfig>(META_KEYS.recovery),
      getMeta<AppSettings>(META_KEYS.settings),
    ])

    set({
      isBootstrapping: false,
      isConfigured: Boolean(authConfig && recoveryConfig),
      authConfig,
      settings: settings ?? DEFAULT_SETTINGS,
    })
  },

  setupVault: async (password) => {
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
    ])

    set({
      isConfigured: true,
      isUnlocked: true,
      authConfig,
      settings: DEFAULT_SETTINGS,
      key: vaultKey,
      folders: [],
      entries: [],
      searchTerm: '',
      selectedFolderId: 'all',
      lastActivityAt: Date.now(),
    })

    return recoveryKey
  },

  unlockVault: async (password) => {
    const authConfig = get().authConfig
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

    set({
      isUnlocked: true,
      key: vaultKey,
      folders: decrypted.folders,
      entries: decrypted.entries,
      lastActivityAt: Date.now(),
    })

    return true
  },

  changeMasterPassword: async (currentPassword, nextPassword) => {
    const state = get()
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

    set({ authConfig: nextAuthConfig, key: activeVaultKey, lastActivityAt: Date.now() })
    return { ok: true, message: 'Master password updated successfully.' }
  },

  lockVault: () => {
    set({
      isUnlocked: false,
      key: null,
      entries: [],
      folders: [],
      searchTerm: '',
      selectedFolderId: 'all',
    })
  },

  touch: () => {
    set({ lastActivityAt: Date.now() })
  },

  setSearchTerm: (value) => {
    set({ searchTerm: value })
  },

  setSelectedFolderId: (value) => {
    set({ selectedFolderId: value })
  },

  addFolder: async (name) => {
    const key = get().key
    if (!key) {
      return
    }

    const now = new Date().toISOString()
    const encrypted = await encryptJson<FolderSecret>({ name: name.trim() }, key)
    const id = await db.folders.add({ encrypted, createdAt: now, updatedAt: now })

    set((state) => ({
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
  },

  renameFolder: async (folderId, name) => {
    const key = get().key
    if (!key) {
      return
    }

    const now = new Date().toISOString()
    const encrypted = await encryptJson<FolderSecret>({ name: name.trim() }, key)
    await db.folders.update(folderId, { encrypted, updatedAt: now })

    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId ? { ...folder, name: name.trim(), updatedAt: now } : folder,
      ),
    }))
  },

  deleteFolder: async (folderId) => {
    await db.transaction('rw', db.folders, db.entries, async () => {
      await db.folders.delete(folderId)
      await db.entries.where('folderId').equals(folderId).modify({ folderId: null })
    })

    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== folderId),
      entries: state.entries.map((entry) =>
        entry.folderId === folderId ? { ...entry, folderId: null } : entry,
      ),
      selectedFolderId: state.selectedFolderId === folderId ? 'all' : state.selectedFolderId,
    }))
  },

  upsertEntry: async (entry) => {
    const key = get().key
    if (!key) {
      return
    }

    const now = new Date().toISOString()
    const payload: VaultEntrySecret = {
      title: entry.title,
      username: entry.username,
      email: entry.email,
      password: entry.password,
      website: entry.website,
      notes: entry.notes,
    }

    const encrypted = await encryptJson(payload, key)

    if (entry.id) {
      const existing = get().entries.find((item) => item.id === entry.id)
      const createdAt = existing?.createdAt ?? now

      await db.entries.update(entry.id, {
        encrypted,
        folderId: entry.folderId,
        updatedAt: now,
      })

      set((state) => ({
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

    set((state) => ({
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
  },

  deleteEntry: async (id) => {
    await db.entries.delete(id)
    set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }))
  },

  saveSettings: async (patch) => {
    const next = { ...get().settings, ...patch }
    await setMeta(META_KEYS.settings, next)
    set({ settings: next })
  },

  getRecoveryKey: async () => {
    const key = get().key
    if (!key) {
      throw new Error('Vault is locked.')
    }

    const recoveryConfig = await getMeta<RecoveryConfig>(META_KEYS.recovery)
    if (!recoveryConfig) {
      throw new Error('Recovery key not found.')
    }

    return decryptRecoveryKey(recoveryConfig, key)
  },

  resetVaultWithRecoveryKey: async (recoveryKey, nextPassword) => {
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

    set({
      isConfigured: true,
      isUnlocked: true,
      authConfig: nextAuthConfig,
      settings: get().settings,
      entries: decrypted.entries,
      folders: decrypted.folders,
      searchTerm: '',
      selectedFolderId: 'all',
      key: vaultKey,
      lastActivityAt: Date.now(),
    })

    return { ok: true, message: 'Vault recovered and master password updated.' }
  },

  clearVaultData: async () => {
    await db.transaction('rw', db.entries, db.folders, async () => {
      await db.entries.clear()
      await db.folders.clear()
    })

    set({ entries: [], folders: [], selectedFolderId: 'all' })
  },

  deleteAccount: async () => {
    await db.transaction('rw', db.meta, db.entries, db.folders, async () => {
      await db.meta.clear()
      await db.entries.clear()
      await db.folders.clear()
    })

    set({
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
  },

  exportVault: async () => {
    const [metaRows, folders, entries] = await Promise.all([
      db.meta.toArray(),
      db.folders.toArray(),
      db.entries.toArray(),
    ])

    const bundle: VaultExportBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      meta: metaRows,
      folders,
      entries,
    }

    return JSON.stringify(bundle, null, 2)
  },

  importVault: async (raw) => {
    const parsed = JSON.parse(raw) as VaultExportBundle
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.meta)) {
      throw new Error('Invalid vault export format.')
    }

    await db.transaction('rw', db.meta, db.folders, db.entries, async () => {
      await db.entries.clear()
      await db.folders.clear()
      await db.meta.clear()

      if (parsed.meta.length > 0) {
        await db.meta.bulkPut(parsed.meta as MetaRecord[])
      }

      if (parsed.folders.length > 0) {
        await db.folders.bulkPut(parsed.folders)
      }

      if (parsed.entries.length > 0) {
        await db.entries.bulkPut(parsed.entries as EntryRecord[])
      }
    })

    const [authConfig, recoveryConfig, settings] = await Promise.all([
      getMeta<AuthConfig>(META_KEYS.auth),
      getMeta<RecoveryConfig>(META_KEYS.recovery),
      getMeta<AppSettings>(META_KEYS.settings),
    ])

    set({
      isConfigured: Boolean(authConfig && recoveryConfig),
      authConfig,
      settings: settings ?? DEFAULT_SETTINGS,
      isUnlocked: false,
      key: null,
      folders: [],
      entries: [],
      searchTerm: '',
      selectedFolderId: 'all',
    })
  },
}))
