import { appSettingsRepository } from '../repositories/appSettings.repository'
import { userRepository } from '../repositories/user.repository'
import { sendSupportRequestEmail } from './email.service'
import { ApiError } from '../utils/ApiError'
import { logger } from '../config/logger'
import { SendSupportMessageInput, UpdateSupportContactInput } from '../validators/support.validator'

// Only used if the app_settings row somehow doesn't exist yet (a database
// restored from before this migration, a migration skipped in some
// environment, etc.) — the migration itself already seeds these same
// values, so in the normal case this fallback never actually fires.
const FALLBACK_SUPPORT_EMAIL = 'hrishikeshdalvi0504@gmail.com'
const FALLBACK_SUPPORT_PHONE = '9168598659'

async function resolveContact(): Promise<{ email: string; phone: string }> {
  const settings = await appSettingsRepository.get()
  return {
    email: settings?.supportEmail ?? FALLBACK_SUPPORT_EMAIL,
    phone: settings?.supportPhone ?? FALLBACK_SUPPORT_PHONE,
  }
}

export const supportService = {
  getContact: resolveContact,

  // Admin-only (see admin.routes.ts) — the whole reason this lives in the
  // database instead of an env var is so it's editable here without a
  // redeploy.
  async updateContact(input: UpdateSupportContactInput): Promise<{ email: string; phone: string }> {
    const updated = await appSettingsRepository.upsert({ supportEmail: input.email, supportPhone: input.phone })
    return { email: updated.supportEmail, phone: updated.supportPhone }
  },

  async sendMessage(userId: string, input: SendSupportMessageInput): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('User not found')

    const contact = await resolveContact()
    try {
      await sendSupportRequestEmail({
        toEmail: contact.email,
        fromName: user.name,
        fromEmail: user.email,
        subject: input.subject,
        message: input.message,
      })
    } catch (err) {
      logger.error({ err, userId }, 'Support message delivery failed')
      throw ApiError.serviceUnavailable(
        'Could not send your message right now. Please try again, or reach out using the contact details above.'
      )
    }
  },
}
