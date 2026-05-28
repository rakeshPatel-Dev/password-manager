import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { UnlockPage } from './features/auth/UnlockPage'
import { SetupPage } from './features/auth/SetupPage'
import { useAutoLock } from './hooks/useAutoLock'
import { AppShell } from './layouts/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { useVaultStore } from './store/useVaultStore'

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm space-y-3">
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
            </div>
          </div>
          <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Loading</h2>
          <p className="text-sm text-muted-foreground">Decrypting vault...</p>
        </div>
      </div>
    </main>
  )
}

function ProtectedRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />} path="/">
        <Route element={<DashboardPage />} index />
        <Route element={<SettingsPage />} path="settings" />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  )
}

function App() {
  const isBootstrapping = useVaultStore((state) => state.isBootstrapping)
  const isConfigured = useVaultStore((state) => state.isConfigured)
  const isUnlocked = useVaultStore((state) => state.isUnlocked)
  const settings = useVaultStore((state) => state.settings)
  const bootstrap = useVaultStore((state) => state.bootstrap)
  const setupVault = useVaultStore((state) => state.setupVault)
  const completeVaultSetup = useVaultStore((state) => state.completeVaultSetup)
  const unlockVault = useVaultStore((state) => state.unlockVault)
  const unlockVaultWithPasskey = useVaultStore((state) => state.unlockVaultWithPasskey)
  const resetVaultWithRecoveryKey = useVaultStore((state) => state.resetVaultWithRecoveryKey)
  const lockVault = useVaultStore((state) => state.lockVault)
  const touch = useVaultStore((state) => state.touch)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  }, [settings.theme])

  useAutoLock({
    enabled: isUnlocked,
    autoLockMinutes: settings.autoLockMinutes,
    onTimeout: lockVault,
    onActivity: touch,
  })

  if (isBootstrapping) {
    return <LoadingScreen />
  }

  if (!isConfigured) {
    return <SetupPage onSetup={setupVault} onCompleteSetup={completeVaultSetup} />
  }

  if (!isUnlocked) {
    return <UnlockPage onUnlock={unlockVault} onPasskeyUnlock={unlockVaultWithPasskey} onReset={resetVaultWithRecoveryKey} />
  }

  return (
    <>
      <BrowserRouter>
        <ProtectedRoutes />
      </BrowserRouter>
      <Toaster position="top-center" theme="dark" closeButton toastOptions={{ duration: 3000 }} richColors />
    </>
  )
}

export default App
