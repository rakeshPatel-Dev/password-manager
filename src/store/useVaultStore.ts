import { create } from 'zustand'
import type { AppSettings,  DecryptedEntry } from '../types'
import { DEFAULT_SETTINGS, type VaultStoreContext, type VaultStoreState } from './vaultStore.shared'
import { createVaultContext } from './vaultPersistence.service'
import {
  bootstrapVault,
  changeMasterPassword as changeMasterPasswordService,
  completeVaultSetup as completeVaultSetupService,
  getRecoveryKey as getRecoveryKeyService,
  registerPasskey as registerPasskeyService,
  unregisterPasskey as unregisterPasskeyService,
  resetVaultWithRecoveryKey as resetVaultWithRecoveryKeyService,
  setupVault as setupVaultService,
  unlockVault as unlockVaultService,
  unlockVaultWithPasskey as unlockVaultWithPasskeyService,
} from './vaultAuth.service'
import {
  addFolder as addFolderService,
  clearVaultData as clearVaultDataService,
  deleteAccount as deleteAccountService,
  deleteEntry as deleteEntryService,
  deleteFolder as deleteFolderService,
  renameFolder as renameFolderService,
  saveSettings as saveSettingsService,
  upsertEntry as upsertEntryService,
} from './vaultRecord.service'
import { exportVault as exportVaultService, importVault as importVaultService } from './vaultTransfer.service'

interface VaultStoreActions {
  bootstrap: () => Promise<void>
  setupVault: (password: string) => Promise<string>
  completeVaultSetup: () => Promise<void>
  unlockVault: (password: string) => Promise<boolean>
  unlockVaultWithPasskey: () => Promise<boolean>
  changeMasterPassword: (currentPassword: string, nextPassword: string) => Promise<{ ok: boolean; message: string }>
  registerPasskey: () => Promise<{ ok: boolean; message: string }>
  unregisterPasskey: () => Promise<{ ok: boolean; message: string }>
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

export type VaultStore = VaultStoreState & VaultStoreActions

const INITIAL_STATE: VaultStoreState = {
  isBootstrapping: true,
  isConfigured: false,
  setupPending: false,
  isUnlocked: false,
  authConfig: null,
  settings: DEFAULT_SETTINGS,
  passkeyConfig: null,
  folders: [],
  entries: [],
  searchTerm: '',
  selectedFolderId: 'all',
  lastActivityAt: Date.now(),
  key: null,
}

export const useVaultStore = create<VaultStore>((set, get) => {
  const context: VaultStoreContext = createVaultContext(get, set)

  return {
    ...INITIAL_STATE,

    bootstrap: () => bootstrapVault(context),
    setupVault: (password) => setupVaultService(context, password),
    completeVaultSetup: () => completeVaultSetupService(context),
    unlockVault: (password) => unlockVaultService(context, password),
    unlockVaultWithPasskey: () => unlockVaultWithPasskeyService(context),
    changeMasterPassword: (currentPassword, nextPassword) =>
      changeMasterPasswordService(context, currentPassword, nextPassword),
    registerPasskey: () => registerPasskeyService(context),
    unregisterPasskey: () => unregisterPasskeyService(context),
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
    addFolder: (name) => addFolderService(context, name),
    renameFolder: (folderId, name) => renameFolderService(context, folderId, name),
    deleteFolder: (folderId) => deleteFolderService(context, folderId),
    upsertEntry: (entry) => upsertEntryService(context, entry),
    deleteEntry: (id) => deleteEntryService(context, id),
    saveSettings: (patch) => saveSettingsService(context, patch),
    getRecoveryKey: () => getRecoveryKeyService(context),
    resetVaultWithRecoveryKey: (recoveryKey, nextPassword) =>
      resetVaultWithRecoveryKeyService(context, recoveryKey, nextPassword),
    clearVaultData: () => clearVaultDataService(context),
    deleteAccount: () => deleteAccountService(context),
    exportVault: () => exportVaultService(context),
    importVault: (raw) => importVaultService(context, raw),
  }
})
