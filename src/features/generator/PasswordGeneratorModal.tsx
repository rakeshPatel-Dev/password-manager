import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { CopyButton } from '../../components/CopyButton'
import { generatePassword } from '../../utils/passwordGenerator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

interface PasswordGeneratorModalProps {
  open: boolean
  onClose: () => void
  onUsePassword: (password: string) => void
}

export function PasswordGeneratorModal({ open, onClose, onUsePassword }: PasswordGeneratorModalProps) {
  const [length, setLength] = useState(18)
  const [uppercase, setUppercase] = useState(true)
  const [lowercase, setLowercase] = useState(true)
  const [numbers, setNumbers] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [password, setPassword] = useState('')

  const canGenerate = uppercase || lowercase || numbers || symbols

  const handleGenerate = (): void => {
    if (!canGenerate) {
      return
    }
    const generated = generatePassword({ length, uppercase, lowercase, numbers, symbols })
    setPassword(generated)
  }

  // Generate password when modal opens or options change
  useEffect(() => {
    if (open && canGenerate) {
      handleGenerate()
    }
  }, [open, length, uppercase, lowercase, numbers, symbols, canGenerate])

  const handleUsePassword = () => {
    if (password) {
      onUsePassword(password)
      onClose()
    }
  }

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!password) return { label: 'None', color: 'bg-gray-300', width: 0 }

    let strength = 0
    if (password.length >= 12) strength += 25
    if (password.length >= 16) strength += 25
    if (uppercase) strength += 15
    if (lowercase) strength += 15
    if (numbers) strength += 10
    if (symbols) strength += 10

    if (strength >= 80) return { label: 'Very Strong', color: 'bg-emerald-500', width: 100 }
    if (strength >= 60) return { label: 'Strong', color: 'bg-green-500', width: 75 }
    if (strength >= 40) return { label: 'Moderate', color: 'bg-yellow-500', width: 50 }
    return { label: 'Weak', color: 'bg-red-500', width: 25 }
  }

  const strength = getPasswordStrength()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Password Generator</DialogTitle>
          <DialogDescription>
            Create strong, secure passwords with custom criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Length Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Password Length</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setLength(Math.max(8, length - 1))}
                  disabled={length <= 8}
                >
                  -
                </Button>
                <span className="min-w-[40px] text-center font-mono text-sm font-medium">
                  {length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setLength(Math.min(64, length + 1))}
                  disabled={length >= 64}
                >
                  +
                </Button>
              </div>
            </div>
            <Slider
              value={[length]}
              onValueChange={(value) => setLength(value[0])}
              min={8}
              max={64}
              step={1}
              className="w-full"
            />
          </div>

          {/* Character Options with Switches */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Character Types</Label>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="uppercase" className="text-sm">
                  Uppercase Letters <span className="text-muted-foreground">[ A B C D E ... Z ]</span>
                </Label>
                <Switch
                  id="uppercase"
                  checked={uppercase}
                  onCheckedChange={setUppercase}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="lowercase" className="text-xs">
                  Lowercase Letters <span className="text-muted-foreground">[ a b c d e ... z ]</span>
                </Label>
                <Switch
                  id="lowercase"
                  checked={lowercase}
                  onCheckedChange={setLowercase}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="numbers" className="text-xs">
                  Numbers <span className="text-muted-foreground">[ 0 1 2 3 4 ... 9 ]</span>
                </Label>
                <Switch
                  id="numbers"
                  checked={numbers}
                  onCheckedChange={setNumbers}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="symbols" className="text-xs">
                  Symbols <span className="text-muted-foreground">[ ! @ # $ % ^ & * ( ) ]</span>
                </Label>
                <Switch
                  id="symbols"
                  checked={symbols}
                  onCheckedChange={setSymbols}
                />
              </div>
            </div>
          </div>

          {/* Warning when no option selected */}
          {!canGenerate && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              ⚠️ Please select at least one character type
            </div>
          )}

          {/* Generated Password Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Generated Password</Label>
              {password && (
                <span className="text-xs text-muted-foreground">
                  Click to copy
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2.5 font-mono text-sm text-foreground break-all">
                {password || 'Click Generate to create a password'}
              </div>
              <CopyButton value={password} />
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Password Strength</span>
                <span className={`font-medium ${strength.label === 'Very Strong' ? 'text-emerald-600 dark:text-emerald-400' :
                  strength.label === 'Strong' ? 'text-green-600 dark:text-green-400' :
                    strength.label === 'Moderate' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                  }`}>
                  {strength.label}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${strength.width}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 ">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            type="button"
            variant="secondary"
            disabled={!canGenerate}
          >
            Generate New
          </Button>
          <Button
            disabled={!password}
            onClick={handleUsePassword}
            type="button"
          >
            Use Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}