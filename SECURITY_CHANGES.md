# Security hardening — what changed and what you must do

## Deploy checklist (in order)
1. **Set `NODE_ENV` explicitly** everywhere (`production` on the server). The app now refuses to boot without it.
2. **Set `TRUST_PROXY_HOPS`** (1 behind Railway/Render/nginx, 0 if directly exposed). Previously every user behind the proxy shared one rate-limit bucket.
3. In production, `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` must be >=32 random chars, different from each other, and not placeholders — otherwise boot fails.
4. `cd backend && npx prisma migrate deploy` (adds `users.tokens_valid_after`, `sessions.rotated_at`).
5. Deploy. Existing sessions keep working.
6. Back up the DB, then migrate legacy Nextcloud accounts:
   `npx tsx scripts/decouple-nextcloud-passwords.ts` (dry run) then `... --apply`.
7. Rotate the Neon DB password if the old `.env.example` value was ever committed (git history keeps it).

## Behaviour changes to be aware of
- Password change/reset now ends **all** sessions immediately, including the current one (the user must log in again).
- Reset-password also marks the email verified (receiving the mail proves mailbox control).
- New passwords need a letter and a digit (Nextcloud used to be the only place strength was enforced).
- `forgot-password` / `resend-verification` return instantly and send mail in the background; 3 mails per address per hour.
- `..` segments, backslashes and control characters in file paths are rejected with 400 (previously `..` was silently clamped).
- `DELETE /api/users/me` `{ password }` deletes the account (cancels Razorpay autopay, deletes Nextcloud account first).

## Added after reviewing your latest zip (agreements + client forms)
- Re-applied on top of the new features; the only real conflicts were additive (registration agreement fields, `clientFormRateLimiter`) and both sides were kept.
- New public `POST /api/client-forms` is size-capped, validated and rate-limited (10/hour/IP, correct per-client now that `TRUST_PROXY_HOPS` is set), and the global limiter covers it. It has no CAPTCHA, so determined spam will still land in the admin list.
- Admin client-form routes sit behind `requireAuth` + `requireAdmin`; the submitted `website` is stored but never rendered as a link.
- Your WebDAV trash change now passes the trash id to the library un-encoded; the new id validation (`isSafeSegmentId`) is what stops a crafted id with `/` or `..` from re-pointing that request, so keep it.
- **Conflict to decide:** `agreement_acceptances` cascades on user delete, so self-service/admin deletion erases the acceptance evidence your agreement says should be retained. Same for payments. Consider anonymising instead of hard-deleting.

## Known limits / not done
- Rate-limit counters are in-memory per process; with >1 instance use a shared store.
- Admin accounts use the same 15-minute JWT as users: no MFA, no separate admin session, no audit log.
- Deleting a user cascades to their Payment/Subscription rows. Check invoice-retention obligations before relying on it.
- `backend/package-lock.json` is out of sync with `package.json` (`@aws-sdk/client-s3`), so `npm ci` fails — run `npm install` and commit the lock.
- Four pre-existing unit tests fail on the original code too (admin `listUsers`/`createUser`, two reconciliation tests) and are untouched.
