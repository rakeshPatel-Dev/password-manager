import { useMemo, useState, useId } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { CopyButton } from '../../components/CopyButton'
import { Modal } from '../../components/Modal'
import { generatePassword } from '../../utils/passwordGenerator'

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

  const canGenerate = useMemo(() => uppercase || lowercase || numbers || symbols, [lowercase, numbers, symbols, uppercase])
  const idBase = useId()

  const handleGenerate = (): void => {
    if (!canGenerate) {
      return
    }
    const next = generatePassword({ length, uppercase, lowercase, numbers, symbols })
    setPassword(next)
  }

  return (
    <Modal open={open} title="Password Generator" onClose={onClose}>
      <div className="grid gap-4">
        <Input
          label={`Length: ${length}`}
          type="range"
          min={8}
          max={64}
          value={length}
          onChange={(event) => setLength(Number(event.target.value))}
        />

        <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
          <Label htmlFor={`${idBase}-upper`} className="flex items-center gap-2">
            <Input id={`${idBase}-upper`} checked={uppercase} onChange={(event) => setUppercase(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-border bg-background" />
            <span>Uppercase</span>
          </Label>

          <Label htmlFor={`${idBase}-lower`} className="flex items-center gap-2">
            <Input id={`${idBase}-lower`} checked={lowercase} onChange={(event) => setLowercase(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-border bg-background" />
            <span>Lowercase</span>
          </Label>

          <Label htmlFor={`${idBase}-numbers`} className="flex items-center gap-2">
            <Input id={`${idBase}-numbers`} checked={numbers} onChange={(event) => setNumbers(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-border bg-background" />
            <span>Numbers</span>
          </Label>

          <Label htmlFor={`${idBase}-symbols`} className="flex items-center gap-2">
            <Input id={`${idBase}-symbols`} checked={symbols} onChange={(event) => setSymbols(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-border bg-background" />
            <span>Symbols</span>
          </Label>
        </div>

        <div className="rounded-xl border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground">
          {password || 'Generate a secure password'}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={handleGenerate} type="button" variant="ghost">
            Generate
          </Button>
          <CopyButton value={password} />
          <Button
            disabled={!password}
            onClick={() => {
              onUsePassword(password)
              onClose()
            }}
            type="button"
          >
            Use Password
          </Button>
        </div>
      </div>
    </Modal>
  )
}
