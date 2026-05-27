import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, ShieldAlert } from 'lucide-react'

export function DeleteAccountDialog({
    open,
    onOpenChange,
    onConfirm
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => Promise<void>
}) {
    const [confirmText, setConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const handleConfirm = async () => {
        if (confirmText !== 'DELETE') {
            toast.error('Please type DELETE to confirm')
            return
        }

        setIsDeleting(true)
        await onConfirm()
        setIsDeleting(false)
        setConfirmText('')
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <ShieldAlert size={24} />
                        <DialogTitle>Delete Account</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        This action is <span className="font-bold text-destructive">irreversible</span>.
                        Your vault, all credentials, and settings will be permanently deleted.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
                            <div className="space-y-2">
                                <p className="text-sm text-foreground">
                                    To verify, type <span className="font-mono font-bold text-destructive">DELETE</span> below:
                                </p>
                                <Input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="font-mono"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && confirmText === 'DELETE') {
                                            handleConfirm()
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        <p>⚠️ What gets deleted:</p>
                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                            <li>All credentials and entries</li>
                            <li>All folders and organization</li>
                            <li>Vault settings and preferences</li>
                            <li>Recovery key and encryption data</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={confirmText !== 'DELETE' || isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}