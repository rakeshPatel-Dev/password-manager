import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { CopyButton } from '../../components/CopyButton'
import { Input } from '../../components/ui/input'

interface SetupPageProps {
  onSetup: (password: string) => Promise<string>
}

export function SetupPage({ onSetup }: SetupPageProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (): Promise<void> => {
    if (password.length < 10) {
      toast.error('Use at least 10 characters for the master password')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    const generatedRecoveryKey = await onSetup(password)
    setRecoveryKey(generatedRecoveryKey)
    toast.success('Vault initialized! Save your recovery key.')
    setLoading(false)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-secondary/20 p-2 text-foreground">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl text-foreground">Create Master Password</h1>
            <p className="text-sm text-muted-foreground">This password unlocks your local encrypted vault.</p>
          </div>
        </div>

        <div className="grid gap-4">
          <Input
            label="Master Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="Never stored in plaintext. Used to derive your vault key."
          />
          <Input
            label="Confirm Master Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <Button disabled={loading} onClick={submit} type="button">
            {loading ? 'Setting up...' : 'Initialize Vault'}
          </Button>

          {recoveryKey ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              <p className="mb-2 font-semibold">Save your recovery key now.</p>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2 font-mono text-foreground">
                <span>{recoveryKey}</span>
                <CopyButton value={recoveryKey} />
              </div>
              <p className="mt-2 text-amber-200/80">This key is required to reset your vault if you forget the master password.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
