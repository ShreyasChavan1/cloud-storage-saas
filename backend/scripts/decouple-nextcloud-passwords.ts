/**
 * One-off migration: stop Nextcloud accounts from sharing the user's Nimbus
 * password.
 *
 * Before this change, registration passed the user's real password to
 * Nextcloud, so every existing Nextcloud account has that password as its
 * login. New accounts already get an independent random secret. This script
 * brings existing accounts in line by giving each one a fresh random
 * Nextcloud password and re-minting its WebDAV app password, which is stored
 * (encrypted) exactly like before.
 *
 * It needs no user input: the agent's change-password operation sets the
 * Nextcloud password without knowing the old one.
 *
 *   npx tsx scripts/decouple-nextcloud-passwords.ts            # dry run (default)
 *   npx tsx scripts/decouple-nextcloud-passwords.ts --apply    # do it
 *
 * Safe to re-run (it just rotates again). Back up the database first. If a
 * user's DB update fails after Nextcloud was changed, their storage
 * connection can be fixed from Settings via the existing "repair" action.
 */
import { prisma } from '../src/database/prisma'
import { nextcloudService } from '../src/services/NextcloudService'
import { encrypt } from '../src/utils/encryption'
import { generateStorageSecret } from '../src/utils/token'

const apply = process.argv.includes('--apply')

async function main() {
  const users = await prisma.user.findMany({
    where: { nextcloudUsername: { not: null } },
    select: { id: true, email: true, nextcloudUsername: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`${apply ? 'APPLYING to' : 'DRY RUN for'} ${users.length} account(s) with a Nextcloud username.`)
  if (!apply) {
    console.log('Nothing will be changed. Re-run with --apply to rotate.')
    return
  }

  let ok = 0
  const failed: string[] = []
  for (const user of users) {
    try {
      const { webdavPassword } = await nextcloudService.changePassword(user.nextcloudUsername!, generateStorageSecret())
      await prisma.user.update({
        where: { id: user.id },
        data: { nextcloudWebdavPasswordEncrypted: encrypt(webdavPassword) },
      })
      ok++
      console.log(`✓ ${user.id}`)
    } catch (err) {
      failed.push(user.id)
      console.error(`✗ ${user.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${ok} rotated, ${failed.length} failed.`)
  if (failed.length) console.log('Failed ids (re-run, or use Settings → repair for each):', failed.join(', '))
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
