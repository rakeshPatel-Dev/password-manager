import type {
  AppSettings,
  AuthConfig,
  DecryptedEntry,
  DecryptedFolder,
  EntryRecord,
  FolderRecord,
  MetaRecord,
  PasskeyConfig,
} from '../types'

export const META_KEYS = {
  auth: 'authConfig',
  vaultKey: 'vaultKey',
  settings: 'settings',
  recovery: 'recoveryConfig',
  passkey: 'passkeyConfig',
  setupPending: 'setupPending',
} as const

export const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  theme: 'dark',
}

export interface VaultStoreState {
  isBootstrapping: boolean
  isConfigured: boolean
  setupPending: boolean
  isUnlocked: boolean
  authConfig: AuthConfig | null
  settings: AppSettings
  passkeyConfig: PasskeyConfig | null
  folders: DecryptedFolder[]
  entries: DecryptedEntry[]
  searchTerm: string
  selectedFolderId: number | 'all'
  lastActivityAt: number
  key: CryptoKey | null
}

export interface VaultReadableExportBundle {
  version: 2
  exportedAt: string
  format: 'human-readable'
  settings: AppSettings
  folders: DecryptedFolder[]
  entries: DecryptedEntry[]
  meta: MetaRecord[]
}

export interface VaultLegacyExportBundle {
  version: 1
  exportedAt: string
  meta: MetaRecord[]
  folders: FolderRecord[]
  entries: EntryRecord[]
}

export type VaultSetState = (
  partial:
    | Partial<VaultStoreState>
    | ((state: VaultStoreState) => Partial<VaultStoreState>),
) => void

export interface VaultStoreContext {
  get: () => VaultStoreState
  set: VaultSetState
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMetaRecordArray(value: unknown): value is MetaRecord[] {
  return Array.isArray(value) && value.every((item) => isObjectRecord(item) && typeof item.key === 'string' && typeof item.value === 'string')
}

function isFolderArray(value: unknown): value is DecryptedFolder[] {
  return Array.isArray(value) && value.every((item) => isObjectRecord(item) && typeof item.id === 'number' && typeof item.name === 'string')
}

function isEntryArray(value: unknown): value is DecryptedEntry[] {
  return (
    Array.isArray(value)
    && value.every(
      (item) =>
        isObjectRecord(item)
        && typeof item.id === 'number'
        && typeof item.title === 'string'
        && typeof item.username === 'string'
        && typeof item.email === 'string'
        && typeof item.password === 'string'
        && typeof item.website === 'string'
        && typeof item.notes === 'string',
    )
  )
}

export function isReadableExportBundle(value: unknown): value is VaultReadableExportBundle {
  return (
    isObjectRecord(value)
    && value.version === 2
    && typeof value.exportedAt === 'string'
    && typeof value.format === 'string'
    && isObjectRecord(value.settings)
    && isMetaRecordArray(value.meta)
    && isFolderArray(value.folders)
    && isEntryArray(value.entries)
  )
}

export function isLegacyExportBundle(value: unknown): value is VaultLegacyExportBundle {
  return (
    isObjectRecord(value)
    && value.version === 1
    && typeof value.exportedAt === 'string'
    && Array.isArray(value.meta)
    && Array.isArray(value.folders)
    && Array.isArray(value.entries)
  )
}
