import { Plus, Search, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { FolderSidebar } from '../features/folders/FolderSidebar'

import { EntryFormModal } from '../features/vault/EntryFormModal'
import { VaultList } from '../features/vault/VaultList'
import { useVaultStore } from '../store/useVaultStore'
import type { DecryptedEntry } from '../types'
import { PasswordGeneratorModal } from '@/features/generator/PasswordGeneratorModal';

export function DashboardPage() {
  const folders = useVaultStore((state) => state.folders)
  const entries = useVaultStore((state) => state.entries)
  const searchTerm = useVaultStore((state) => state.searchTerm)
  const selectedFolderId = useVaultStore((state) => state.selectedFolderId)
  const addFolder = useVaultStore((state) => state.addFolder)
  const renameFolder = useVaultStore((state) => state.renameFolder)
  const deleteFolder = useVaultStore((state) => state.deleteFolder)
  const setSearchTerm = useVaultStore((state) => state.setSearchTerm)
  const setSelectedFolderId = useVaultStore((state) => state.setSelectedFolderId)
  const upsertEntry = useVaultStore((state) => state.upsertEntry)
  const deleteEntry = useVaultStore((state) => state.deleteEntry)

  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DecryptedEntry | undefined>(undefined)
  const [generatedPassword, setGeneratedPassword] = useState('')

  const handleDeleteEntry = async (id: number): Promise<void> => {
    await deleteEntry(id)
    toast.success('Entry deleted')
  }

  const handleDeleteFolder = async (id: number): Promise<void> => {
    await deleteFolder(id)
    toast.success('Folder deleted')
  }

  const stats = useMemo(
    () => ({
      totalEntries: entries.length,
      totalFolders: folders.length,
      uncategorized: entries.filter((entry) => !entry.folderId).length,
    }),
    [entries, folders.length],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <FolderSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelect={setSelectedFolderId}
        onAddFolder={addFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      <section className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Vault Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage and organize your credentials</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setGeneratorOpen(true)}
                size="sm"
                type="button"
                variant="outline"
                className="gap-2"
              >
                <WandSparkles size={16} />
                <span className="hidden sm:inline">Generator</span>
              </Button>
              <Button
                onClick={() => {
                  setEditingEntry(undefined)
                  setEntryModalOpen(true)
                }}
                size="sm"
                type="button"
                className="gap-2"
              >
                <Plus size={16} />
                Add Entry
              </Button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="text-muted-foreground">Entries</p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">{stats.totalEntries}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="text-muted-foreground">Folders</p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">{stats.totalFolders}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="text-muted-foreground">Uncategorized</p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">{stats.uncategorized}</p>
            </div>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search title, username, email, website, folder..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <VaultList
          entries={entries}
          folders={folders}
          searchTerm={searchTerm}
          selectedFolderId={selectedFolderId}
          onEdit={(entry) => {
            setEditingEntry(entry)
            setEntryModalOpen(true)
          }}
          onDelete={handleDeleteEntry}
        />
      </section>

      <EntryFormModal
        key={`${editingEntry?.id ?? 'new'}-${generatedPassword}`}
        open={entryModalOpen}
        entry={editingEntry}
        folders={folders}
        generatedPassword={generatedPassword}
        onClose={() => setEntryModalOpen(false)}
        onOpenGenerator={() => setGeneratorOpen(true)}
        onSubmit={upsertEntry}
      />

      <PasswordGeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onUsePassword={(password) => {
          setGeneratedPassword(password)
          setEntryModalOpen(true)
        }}
      />
    </div>
  )
}
