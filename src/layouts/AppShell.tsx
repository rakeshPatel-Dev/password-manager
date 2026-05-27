import { Lock, Settings, Vault, Menu, X, Shield, KeyRound } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import { Button } from '../components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function AppShell() {
  const lockVault = useVaultStore((state) => state.lockVault)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])

  const navItems = [
    { path: '/', label: 'Vault', icon: Vault },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg ring-1 ring-primary/20">
              <Shield size={20} className="text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base font-semibold tracking-tight text-foreground md:text-xl">
                CipherNest
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Secure Local-First Vault
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-foreground bg-secondary/80 shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon size={16} className="transition-transform group-hover:scale-105" />
                <span>{item.label}</span>
                {({ isActive }) => isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </NavLink>
            ))}

            <div className="ml-4 border-l border-border pl-4">
              <Button
                onClick={lockVault}
                size="sm"
                variant="outline"
                className="gap-2 transition-all duration-200 hover:shadow-md"
                aria-label="Lock vault"
              >
                <Lock size={16} />
                <span>Lock</span>
              </Button>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              onClick={lockVault}
              size="sm"
              variant="outline"
              className="gap-1"
              aria-label="Lock vault"
            >
              <Lock size={16} />
            </Button>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
                      <Shield size={20} className="text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-foreground">CipherNest</p>
                      <p className="text-xs text-muted-foreground">Secure Password Vault</p>
                    </div>
                  </div>

                  <nav className="flex flex-col gap-2">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-secondary text-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )
                        }
                      >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </nav>

                  <div className="mt-auto pt-4 border-t border-border">
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <KeyRound size={12} />
                        <span>Local-first encryption</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        Your data never leaves this device
                      </p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>

      {/* Footer (Optional) */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <p className="text-center text-xs text-muted-foreground">
            🔒 End-to-end encrypted | All data stored locally
          </p>
        </div>
      </footer>
    </div>
  )
}