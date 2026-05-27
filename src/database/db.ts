import Dexie, { type EntityTable } from 'dexie'
import type { EntryRecord, FolderRecord, MetaRecord } from '../types'

class VaultDatabase extends Dexie {
  meta!: EntityTable<MetaRecord, 'key'>
  folders!: EntityTable<FolderRecord, 'id'>
  entries!: EntityTable<EntryRecord, 'id'>

  constructor() {
    super('LocalVaultDB')

    this.version(1).stores({
      meta: 'key',
      folders: '++id, updatedAt',
      entries: '++id, folderId, updatedAt',
    })
  }
}

export const db = new VaultDatabase()
