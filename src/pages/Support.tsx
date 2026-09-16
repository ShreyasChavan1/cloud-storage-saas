import { useEffect, useState } from 'react'
import { LifeBuoy, Mail, Phone, Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { supportApi, SupportContact } from '@/api/support'

export default function Support() {
  const { showToast } = useToast()
  const [contact, setContact] = useState<SupportContact | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    supportApi.getContact().then(setContact).catch(() => showToast('Could not load support contact details.', 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSending(true)
    try {
      await supportApi.sendMessage({ subject: subject.trim(), message: message.trim() })
      showToast('Message sent — we\'ll get back to you soon.')
      setSubject('')
      setMessage('')
    } catch {
      showToast('Could not send your message. Please try again.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900 dark:text-white">Support</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Reach out directly, or send a message below and we'll reply to your account email.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LifeBuoy className="h-4 w-4" />
          Contact us directly
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <a
            href={contact ? `mailto:${contact.email}` : undefined}
            className="flex flex-1 items-center gap-3 rounded-lg border border-line bg-surface-0 px-3.5 py-3 text-sm hover:bg-surface-50 dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-surface2"
          >
            <Mail className="h-4 w-4 text-ink-400" />
            <span className="text-ink-900 dark:text-white">{contact?.email ?? 'Loading...'}</span>
          </a>
          <a
            href={contact ? `tel:${contact.phone}` : undefined}
            className="flex flex-1 items-center gap-3 rounded-lg border border-line bg-surface-0 px-3.5 py-3 text-sm hover:bg-surface-50 dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-surface2"
          >
            <Phone className="h-4 w-4 text-ink-400" />
            <span className="text-ink-900 dark:text-white">{contact?.phone ?? 'Loading...'}</span>
          </a>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Send className="h-4 w-4" />
          Send a message
        </div>
        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <Input
            label="Subject"
            placeholder="What's this about?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="support-message" className="text-sm font-medium text-ink-700 dark:text-ink-300">
              Message
            </label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue or question..."
              maxLength={5000}
              rows={6}
              required
              className="w-full resize-y rounded-xl border border-line bg-surface-0 px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-dark-border dark:bg-dark-surface2 dark:text-white dark:focus:ring-brand-900/40"
            />
          </div>
          <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
            {sending ? 'Sending...' : 'Send message'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
