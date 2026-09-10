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
