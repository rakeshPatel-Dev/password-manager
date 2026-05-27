import { Download, Eraser, FileUp, KeyRound, MoonStar, Timer } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { CopyButton } from '../components/CopyButton'
import { useVaultStore } from '../store/useVaultStore'

function downloadJson(content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ciphernest-export-${Date.now()}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const settings = useVaultStore((state) => state.settings)
  const saveSettings = useVaultStore((state) => state.saveSettings)
  const getRecoveryKey = useVaultStore((state) => state.getRecoveryKey)
  const exportVault = useVaultStore((state) => state.exportVault)
  const importVault = useVaultStore((state) => state.importVault)
  const clearVaultData = useVaultStore((state) => state.clearVaultData)
  const deleteAccount = useVaultStore((state) => state.deleteAccount)
  const changeMasterPassword = useVaultStore((state) => state.changeMasterPassword)
  const [recoveryKey, setRecoveryKey] = useState('••••-••••-••••-••••')
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleShowRecovery = async (): Promise<void> => {
    const next = await getRecoveryKey()
    setRecoveryKey(next)
    toast.success('Recovery key displayed')
  }

  const handleExport = async (): Promise<void> => {
    const dump = await exportVault()
    downloadJson(dump)
    toast.success('Vault exported successfully')
  }

  const handleImport = async (file: File): Promise<void> => {
    try {
      const text = await file.text()
      await importVault(text)
      toast.success('Vault imported successfully')
    } catch {
      toast.error('Failed to import vault')
    }
  }

  const handleChangeMasterPassword = async (): Promise<void> => {
    if (!currentPassword || !nextPassword || !confirmPassword) {
      toast.error('All fields are required')
      return
    }

    if (nextPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    const result = await changeMasterPassword(currentPassword, nextPassword)
    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)
    setCurrentPassword('')
    setNextPassword('')
    setConfirmPassword('')
  }

  const handleClearVault = async (): Promise<void> => {
    if (confirm('Are you sure? This will permanently delete all vault data.')) {
      await clearVaultData()
      toast.success('Vault data cleared')
    }
  }

  const handleDeleteAccount = async (): Promise<void> => {
    const confirmed = confirm(
      'Delete my account? This will permanently remove your vault, folders, credentials, recovery key, and account settings from this device.',
    )

    if (!confirmed) {
      return
    }

    await deleteAccount()
    toast.success('Account deleted')
  }

  return (
    <section className="grid gap-4">
      <h1 className="font-display text-2xl text-foreground">Settings</h1>

          <article className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
              <Timer size={16} /> Auto Lock
            </h2>
            <div className="text-sm text-muted-foreground">
              <Label className="mb-1">Minutes before lock: {settings.autoLockMinutes}</Label>
              <Input
                className="mt-2 w-full"
                max={30}
                min={1}
                type="range"
                value={settings.autoLockMinutes}
                onChange={(event) => saveSettings({ autoLockMinutes: Number(event.target.value) })}
              />
            </div>
      </article>

          <article className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
              <MoonStar size={16} /> Theme
            </h2>
        <Button
          onClick={() => saveSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          type="button"
          variant="ghost"
        >
          Current theme: {settings.theme}
        </Button>
      </article>

      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-lg text-foreground">Change Master PIN</h2>
        <div className="grid gap-3">
          <Input
            label="Current Master Password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            label="New Master Password"
            type="password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            hint="Use at least 10 characters. Vault data is re-encrypted safely."
          />
          <Input
            label="Confirm New Master Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <div>
            <Button onClick={handleChangeMasterPassword} type="button">
              Update Master Password
            </Button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
          <KeyRound size={16} /> Recovery Key
        </h2>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary px-3 py-2 font-mono text-sm text-foreground">
          <span>{recoveryKey}</span>
          <CopyButton value={recoveryKey} />
        </div>
        <Button className="mt-2" onClick={handleShowRecovery} type="button" variant="ghost">
          Show Recovery Key
        </Button>
      </article>

      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-lg text-foreground">Vault Import / Export</h2>
        <div className="flex flex-wrap gap-2">
          <Button  onClick={handleExport}  variant="ghost">
            <Download size={14} />
            Export Encrypted Vault
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}  variant="ghost">
            <FileUp size={14} />
            Import Encrypted Vault
          </Button>
          <Button onClick={handleClearVault} variant="outline" className="text-destructive hover:bg-destructive/10">
            <Eraser size={14} />
            Clear Vault Data
          </Button>
        </div>
        <Input
          ref={fileInputRef}
          accept="application/json"
          className="hidden"
          type="file"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (file) {
              await handleImport(file)
            }
            event.currentTarget.value = ''
          }}
        />
      </article>

      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-lg text-foreground">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all local data stored on this device.
        </p>
        <Button className="mt-3" onClick={handleDeleteAccount} type="button" variant="destructive">
          Delete My Account
        </Button>
      </article>
    </section>
  )
}
