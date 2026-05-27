import { Eye, EyeOff, FolderInput, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { useMemo, useState, useCallback } from 'react'
import { CopyButton } from '../../components/CopyButton'
import type { DecryptedEntry, DecryptedFolder } from '../../types'
import { Separator } from '@/components/ui/separator';

interface VaultListProps {
  entries: DecryptedEntry[]
  folders: DecryptedFolder[]
  searchTerm: string
  selectedFolderId: number | 'all'
  onEdit: (entry: DecryptedEntry) => void
  onDelete: (id: number) => Promise<void>
}

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

const formatDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(dateString))
  } catch {
    return dateString
  }
}

export function VaultList({
  entries,
  folders,
  searchTerm,
  selectedFolderId,
  onEdit,
  onDelete
}: VaultListProps) {
  const [visibleMap, setVisibleMap] = useState<Record<number, boolean>>({})

  const folderMap = useMemo(() => {
    return Object.fromEntries(folders.map((folder) => [folder.id, folder.name]))
  }, [folders])

  const filtered = useMemo(() => {
    const query = normalize(searchTerm)

    return entries
      .filter((entry) => selectedFolderId === 'all' || entry.folderId === selectedFolderId)
      .filter((entry) => {
        if (!query) return true

        const folderName = entry.folderId ? folderMap[entry.folderId] ?? '' : ''
        const haystack = [
          entry.title,
          entry.username,
          entry.email,
          entry.website,
          folderName
        ].map(normalize).join(' ')

        return haystack.includes(query)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [entries, folderMap, searchTerm, selectedFolderId])

  const toggleVisibility = useCallback((entryId: number) => {
    setVisibleMap(prev => ({ ...prev, [entryId]: !prev[entryId] }))
  }, [])

  if (filtered.length === 0) {
    return (
      <div
        className="rounded-lg border-2 border-dashed border-border bg-secondary p-12 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted-foreground">
          {searchTerm ? 'No entries match your search.' : 'No entries found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4" role="feed" aria-label="Vault entries">
      {filtered.map((entry) => {
        const isVisible = visibleMap[entry.id] ?? false
        const folderName = entry.folderId ? folderMap[entry.folderId] : null

        return (
          <article
            key={entry.id}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-ring"
          >
            <div className="space-y-4 p-5">
              {/* Header Section */}
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display flex items-center gap-2 text-lg font-semibold text-foreground">
                    <span className="truncate">{entry.title}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                      <FolderInput size={14} className="shrink-0" />
                      <span className="truncate">
                        {folderName ?? 'Uncategorized'}
                      </span>
                    </span>
                  </h3>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    aria-label={`Edit ${entry.title}`}
                    onClick={() => onEdit(entry)}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    aria-label={`Delete ${entry.title}`}
                    onClick={() => onDelete(entry.id)}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Fields Grid */}
              <div className="grid gap-3 md:grid-cols-2">
                <FieldRow
                  label="Username"
                  value={entry.username}
                  copyValue={entry.username}
                />
                <FieldRow
                  label="Email"
                  value={entry.email}
                  copyValue={entry.email}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Password</Label>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                    <span className="font-mono text-sm text-foreground break-all">
                      {isVisible ? entry.password : '••••••••••••'}
                    </span>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Button
                        aria-label={isVisible ? 'Hide password' : 'Show password'}
                        onClick={() => toggleVisibility(entry.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      >
                        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <CopyButton compact value={entry.password} />
                    </div>
                  </div>
                </div>
                <FieldRow
                  label="Website"
                  value={entry.website}
                  copyValue={entry.website}
                  emptyValue="-"
                />
              </div>

              {/* Notes Section */}
              {entry.notes && (
                <div className="rounded-lg bg-secondary/50 p-3">
                  <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                  <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-foreground">
                    {entry.notes}
                  </p>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground border-t border-border">
                <span>Updated: {formatDate(entry.updatedAt)}</span>
                <span>Created: {formatDate(entry.createdAt)}</span>
                <span>ID: {entry.id}</span>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

// Extracted FieldRow component for reusability
interface FieldRowProps {
  label: string
  value: string | null | undefined
  copyValue: string
  emptyValue?: string
}

function FieldRow({ label, value, copyValue, emptyValue = '—' }: FieldRowProps) {
  const displayValue = value?.trim() || emptyValue

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
        <span className="truncate text-sm text-foreground" title={displayValue}>
          {displayValue}
        </span>
        {value && <CopyButton compact value={copyValue} />}
      </div>
    </div>
  )
}