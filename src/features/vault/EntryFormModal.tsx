import { Eye, EyeOff, WandSparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { CopyButton } from '../../components/CopyButton'
import type { DecryptedEntry, DecryptedFolder } from '../../types'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '../../components/ui/label'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  id: undefined as number | undefined,
  title: '',
  username: '',
  email: '',
  password: '',
  website: '',
  notes: '',
  folderId: null as number | null,
}

function stripWebsiteProtocol(value: string): string {
  return value.replace(/^https?:\/\//i, '')
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
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [visiblePassword, setVisiblePassword] = useState(false)

  // Reset form when modal opens or props change
  useEffect(() => {
    if (open) {
      const resetTimer = window.setTimeout(() => {
        setVisiblePassword(false)

        if (entry) {
          setForm({
            id: entry.id,
            title: entry.title,
            username: entry.username,
            email: entry.email,
            password: generatedPassword || entry.password,
            website: stripWebsiteProtocol(entry.website),
            notes: entry.notes,
            folderId: entry.folderId,
          })
        } else {
          setForm({
            ...EMPTY_FORM,
            password: generatedPassword || '',
          })
        }
      }, 0)

      return () => window.clearTimeout(resetTimer)
    }

  }, [open, entry, generatedPassword])

  const updateField = (key: keyof typeof form, value: string | number | null): void => {
    setForm((prev) => ({
      ...prev,
      [key]: key === 'website' && typeof value === 'string' ? stripWebsiteProtocol(value) : value,
    }))
  }

  const submit = async (): Promise<void> => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.password.trim()) {
      toast.error('Password is required')
      return
    }

    setSaving(true)
    try {
      toast.promise(onSubmit(form), { loading: 'Saving credential', success: 'Credential saved', error: 'Failed to save credential' })
      onClose()
    } catch {
      toast.error('Failed to save credential')
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = form.title.trim() && form.password.trim()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-138 max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Credential' : 'Add Credential'}</DialogTitle>
          <DialogDescription>
            {entry
              ? 'Update your credential details below.'
              : 'Fill in the details to securely store your credential.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Input
            label="Title *"
            placeholder="e.g., GitHub, Gmail, Netflix"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Username"
              placeholder="Optional"
              value={form.username}
              onChange={(event) => updateField('username', event.target.value)}
            />
            <Input
              label="Email"
              placeholder="Optional"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Password *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={visiblePassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Required"
                  className="pr-24"
                />
              </div>
              <Button
                onClick={() => setVisiblePassword(!visiblePassword)}
                type="button"
                variant="outline"
                size="icon"

                title={visiblePassword ? 'Hide password' : 'Show password'}
              >
                {visiblePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
              <CopyButton className="h-8" compact value={form.password} />
              <Button
                onClick={onOpenGenerator}
                title="Generate strong password"
                type="button"
                variant="outline"
                size="icon"
              >
                <WandSparkles size={16} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Website URL</Label>
            <InputGroup className="h-8">
              <InputGroupAddon align="inline-start" className="pl-3 pr-2 text-sm font-medium text-muted-foreground">
                https://
              </InputGroupAddon>
              <InputGroupInput
                autoComplete="url"
                inputMode="url"
                placeholder="facebook.com"
                value={form.website}
                onChange={(event) => updateField('website', event.target.value)}
              />
            </InputGroup>
          </div>

          {/* Folder Select with shadcn Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Folder</Label>
            <Select
              value={form.folderId?.toString() ?? 'none'}
              onValueChange={(value) => updateField('folderId', value === 'none' ? null : Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder (Uncategorized)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id.toString()}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            label="Notes"
            placeholder="Add any additional notes, recovery codes, or important information..."
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            disabled={saving || !isFormValid}
            onClick={submit}
            type="button"
          >
            {saving ? 'Saving...' : entry ? 'Save Changes' : 'Create Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}