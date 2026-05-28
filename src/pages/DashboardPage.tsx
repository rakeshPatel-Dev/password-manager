import { PackagePlus, Search, WandSparkles, FolderKanban, KeyRound, Inbox, Eye, EyeOff } from 'lucide-react'
import { useMemo, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { FolderSidebar } from '../features/folders/FolderSidebar'
import { EntryFormModal } from '../features/vault/EntryFormModal'
import { VaultList } from '../features/vault/VaultList'
import { useVaultStore } from '../store/useVaultStore'
import type { DecryptedEntry } from '../types'
import { PasswordGeneratorModal } from '@/features/generator/PasswordGeneratorModal'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';

// Extracted stat card component for reusability
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  variant?: 'default' | 'warning'
}

function StatCard({ icon, label, value, variant = 'default' }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-linear-to-br from-card to-secondary/50 p-4 transition-all duration-200 hover:shadow-md">
      <div className="absolute right-2 top-2 opacity-10 transition-opacity group-hover:opacity-20">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 font-display text-2xl font-bold ${variant === 'warning' && value > 0 ? 'text-amber-500' : 'text-foreground'
        }`}>
        {value}
      </p>
    </div>
  )
}

export function DashboardPage() {
  // Store selectors - optimized to prevent unnecessary re-renders
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

  // Local state
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DecryptedEntry | undefined>(undefined)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showStats, setShowStats] = useState(true)

  // Handlers with useCallback for stability
  const handleDeleteEntry = useCallback(async (id: number): Promise<void> => {
    toast.warning('Delete Entry?', {
      description: 'This action cannot be undone. The entry will be permanently removed.',
      duration: 5000,
      action: {
        label: 'Delete',
        onClick: async () => {
          await deleteEntry(id)
          toast.success('Entry deleted successfully')
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => toast.dismiss(),
      },
    })
  }, [deleteEntry])

  const handleDeleteFolder = useCallback(async (id: number): Promise<void> => {
    const folder = folders.find(f => f.id === id)
    const entryCount = entries.filter(e => e.folderId === id).length

    toast.warning(`Delete "${folder?.name || 'Folder'}"?`, {
      description: entryCount > 0
        ? `This folder contains ${entryCount} entry${entryCount === 1 ? '' : 's'}. They will become uncategorized. This action cannot be undone.`
        : 'This action cannot be undone.',
      duration: 6000,
      action: {
        label: 'Delete',
        onClick: async () => {
          await deleteFolder(id)
          toast.success('Folder deleted successfully')
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => toast.dismiss(),
      },
    })
  }, [deleteFolder, folders, entries])

  const handleAddEntry = useCallback(() => {
    setEditingEntry(undefined)
    setGeneratedPassword('') // Clear generated password when adding new
    setEntryModalOpen(true)
  }, [])

  const handleEditEntry = useCallback((entry: DecryptedEntry) => {
    setEditingEntry(entry)
    setEntryModalOpen(true)
  }, [])

  const handleUseGeneratedPassword = useCallback((password: string) => {
    setGeneratedPassword(password)
    setGeneratorOpen(false)
    setEntryModalOpen(true)
  }, [])

  // Memoized stats
  const stats = useMemo(() => ({
    totalEntries: entries.length,
    totalFolders: folders.length,
    uncategorized: entries.filter((entry) => !entry.folderId).length,
  }), [entries, folders.length])

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useKeyboardShortcut('k', () => {
    const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
    searchInput?.focus()
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <FolderSidebar
              folders={folders}
              entries={entries}
              selectedFolderId={selectedFolderId}
              onSelect={setSelectedFolderId}
              onAddFolder={addFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={handleDeleteFolder}
            />
          </aside>

          {/* Main Content */}
          <main className="space-y-6">
            {/* Header Card */}
            <div className="rounded-lg border border-border bg-card shadow-sm transition-all duration-200">
              <div className="p-6">
                {/* Title Section */}
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                      Password Vault
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Securely manage and organize your credentials
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      aria-label="Generate secure password"
                      onClick={() => setGeneratorOpen(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <WandSparkles size={16} />
                      <span className="hidden sm:inline">Generate</span>
                    </Button>
                    <Button
                      aria-label="Add new entry"
                      onClick={handleAddEntry}
                      className="gap-2 shadow-sm transition-all hover:shadow-md"
                    >
                      <PackagePlus size={16} />
                      <span>Add Entry</span>
                    </Button>
                  </div>
                </div>

                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Stats</p>
                    <p className="text-xs text-muted-foreground">
                      {showStats ? 'Quick vault summary is visible.' : 'Vault summary is hidden.'}
                    </p>
                  </div>
                  <Button
                    aria-label={showStats ? 'Hide stats' : 'View stats'}
                    onClick={() => setShowStats((prev) => !prev)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {showStats ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span>{showStats ? 'Hide stats' : 'View stats'}</span>
                  </Button>
                </div>

                {showStats && (
                  <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                      icon={<KeyRound size={24} />}
                      label="Total Entries"
                      value={stats.totalEntries}
                    />
                    <StatCard
                      icon={<FolderKanban size={24} />}
                      label="Folders"
                      value={stats.totalFolders}
                    />
                    <StatCard
                      icon={<Inbox size={24} />}
                      label="Uncategorized"
                      value={stats.uncategorized}
                      variant={stats.uncategorized > 0 ? 'warning' : 'default'}
                    />
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <InputGroup>
                    <InputGroupInput
                      placeholder="Search by title, username, email, website or folder..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      aria-label="Search entries"
                      className="transition-all py-2 focus:ring-2 focus:ring-primary/20"
                    />
                    <InputGroupAddon align="inline-start" >
                      <Search size={18} className="text-muted-foreground" />
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end" >
                      <Kbd>⌘</Kbd>
                      <Kbd>K</Kbd>
                    </InputGroupAddon>
                  </InputGroup>
                </div>
              </div>
            </div>

            {/* Vault List */}
            <VaultList
              entries={entries}
              folders={folders}
              searchTerm={searchTerm}
              selectedFolderId={selectedFolderId}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
            />
          </main>
        </div>

        {/* Modals */}
        <EntryFormModal
          key={`${editingEntry?.id ?? 'new'}-${generatedPassword}`}
          open={entryModalOpen}
          entry={editingEntry}
          folders={folders}
          generatedPassword={generatedPassword}
          onClose={() => {
            setEntryModalOpen(false)
            setEditingEntry(undefined)
            setGeneratedPassword('')
          }}
          onOpenGenerator={() => {
            setGeneratorOpen(true)
            setEntryModalOpen(false)
          }}
          onSubmit={upsertEntry}
        />

        <PasswordGeneratorModal
          open={generatorOpen}
          onClose={() => setGeneratorOpen(false)}
          onUsePassword={handleUseGeneratedPassword}
        />
      </div>
    </div>
  )
}

// Custom hook for keyboard shortcuts
function useKeyboardShortcut(key: string, callback: () => void) {
  useMemo(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === key) {
        event.preventDefault()
        callback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, callback])
}