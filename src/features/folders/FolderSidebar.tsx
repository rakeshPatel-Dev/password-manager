import { FolderCheck, FolderPen, FolderPlus, Trash2, FolderOpen, Folder, ChevronRight } from 'lucide-react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import type { DecryptedFolder } from '../../types'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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
  const [isCreating, setIsCreating] = useState(false)
  const [isRenaming, setIsRenaming] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus inputs when editing/creating
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  const createFolder = useCallback(async (): Promise<void> => {
    const clean = newFolderName.trim()
    if (!clean) {
      toast.error('Folder name cannot be empty')
      return
    }

    // Check for duplicate folder names
    if (folders.some(f => f.name.toLowerCase() === clean.toLowerCase())) {
      toast.error('A folder with this name already exists')
      return
    }

    setIsCreating(true)
    try {
      await onAddFolder(clean)
      toast.success(`Folder "${clean}" created`)
      setNewFolderName('')
    } catch (error) {
      toast.error('Failed to create folder')
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }, [newFolderName, folders, onAddFolder])

  const submitRename = useCallback(async (): Promise<void> => {
    if (!editingId) return

    const clean = editingName.trim()
    if (!clean) {
      toast.error('Folder name cannot be empty')
      return
    }

    // Check for duplicate folder names (excluding current folder)
    if (folders.some(f => f.id !== editingId && f.name.toLowerCase() === clean.toLowerCase())) {
      toast.error('A folder with this name already exists')
      return
    }

    setIsRenaming(editingId)
    try {
      await onRenameFolder(editingId, clean)
      toast.success('Folder renamed successfully')
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      toast.error('Failed to rename folder')
      console.error(error)
    } finally {
      setIsRenaming(null)
    }
  }, [editingId, editingName, folders, onRenameFolder])

  const cancelRename = useCallback(() => {
    setEditingId(null)
    setEditingName('')
  }, [])


  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    } else if (e.key === 'Escape') {
      cancelRename()
    }
  }, [cancelRename])

  return (
    <aside className="sticky top-6 w-full rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 lg:w-72">
      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Folders
          </h2>
          <Button
            onClick={() => onSelect('all')}
            variant={selectedFolderId === 'all' ? 'default' : 'outline'}
            size="sm"
            className="gap-1"
            aria-label="Show all entries"
          >
            <FolderOpen size={14} />
            All
          </Button>
        </div>

        <Separator className="my-3" />

        {/* Create Folder Section */}
        <div className="mb-4">
          <Label htmlFor="create-folder" className="mb-2 text-xs font-medium text-muted-foreground">
            Create new folder
          </Label>
          <InputGroup className="h-auto">
            <InputGroupInput
              ref={inputRef}
              placeholder="e.g., Work, Personal, Banking..."
              id="create-folder"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(e) => handleKeyDown(e, createFolder)}
              disabled={isCreating}
              aria-label="New folder name"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                onClick={createFolder}
                disabled={isCreating || !newFolderName.trim()}
                aria-label="Create folder"
              >
                <FolderPlus size={14} />
                {isCreating ? 'Creating...' : 'Add'}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <Separator className="my-3" />

        {/* Folders List */}
        <div className="space-y-2">
          {folders.length === 0 ? (
            <div className="py-8 text-center">
              <Folder className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">
                No folders yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Create your first folder above
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-380px)] space-y-2 overflow-y-auto pr-1">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    "group relative rounded-lg border transition-all duration-200",
                    selectedFolderId === folder.id
                      ? "border-primary/50 bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                  )}
                >
                  {editingId === folder.id ? (
                    // Edit Mode
                    <div className="p-2">
                      <InputGroup className="gap-1">
                        <InputGroupInput
                          ref={editInputRef}
                          placeholder="Folder name"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, submitRename)}
                          disabled={isRenaming === folder.id}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            variant="outline"
                            onClick={submitRename}
                            disabled={isRenaming === folder.id || !editingName.trim()}
                            size="sm"
                            className="h-8"
                          >
                            <FolderCheck size={14} />
                            Save
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between gap-2 p-2">
                      <Button
                        onClick={() => onSelect(folder.id)}
                        variant="ghost"
                        className={cn(
                          "flex-1 justify-start gap-2 px-2 text-sm font-normal transition-colors",
                          selectedFolderId === folder.id && "font-medium text-primary"
                        )}
                        aria-current={selectedFolderId === folder.id ? "page" : undefined}
                      >
                        <ChevronRight
                          size={14}
                          className={cn(
                            "transition-transform",
                            selectedFolderId === folder.id && "rotate-90 text-primary"
                          )}
                        />
                        <span className="truncate">{folder.name}</span>
                      </Button>

                      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Button
                          onClick={() => {
                            setEditingId(folder.id)
                            setEditingName(folder.name)
                          }}
                          title={`Rename ${folder.name}`}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          aria-label={`Rename ${folder.name}`}
                        >
                          <FolderPen size={14} />
                        </Button>
                        <Button
                          onClick={() => onDeleteFolder(folder.id)}
                          title={`Delete ${folder.name}`}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${folder.name}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}