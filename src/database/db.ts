import Dexie, { type EntityTable } from 'dexie'
import type { EntryRecord, FolderRecord, MetaRecord, PasskeyConfig } from '../types'

class VaultDatabase extends Dexie {
  meta!: EntityTable<MetaRecord, 'key'>
  folders!: EntityTable<FolderRecord, 'id'>
  entries!: EntityTable<EntryRecord, 'id'>
  passkeys!: EntityTable<PasskeyConfig, 'credentialId'>

  constructor() {
    super('LocalVaultDB')

    this.version(2).stores({
      meta: 'key',
      folders: '++id, updatedAt',
      entries: '++id, folderId, updatedAt',
      passkeys: 'credentialId, createdAt',
    })
  }
}

export const db = new VaultDatabase()
