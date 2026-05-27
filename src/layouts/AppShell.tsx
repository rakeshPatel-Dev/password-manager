import { Lock, Settings, Vault } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useVaultStore } from '../store/useVaultStore'
import { Button } from '../components/ui/button'

export function AppShell() {
  const lockVault = useVaultStore((state) => state.lockVault)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-primary text-primary-foreground">
              <Vault size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-foreground md:text-lg">CipherNest</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Local-first vault</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
              }
              to="/"
            >
              Vault
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
              }
              to="/settings"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Settings</span>
            </NavLink>
            <div className="ml-2 border-l border-border pl-2">
              <Button
                onClick={lockVault}
                size="sm"
                type="button"
                variant="outline"
                className="gap-2"
              >
                <Lock size={16} />
                <span className="hidden sm:inline">Lock</span>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  )
}
