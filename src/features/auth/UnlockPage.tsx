import { Lock, ShieldAlert, KeyRound, Eye, EyeOff, UserKey } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface UnlockPageProps {
  onUnlock: (password: string) => Promise<boolean>
  onPasskeyUnlock: () => Promise<boolean>
  onReset: (recoveryKey: string, nextPassword: string) => Promise<{ ok: boolean; message: string }>
}

export function UnlockPage({ onUnlock, onPasskeyUnlock, onReset }: UnlockPageProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRecoveryPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const checkPasswordStrength = (pass: string) => {
    let strength = 0
    if (pass.length >= 10) strength += 25
    if (pass.length >= 14) strength += 25
    if (/[A-Z]/.test(pass)) strength += 20
    if (/[0-9]/.test(pass)) strength += 15
    if (/[^A-Za-z0-9]/.test(pass)) strength += 15
    setPasswordStrength(strength)
    return strength
  }

  const getStrengthColor = () => {
    if (passwordStrength >= 80) return 'bg-emerald-500'
    if (passwordStrength >= 60) return 'bg-green-500'
    if (passwordStrength >= 40) return 'bg-yellow-500'
    if (passwordStrength >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getStrengthLabel = () => {
    if (passwordStrength >= 80) return 'Very Strong'
    if (passwordStrength >= 60) return 'Strong'
    if (passwordStrength >= 40) return 'Moderate'
    if (passwordStrength >= 20) return 'Weak'
    return 'Very Weak'
  }

  const submitUnlock = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!password) {
      toast.error('Please enter your master password')
      return
    }

    setLoading(true)
    const ok = await onUnlock(password)
    if (!ok) {
      toast.error('Invalid master password')
      setPassword('')
    }
    setLoading(false)
  }

  const submitPasskeyUnlock = async (): Promise<void> => {
    setLoading(true)
    try {
      const ok = await onPasskeyUnlock()
      if (!ok) {
        toast.error('Passkey unlock was not completed')
      }
    } finally {
      setLoading(false)
    }
  }

  const submitRecoveryReset = async (): Promise<void> => {
    if (!recoveryKey.trim()) {
      toast.error('Recovery key is required')
      return
    }

    if (nextPassword.length < 10) {
      toast.error('New master password must be at least 10 characters')
      return
    }

    if (nextPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    setIsResetting(true)
    const result = await onReset(recoveryKey, nextPassword)
    setIsResetting(false)

    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)
    // Reset recovery form
    setRecoveryOpen(false)
    setRecoveryKey('')
    setNextPassword('')
    setConfirmPassword('')
    setPasswordStrength(0)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-secondary/20 p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/80 shadow-lg">
            <Lock size={28} className="text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl tracking-tight">PassVault</CardTitle>
          <CardDescription>
            Secure your digital life with local-first encryption
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Unlock Form */}
          <form onSubmit={submitUnlock} className="space-y-4 p-4">
            <div className="relative">
              <Input
                label="Master Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your master password"
                disabled={loading}
                autoFocus
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-5 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">

              <Button type="submit" disabled={loading || !password} className="flex-1">
                {loading ? 'Unlocking...' : 'Unlock Vault'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={loading}
                onClick={() => {
                  void submitPasskeyUnlock()
                }}
              >
                <UserKey size={16} />
                Use Passkey
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Recovery Section */}
          <div className="space-y-3">
            <button
              onClick={() => setRecoveryOpen(!recoveryOpen)}
              className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              type="button"
            >
              {recoveryOpen ? '← Back to unlock' : 'Forgot master password? Use recovery key'}
            </button>

            {recoveryOpen && (
              <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                <Alert variant="default" className="border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-900/50">
                  <ShieldAlert size={16} className="text-amber-700 dark:text-amber-400" />
                  <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
                    Use your recovery key to restore access without losing any data.
                    Your vault will be re-encrypted with the new password.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Input
                    label="Recovery Key"
                    value={recoveryKey}
                    onChange={(event) => setRecoveryKey(event.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="font-mono"
                  />

                  <div className="space-y-2">
                    <Input
                      label="New Master Password"
                      type={showRecoveryPassword ? 'text' : 'password'}
                      value={nextPassword}
                      onChange={(event) => {
                        setNextPassword(event.target.value)
                        checkPasswordStrength(event.target.value)
                      }}
                      placeholder="At least 10 characters"
                    />

                    {nextPassword && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Strength: {getStrengthLabel()}</span>
                          <span className="text-muted-foreground">{passwordStrength}%</span>
                        </div>
                        <Progress value={passwordStrength} className={getStrengthColor()} />
                        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                          <li className={nextPassword.length >= 10 ? 'text-green-600 dark:text-green-400' : ''}>
                            ✓ At least 10 characters
                          </li>
                          <li className={/[A-Z]/.test(nextPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                            ✓ At least one uppercase letter
                          </li>
                          <li className={/[0-9]/.test(nextPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                            ✓ At least one number
                          </li>
                          <li className={/[^A-Za-z0-9]/.test(nextPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                            ✓ At least one special character
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <Input
                    label="Confirm New Master Password"
                    type={showRecoveryPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your new password"
                  />
                  {confirmPassword && nextPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setRecoveryOpen(false)
                        setRecoveryKey('')
                        setNextPassword('')
                        setConfirmPassword('')
                      }}
                      type="button"
                      variant="ghost"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={submitRecoveryReset}
                      type="button"
                      variant="default"
                      className="flex-1"
                      disabled={isResetting || !recoveryKey || !nextPassword || !confirmPassword || nextPassword !== confirmPassword}
                    >
                      {isResetting ? 'Recovering...' : 'Recover Vault'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security Footer */}
          <div className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <KeyRound size={12} />
              <span>End-to-end encrypted • Local-first storage</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}