import { ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { CopyButton } from '../../components/CopyButton'
import { Input } from '../../components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface SetupPageProps {
  onSetup: (password: string) => Promise<string>
}

export function SetupPage({ onSetup }: SetupPageProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [isCopied, setIsCopied] = useState(false)

  const checkPasswordStrength = (pass: string) => {
    let strength = 0
    if (pass.length >= 10) strength += 20
    if (pass.length >= 14) strength += 20
    if (/[A-Z]/.test(pass)) strength += 20
    if (/[0-9]/.test(pass)) strength += 20
    if (/[^A-Za-z0-9]/.test(pass)) strength += 20
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

  const getRequirements = () => {
    return [
      { text: 'At least 10 characters long', met: password.length >= 10 },
      { text: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
      { text: 'At least one number (0-9)', met: /[0-9]/.test(password) },
      { text: 'At least one special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) },
    ]
  }

  const submit = async (): Promise<void> => {
    if (password.length < 10) {
      toast.error('Password must be at least 10 characters long')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordStrength < 60) {
      toast.warning('Consider using a stronger password for better security')
    }

    setLoading(true)
    try {
      const generatedRecoveryKey = await onSetup(password)
      setRecoveryKey(generatedRecoveryKey)
      toast.success('Vault initialized successfully!')
    } catch (error) {
      toast.error('Failed to initialize vault')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const isValid = password && confirmPassword && password === confirmPassword && password.length >= 10

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <ShieldCheck size={28} className="text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl tracking-tight">
            Create Master Password
          </CardTitle>
          <CardDescription>
            This password unlocks your encrypted vault. Choose something strong and memorable.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Password Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="masterPassword" className="text-sm font-medium">
                Master Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="masterPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    checkPasswordStrength(event.target.value)
                  }}
                  placeholder="Enter a strong master password"
                  className="pr-10"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Password Strength</span>
                  <span className={`font-medium ${passwordStrength >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                    passwordStrength >= 60 ? 'text-green-600 dark:text-green-400' :
                      passwordStrength >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                    }`}>
                    {getStrengthLabel()}
                  </span>
                </div>
                <Progress value={passwordStrength} className={getStrengthColor()} />
              </div>
            )}

            {/* Password Requirements */}
            {password && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Requirements:</p>
                <ul className="space-y-1">
                  {getRequirements().map((req, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs">
                      {req.met ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <AlertCircle size={12} className="text-muted-foreground" />
                      )}
                      <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                        {req.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Master Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your master password"
                className={confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            {/* Show Password Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
              <Label htmlFor="show-password" className="text-sm cursor-pointer">
                Show password
              </Label>
              <Switch
                id="show-password"
                checked={showPassword}
                onCheckedChange={setShowPassword}
              />
            </div>

            {/* Submit Button */}
            <Button
              disabled={loading || !isValid}
              onClick={submit}
              type="button"
              className="w-full"
              size="lg"
            >
              {loading ? 'Initializing Vault...' : 'Initialize Vault'}
            </Button>
          </div>

          {/* Recovery Key Display */}
          {recoveryKey && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    Save your recovery key now!
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This key is required to reset your vault if you forget your master password.
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-100/50 p-3 dark:border-amber-700 dark:bg-amber-900/30">
                  <div className="flex items-center justify-between gap-2">
                    <code className="select-all font-mono text-sm text-amber-900 break-all dark:text-amber-200">
                      {recoveryKey}
                    </code>
                    <CopyButton value={recoveryKey} onCopy={handleCopy} />
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Store this key in a secure location (e.g., password manager, safe, or printed copy).
                    Without it, you cannot recover your vault.
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Security Note */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Your master password is never stored or transmitted.
              All encryption happens locally on your device.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}