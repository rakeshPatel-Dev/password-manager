import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Mail, MessageCircle } from 'lucide-react'

interface HelpRequestModalProps {
    open: boolean
    onClose: () => void
}

const developerEmail = import.meta.env.VITE_DEV_EMAIL;
const developerWhatsapp = import.meta.env.VITE_DEV_PHONE;

export function HelpRequestModal({ open, onClose }: HelpRequestModalProps) {
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [channel, setChannel] = useState<'email' | 'whatsapp'>('email')

    const resetForm = () => {
        setTitle('')
        setMessage('')
        setChannel('email')
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const trimmedTitle = title.trim()
        const trimmedMessage = message.trim()

        if (!trimmedTitle || !trimmedMessage) {
            return
        }

        const body = `
        Hi, I need help with the PassVault app. Here are the details:
        Title: ${trimmedTitle}\n\nMessage:\n${trimmedMessage}`
        const encodedBody = encodeURIComponent(body)
        const encodedSubject = encodeURIComponent(trimmedTitle)

        const targetUrl = channel === 'whatsapp'
            ? `https://wa.me/${developerWhatsapp}?text=${encodedBody}`
            : `mailto:${developerEmail}?subject=${encodedSubject}&body=${encodedBody}`

        resetForm()
        onClose()

        const openedWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer')
        if (!openedWindow) {
            window.location.href = targetUrl
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Get Help</DialogTitle>
                    <DialogDescription>
                        Send a support request to the developer.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Title"
                        placeholder="What's the issue?"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <Textarea
                        label="Message"
                        placeholder="Describe your problem..."
                        required
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={channel === 'email' ? 'default' : 'outline'}
                            onClick={() => setChannel('email')}
                            className="flex-1 gap-2"
                        >
                            <Mail size={16} />
                            Email
                        </Button>
                        <Button
                            type="button"
                            variant={channel === 'whatsapp' ? 'default' : 'outline'}
                            onClick={() => setChannel('whatsapp')}
                            className="flex-1 gap-2"
                        >
                            <MessageCircle size={16} />
                            WhatsApp
                        </Button>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Send via {channel === 'email' ? 'Email' : 'WhatsApp'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}