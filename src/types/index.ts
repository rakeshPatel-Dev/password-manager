export type ThemeMode = 'dark' | 'light'

export interface EncryptedPayload {
  iv: string
  cipherText: string
}

export interface AuthConfig {
  salt: string
  iterations: number
  verifier: string
  createdAt: string
}

export interface RecoveryConfig {
  version: number
  salt: string
  verifier: string
  encryptedKey?: EncryptedPayload
  wrappedVaultKey?: EncryptedPayload
}

export interface AppSettings {
  autoLockMinutes: number
  clipboardClearSeconds: number
  theme: ThemeMode
}

export interface MetaRecord {
  key: string
  value: string
}

export interface FolderRecord {
  id?: number
  encrypted: EncryptedPayload
  createdAt: string
  updatedAt: string
}

export interface EntryRecord {
  id?: number
  encrypted: EncryptedPayload
  folderId: number | null
  createdAt: string
  updatedAt: string
}

export interface FolderSecret {
  name: string
}

export interface VaultEntrySecret {
  title: string
  username: string
  email: string
  password: string
  website: string
  notes: string
}

export interface DecryptedFolder {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface DecryptedEntry extends VaultEntrySecret {
  id: number
  folderId: number | null
  createdAt: string
  updatedAt: string
}

export interface VaultExportBundle {
  version: number
  exportedAt: string
  meta: MetaRecord[]
  folders: FolderRecord[]
  entries: EntryRecord[]
}
