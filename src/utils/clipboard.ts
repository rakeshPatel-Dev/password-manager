export async function copyToClipboard(value: string, clearAfterSeconds = 30): Promise<void> {
  await navigator.clipboard.writeText(value)

  if (clearAfterSeconds <= 0) {
    return
  }

  window.setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText()
      if (current === value) {
        await navigator.clipboard.writeText('')
      }
    } catch {
      // Ignore clipboard permission errors.
    }
  }, clearAfterSeconds * 1000)
}
