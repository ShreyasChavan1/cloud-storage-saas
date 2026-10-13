import { sessionRepository } from '../repositories/session.repository'
import { passwordResetTokenRepository } from '../repositories/passwordResetToken.repository'
import { emailVerificationTokenRepository } from '../repositories/emailVerificationToken.repository'
import { logger } from '../config/logger'

// Rotated refresh-token rows are kept this long so a replayed (stolen) token
// is still recognised as reuse rather than as an unknown token.
export const ROTATED_SESSION_RETENTION_MS = 24 * 60 * 60 * 1000

export async function runAuthCleanup(): Promise<void> {
  try {
    const [sessions, resets, verifications] = await Promise.all([
      sessionRepository.deleteStale(ROTATED_SESSION_RETENTION_MS),
      passwordResetTokenRepository.deleteExpired(),
      emailVerificationTokenRepository.deleteExpired(),
    ])
    logger.info(
      { sessions: sessions.count, resetTokens: resets.count, verificationTokens: verifications.count },
      'Auth cleanup complete'
    )
  } catch (err) {
    logger.error({ err }, 'Auth cleanup failed')
  }
}
