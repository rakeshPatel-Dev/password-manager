import * as React from "react"
import { useId } from 'react'

import { cn } from "@/lib/utils"
import { Label } from "./label"

type TextareaProps = React.ComponentProps<"textarea"> & {
  label?: React.ReactNode
  hint?: React.ReactNode
}

function Textarea({ className, label, hint, id, ...props }: TextareaProps) {
  const autoId = useId()
  const textareaId = id ?? `textarea-${autoId}`

  return (
    <div className="flex w-full flex-col">
      {label ? (
        <Label htmlFor={textareaId} className="mb-1">
          {label}
        </Label>
      ) : null}

      <textarea
        id={textareaId}
        data-slot="textarea"
        className={cn(
          "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />

      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export { Textarea }
