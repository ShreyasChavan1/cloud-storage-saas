import { useEffect, useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAdminSupportContact } from '@/hooks/useAdminUsers'
import { useUpdateSupportContact } from '@/hooks/useAdminMutations'
import { useToast } from '@/context/ToastContext'

export function SupportContactCard() {
  const { showToast } = useToast()
  const { data: contact, isLoading } = useAdminSupportContact()
  const updateContact = useUpdateSupportContact()

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (contact) {
      setEmail(contact.email)
      setPhone(contact.phone)
    }
  }, [contact])

  const dirty = contact ? email !== contact.email || phone !== contact.phone : false

  const handleSave = () => {
    updateContact.mutate(
      { email: email.trim(), phone: phone.trim() },
      {
        onSuccess: () => showToast('Support contact details updated.'),
        onError: () => showToast('Could not update support contact details.', 'error'),
      }
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <LifeBuoy className="h-4 w-4" />
        Support contact details
      </div>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
        Shown on the Support page, and used as the destination for messages sent from that page's form.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input
          label="Support email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <Input
          label="Support phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button
        size="sm"
        className="mt-4"
        onClick={handleSave}
        loading={updateContact.isPending}
        disabled={!dirty || updateContact.isPending || !email.trim() || !phone.trim()}
      >
        Save
      </Button>
    </Card>
  )
}
