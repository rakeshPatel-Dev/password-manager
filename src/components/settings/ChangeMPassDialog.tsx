// components/ChangeMasterPasswordDialog.tsx
import { useState } from 'react'
import { Shield, KeyRound, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'

interface ChangeMasterPasswordDialogProps {
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; message: string }>
    children?: React.ReactNode
}

export function ChangeMasterPasswordDialog({ onChangePassword, children }: ChangeMasterPasswordDialogProps) {
    const [open, setOpen] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChanging, setIsChanging] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [showError, setShowError] = useState('')

    const checkPasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 10) strength += 20
        if (password.length >= 14) strength += 20
        if (/[A-Z]/.test(password)) strength += 20
        if (/[0-9]/.test(password)) strength += 20
        if (/[^A-Za-z0-9]/.test(password)) strength += 20
        setPasswordStrength(strength)
        return strength
    }

    const getStrengthColor = () => {
        if (passwordStrength >= 80) return 'bg-emerald-500'
        if (passwordStrength >= 60) return 'bg-green-500'
        if (passwordStrength >= 40) return 'bg-yellow-500'
        if (passwordStrength >= 20) return 'bg-orange-500'
        return 'bg-red-500'
    }

    const getStrengthLabel = () => {
        if (passwordStrength >= 80) return 'Very Strong'
        if (passwordStrength >= 60) return 'Strong'
        if (passwordStrength >= 40) return 'Moderate'
        if (passwordStrength >= 20) return 'Weak'
        return 'Very Weak'
    }

    const validateForm = (): boolean => {
        if (!currentPassword) {
            setShowError('Current password is required')
            return false
        }

        if (!newPassword) {
            setShowError('New password is required')
            return false
        }

        if (newPassword.length < 10) {
            setShowError('Password must be at least 10 characters long')
            return false
        }

        if (newPassword !== confirmPassword) {
            setShowError('Passwords do not match')
            return false
        }

        setShowError('')
        return true
    }

    const handleSubmit = async () => {
        if (!validateForm()) return

        setIsChanging(true)
        const result = await onChangePassword(currentPassword, newPassword)
        setIsChanging(false)

        if (!result.ok) {
            setShowError(result.message)
            return
        }

        toast.success(result.message)
        resetForm()
        setOpen(false)
    }

    const resetForm = () => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordStrength(0)
        setShowError('')
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm()
        }
        setOpen(newOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children || <Button variant="outline">Change Master Password</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield size={18} />
                        Change Master Password
                    </DialogTitle>
                    <DialogDescription>
                        Update your master password to enhance security. Your vault will be re-encrypted automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {showError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{showError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="current-password" className="text-sm font-medium">
                            Current Master Password
                        </Label>
                        <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                            disabled={isChanging}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sm font-medium">
                            New Master Password
                        </Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value)
                                checkPasswordStrength(e.target.value)
                                setShowError('')
                            }}
                            placeholder="At least 10 characters"
                            disabled={isChanging}
                        />

                        {newPassword && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Strength: {getStrengthLabel()}</span>
                                    <span className="text-muted-foreground">{passwordStrength}%</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${getStrengthColor()}`}
                                        style={{ width: `${passwordStrength}%` }}
                                    />
                                </div>
                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    <li className={newPassword.length >= 10 ? 'text-green-600 dark:text-green-400' : ''}>
                                        • At least 10 characters
                                    </li>
                                    <li className={/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                                        • At least one uppercase letter
                                    </li>
                                    <li className={/[0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                                        • At least one number
                                    </li>
                                    <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                                        • At least one special character
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium">
                            Confirm New Master Password
                        </Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value)
                                setShowError('')
                            }}
                            placeholder="Confirm your new password"
                            disabled={isChanging}
                            className={confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''}
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500">Passwords do not match</p>
                        )}
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                        <div className="flex items-start gap-2">
                            <KeyRound size={16} className="mt-0.5 text-blue-600 dark:text-blue-400" />
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                                    What happens when you change your password?
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                    Your entire vault will be re-encrypted with your new password. This process is secure and your data remains protected.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isChanging}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
                    >
                        {isChanging ? 'Changing Password...' : 'Update Password'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}