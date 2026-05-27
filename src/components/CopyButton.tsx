import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'
import { copyToClipboard } from '../utils/clipboard'
import { toast } from 'sonner';

interface CopyButtonProps {
  value: string
  seconds?: number
  compact?: boolean
  className?: string
}

export function CopyButton({ value, seconds = 30, compact = false, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (): Promise<void> => {
    toast.promise(copyToClipboard(value, seconds),
      {
        loading: 'Copying to clipboard',
        success: 'Copied to clipboard',
        error: 'Failed to copy to clipboard'
      }
    )
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Button
      variant="outline"
      size={compact ? 'sm' : 'default'}
      onClick={handleCopy}
      type="button"
      className={className}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
