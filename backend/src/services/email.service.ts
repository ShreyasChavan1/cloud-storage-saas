import { env } from '../config/env'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error('Password reset email delivery is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const safeUrl = escapeHtml(resetUrl)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        subject: 'Reset your Nimbus password',
        text: `We received a request to reset your Nimbus password.\n\nReset your password: ${resetUrl}\n\nThis link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_IN}. If you did not request this, you can ignore this email.`,
        html: `<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827\"><h2>Reset your Nimbus password</h2><p>We received a request to reset your Nimbus password.</p><p><a href=\"${safeUrl}\">Reset your password</a></p><p>This link expires in ${escapeHtml(env.PASSWORD_RESET_TOKEN_EXPIRES_IN)}.</p><p>If you did not request this, you can ignore this email.</p></div>`,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Email delivery failed: ${response.status} ${detail.slice(0, 500)}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendEmailVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error('Email verification delivery is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const safeUrl = escapeHtml(verificationUrl)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        subject: 'Verify your Nimbus email address',
        text: `Welcome to Nimbus. Verify your email address: ${verificationUrl}\n\nThis link expires in ${env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN}. If you did not create this account, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>Verify your Nimbus email</h2><p>Thanks for creating a Nimbus account. Click below to verify your email address.</p><p><a href="${safeUrl}">Verify email address</a></p><p>This link expires in ${escapeHtml(env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN)}.</p><p>If you did not create this account, you can ignore this email.</p></div>`,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Email delivery failed: ${response.status} ${detail.slice(0, 500)}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendSupportRequestEmail(params: {
  toEmail: string
  fromName: string
  fromEmail: string
  subject: string
  message: string
}): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error('Support email delivery is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const safeName = escapeHtml(params.fromName)
    const safeSubject = escapeHtml(params.subject)
    // Message is user-typed free text, shown as HTML below - escape it,
    // then turn newlines into <br> so paragraph breaks survive rendering
    // (escapeHtml runs first so a literal '\n' in the text can't be used
    // to smuggle in a raw '<br>' of the sender's own).
    const safeMessageHtml = escapeHtml(params.message).replaceAll('\n', '<br>')
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [params.toEmail],
        reply_to: params.fromEmail,
        subject: `[Nimbus Support] ${params.subject}`,
        text: `From: ${params.fromName} <${params.fromEmail}>\n\n${params.message}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>New support message</h2><p><strong>From:</strong> ${safeName} &lt;${escapeHtml(params.fromEmail)}&gt;</p><p><strong>Subject:</strong> ${safeSubject}</p><hr style="border:none;border-top:1px solid #e5e7eb" /><p>${safeMessageHtml}</p></div>`,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Email delivery failed: ${response.status} ${detail.slice(0, 500)}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}
