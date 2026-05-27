import { FolderPen, FolderPlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import type { DecryptedFolder } from '../../types'

interface FolderSidebarProps {
  folders: DecryptedFolder[]
  selectedFolderId: number | 'all'
  onSelect: (id: number | 'all') => void
  onAddFolder: (name: string) => Promise<void>
  onRenameFolder: (folderId: number, name: string) => Promise<void>
  onDeleteFolder: (folderId: number) => Promise<void>
}

export function FolderSidebar({
  folders,
  selectedFolderId,
  onSelect,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const [newFolderName, setNewFolderName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const createFolder = async (): Promise<void> => {
    const clean = newFolderName.trim()
    if (!clean) {
      toast.error('Folder name cannot be empty')
      return
    }
    await onAddFolder(clean)
    toast.success(`Folder "${clean}" created`)
    setNewFolderName('')
  }

  const submitRename = async (): Promise<void> => {
    if (!editingId) return
    const clean = editingName.trim()
    if (!clean) {
      toast.error('Folder name cannot be empty')
      return
    }
    await onRenameFolder(editingId, clean)
    toast.success('Folder renamed')
    setEditingId(null)
    setEditingName('')
  }

  return (
    <aside className="w-full rounded-2xl border border-border bg-card p-4 lg:w-72">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground">Folders</h2>
        <Button onClick={() => onSelect('all')} type="button">
          All
        </Button>
      </div>

      <div className="mb-3 flex gap-2">
        <Input
          placeholder="New folder"
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
        />
        <Button  onClick={createFolder} variant="ghost">
    <FolderPlus size={14} />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`rounded-lg border px-3 py-2 ${selectedFolderId === folder.id ? 'border-secondary bg-secondary/20 text-foreground' : 'border-border bg-secondary'}`}
          >
            {editingId === folder.id ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
                <Button className="px-2" onClick={submitRename} type="button" variant="ghost">
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Button onClick={() => onSelect(folder.id)} type="button" variant="ghost">
                  {folder.name}
                </Button>
                <div className="flex gap-1">
                  <Button
                    
                    onClick={() => {
                      setEditingId(folder.id)
                      setEditingName(folder.name)
                    }}
                    title="Rename folder"
                    type="button"
                  >
                    <FolderPen size={14} />
                  </Button>
                  <Button
                    
                    onClick={() => onDeleteFolder(folder.id)}
                    title="Delete folder"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
