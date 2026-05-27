import { Eye, EyeOff, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { useId } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { CopyButton } from '../../components/CopyButton'
import { Modal } from '../../components/Modal'
import type { DecryptedEntry, DecryptedFolder } from '../../types'
import { Textarea } from '@/components/ui/textarea';
import { Label } from '../../components/ui/label'

interface EntryFormModalProps {
  open: boolean
  folders: DecryptedFolder[]
  entry?: DecryptedEntry
  generatedPassword?: string
  onClose: () => void
  onSubmit: (input: Omit<DecryptedEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>
  onOpenGenerator: () => void
}

const EMPTY_FORM = {
  title: '',
  username: '',
  email: '',
  password: '',
  website: '',
  notes: '',
  folderId: null as number | null,
}

function buildInitialForm(entry?: DecryptedEntry, generatedPassword?: string) {
  if (!entry) {
    return {
      ...EMPTY_FORM,
      password: generatedPassword ?? '',
    }
  }

  return {
    title: entry.title,
    username: entry.username,
    email: entry.email,
    password: generatedPassword ?? entry.password,
    website: entry.website,
    notes: entry.notes,
    folderId: entry.folderId,
  }
}

export function EntryFormModal({
  open,
  folders,
  entry,
  generatedPassword,
  onClose,
  onSubmit,
  onOpenGenerator,
}: EntryFormModalProps) {
  const [form, setForm] = useState(() => buildInitialForm(entry, generatedPassword))
  const [saving, setSaving] = useState(false)
  const [visiblePassword, setVisiblePassword] = useState(false)
  const idBase = useId()

  const updateField = (key: keyof typeof form, value: string | number | null): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async (): Promise<void> => {
    if (!form.title.trim() || !form.password.trim()) {
      toast.error('Title and password are required')
      return
    }

    setSaving(true)
    await onSubmit({
      id: entry?.id,
      title: form.title.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      website: form.website.trim(),
      notes: form.notes.trim(),
      folderId: form.folderId,
    })
    setSaving(false)
    toast.success(entry ? 'Credential updated' : 'Credential created')
    onClose()
  }

  return (
    <Modal open={open} title={entry ? 'Edit Credential' : 'Add Credential'} onClose={onClose}>
      <div className="grid gap-4">
        <Input label="Title" placeholder="Ex: GitHub" value={form.title} onChange={(event) => updateField('title', event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Username"
            placeholder="Optional"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
          />
          <Input label="Email" placeholder="Optional" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-foreground">Password</span>
          <div className="flex gap-2">
            <Input
              className="w-full "
              type={visiblePassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Required"
            />
            <Button
              onClick={() => setVisiblePassword((prev) => !prev)}
              type="button"
            >
              {visiblePassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
            <CopyButton compact value={form.password} />
            <Button
              onClick={onOpenGenerator}
              title="Open password generator"
              type="button"
            >
              <WandSparkles size={16} />
            </Button>
          </div>
        </div>

        <Input label="Website URL" placeholder="https://example.com" value={form.website} onChange={(event) => updateField('website', event.target.value)} />

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Label htmlFor={`${idBase}-folder`} className="font-medium text-foreground">Folder</Label>
          <select
            id={`${idBase}-folder`}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-foreground focus:border-ring focus:outline-none"
            value={form.folderId ?? ''}
            onChange={(event) => updateField('folderId', event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <Textarea label="Notes" placeholder="Any important notes" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button disabled={saving || !form.title.trim() || !form.password.trim()} onClick={submit} type="button">
            {saving ? 'Saving...' : entry ? 'Save Changes' : 'Create Entry'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
