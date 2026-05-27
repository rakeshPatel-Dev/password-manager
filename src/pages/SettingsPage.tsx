// SettingsPage.tsx (updated)
import { Download, FileUp, KeyRound, SunMoon, Timer, AlertTriangle, Shield } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { CopyButton } from '../components/CopyButton'
import { useVaultStore } from '../store/useVaultStore'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ChangeMasterPasswordDialog } from '../components/settings/ChangeMPassDialog'
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountModal';


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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [recoveryKey, setRecoveryKey] = useState('••••-••••-••••-••••')
  const [showRecoveryKey, setShowRecoveryKey] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleShowRecovery = async (): Promise<void> => {
    const next = await getRecoveryKey()
    setRecoveryKey(next)
    setShowRecoveryKey(true)
    toast.success('Recovery key displayed - copy it to a safe place')

    // Auto-hide after 30 seconds
    setTimeout(() => {
      setShowRecoveryKey(false)
      setRecoveryKey('••••-••••-••••-••••')
    }, 30000)
  }

  const handleExport = async (): Promise<void> => {
    try {
      const dump = await exportVault()
      downloadJson(dump)
      toast.success('Vault exported successfully')
    } catch {
      toast.error('Failed to export vault')
    }
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

  const handleClearVault = async (): Promise<void> => {
    await clearVaultData()
    toast.success('Vault data cleared')
  }

  const handleDeleteAccount = async () => {
    await deleteAccount()
    toast.success('Account deleted successfully')
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your vault security, preferences, and account
        </p>
      </div>

      <Separator />

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer size={18} />
            Preferences
          </CardTitle>
          <CardDescription>
            Customize your vault experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Lock */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoLock" className="text-sm font-medium">
                Auto Lock Timer
              </Label>
              <Badge variant="secondary" className="font-mono">
                {settings.autoLockMinutes} minute{settings.autoLockMinutes !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Slider
              id="autoLock"
              value={[settings.autoLockMinutes]}
              onValueChange={(value) => saveSettings({ autoLockMinutes: value[0] })}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Vault will automatically lock after {settings.autoLockMinutes} minute{settings.autoLockMinutes !== 1 ? 's' : ''} of inactivity
            </p>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme" className="text-sm font-medium">
                Dark Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Toggle between light and dark theme
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SunMoon size={16} className="text-muted-foreground" />
              <Switch
                id="theme"
                checked={settings.theme === 'dark'}
                onCheckedChange={() => saveSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} />
            Security
          </CardTitle>
          <CardDescription>
            Protect your vault with strong passwords and recovery options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Change Master Password - Using Dialog */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Master Password</h3>
              <p className="text-xs text-muted-foreground">
                Change your master password to enhance security
              </p>
            </div>
            <ChangeMasterPasswordDialog onChangePassword={changeMasterPassword}>
              <Button variant="outline" className="gap-2">
                <KeyRound size={16} />
                Change Master Password
              </Button>
            </ChangeMasterPasswordDialog>
          </div>

          <Separator />

          {/* Recovery Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recovery Key</h3>
                <p className="text-xs text-muted-foreground">
                  Use this key to recover your vault if you forget your password
                </p>
              </div>
              <Button onClick={handleShowRecovery} type="button" variant="outline" size="sm">
                <KeyRound size={14} className="mr-2" />
                {showRecoveryKey ? 'Hide Key' : 'Show Recovery Key'}
              </Button>
            </div>

            {showRecoveryKey && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="select-all font-mono text-sm text-foreground break-all">
                    {recoveryKey}
                  </code>
                  <CopyButton value={recoveryKey} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  ⚠️ Save this key in a secure location. It will not be shown again.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download size={18} />
            Data Management
          </CardTitle>
          <CardDescription>
            Export, import, or clear your vault data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download size={16} />
              Export Vault
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
              <FileUp size={16} />
              Import Vault
            </Button>
            <AlertDialog>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Vault Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all your credentials, folders, and settings.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearVault} className="bg-destructive text-destructive-foreground">
                    Clear Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={18} />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible account actions
          </CardDescription>
        </CardHeader>
        <CardContent className=" text-destructive flex items-center gap-2">
          <div>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2"
            >
              <AlertTriangle size={16} />
              Delete Account
            </Button>

            <DeleteAccountDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              onConfirm={handleDeleteAccount}
            />
          </div>
          <div>
            <Button
              variant="destructive"
              onClick={handleClearVault}
              className="gap-2"
            >
              <AlertTriangle size={16} />
              Clear Vault
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}