import { Lock, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Eye, EyeOff } from 'lucide-react'

interface UnlockPageProps {
  onUnlock: (password: string) => Promise<boolean>
  onReset: (recoveryKey: string, nextPassword: string) => Promise<{ ok: boolean; message: string }>
}

export function UnlockPage({ onUnlock, onReset }: UnlockPageProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const submitUnlock = async (): Promise<void> => {
    setLoading(true)
    const ok = await onUnlock(password)
    if (!ok) {
      toast.error('Invalid master password')
    }
    setLoading(false)
  }

  const submitRecoveryReset = async (): Promise<void> => {
    if (nextPassword.length < 10) {
      toast.error('New master password must be at least 10 characters')
      return
    }

    if (nextPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    const result = await onReset(recoveryKey, nextPassword)
    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-secondary/20 p-2 text-foreground">
            <Lock size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl text-foreground">Unlock Vault</h1>
            <p className="text-sm text-muted-foreground">Enter your master password to access credentials.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative">

          <Input
            label="Master Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <Button onClick={() => setShowPassword(!showPassword)} variant="ghost"
            className="absolute right-2 top-5 text-muted-foreground  hover:text-foreground">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
          
            </div>

          <Button disabled={loading} onClick={submitUnlock} type="button">
            {loading ? 'Unlocking...' : 'Unlock'}
          </Button>

          <div
            onClick={() => setRecoveryOpen((prev) => !prev)}
            className="mt-3 cursor-pointer text-sm text-muted-foreground hover:text-foreground"
          >
            Forgot master password? Use recovery key
          </div>

          {recoveryOpen ? (
            <div className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-rose-200">
                <ShieldAlert size={16} />
                <p className="text-sm">Use your recovery key to restore access without losing data.</p>
              </div>
              <Input
                label="Recovery Key"
                value={recoveryKey}
                onChange={(event) => setRecoveryKey(event.target.value)}
              />
              <Input
                label="New Master Password"
                type="password"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
                hint="This becomes the new password that unlocks the same vault data."
              />
              <Input
                label="Confirm New Master Password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <Button className="mt-3 " onClick={submitRecoveryReset} type="button" variant="outline">
                Recover Vault
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
