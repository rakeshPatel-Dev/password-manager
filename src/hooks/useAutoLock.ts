import { useEffect } from 'react'

interface AutoLockOptions {
  enabled: boolean
  autoLockMinutes: number
  onTimeout: () => void
  onActivity: () => void
}

const EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const

export function useAutoLock({ enabled, autoLockMinutes, onTimeout, onActivity }: AutoLockOptions): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    let lastActivity = Date.now()

    const activityHandler = (): void => {
      lastActivity = Date.now()
      onActivity()
    }

    EVENTS.forEach((eventName) => window.addEventListener(eventName, activityHandler, { passive: true }))

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - lastActivity
      if (elapsed >= autoLockMinutes * 60 * 1000) {
        onTimeout()
      }
    }, 15000)

    return () => {
      window.clearInterval(timer)
      EVENTS.forEach((eventName) => window.removeEventListener(eventName, activityHandler))
    }
  }, [autoLockMinutes, enabled, onActivity, onTimeout])
}
