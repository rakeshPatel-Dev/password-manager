import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'
import { copyToClipboard } from '../utils/clipboard'

interface CopyButtonProps {
  value: string
  seconds?: number
  compact?: boolean
}

export function CopyButton({ value, seconds = 30, compact = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (): Promise<void> => {
    await copyToClipboard(value, seconds)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Button
      variant="outline"
      size={compact ? 'sm' : 'default'}
      onClick={handleCopy}
      type="button"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
