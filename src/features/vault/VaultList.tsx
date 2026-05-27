import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { useMemo, useState } from 'react'
import { CopyButton } from '../../components/CopyButton'
import type { DecryptedEntry, DecryptedFolder } from '../../types'

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

export function VaultList({ entries, folders, searchTerm, selectedFolderId, onEdit, onDelete }: VaultListProps) {
  const [visibleMap, setVisibleMap] = useState<Record<number, boolean>>({})

  const folderMap = useMemo(() => {
    return Object.fromEntries(folders.map((folder) => [folder.id, folder.name]))
  }, [folders])

  const filtered = useMemo(() => {
    const query = normalize(searchTerm)

    return entries
      .filter((entry) => (selectedFolderId === 'all' ? true : entry.folderId === selectedFolderId))
      .filter((entry) => {
        if (!query) return true

        const folder = entry.folderId ? folderMap[entry.folderId] ?? '' : ''
        const haystack = [entry.title, entry.username, entry.email, entry.website, folder].map(normalize).join(' ')
        return haystack.includes(query)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [entries, folderMap, searchTerm, selectedFolderId])

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border bg-secondary p-12 text-center">
        <p className="text-sm text-muted-foreground">No entries found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filtered.map((entry) => {
        const visible = visibleMap[entry.id] ?? false
        return (
          <article key={entry.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className="space-y-4 p-5">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <h3 className="font-display text-lg font-semibold text-foreground">{entry.title}</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onEdit(entry)}
                    size="sm"
                    type="button"
                    variant="outline"
                    className="h-8 w-8 p-0"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    onClick={() => onDelete(entry.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Username</Label>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                    <span className="truncate text-sm text-foreground">{entry.username || '—'}</span>
                    <CopyButton compact value={entry.username} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                    <span className="truncate text-sm text-foreground">{entry.email || '—'}</span>
                    <CopyButton compact value={entry.email} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Password</Label>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                    <span className="font-mono text-sm text-foreground">{visible ? entry.password : '••••••••••••'}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => setVisibleMap((prev) => ({ ...prev, [entry.id]: !visible }))}
                        size="sm"
                        type="button"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      >
                        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <CopyButton compact value={entry.password} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Website</Label>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                    <span className="truncate text-sm text-foreground">{entry.website || '-'}</span>
                    <CopyButton compact value={entry.website} />
                  </div>
              </div>
              </div>
            </div>

            {entry.notes ? (
              <div className="mt-3 rounded-lg bg-secondary p-2 text-sm text-muted-foreground">
                <p className="text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{entry.notes}</p>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Folder: {entry.folderId ? folderMap[entry.folderId] ?? 'Unknown' : 'Uncategorized'}</span>
              <span>Updated: {new Date(entry.updatedAt).toLocaleString()}</span>
            </div>
          </article>

        )

      })}

    </div>
  )
}
