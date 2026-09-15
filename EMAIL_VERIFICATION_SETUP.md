# Nimbus email verification update

This update adds mandatory email verification for self-registration, keeps the requested phone number field, exposes phone/email verification status to admins, and removes the admin password-reset action/API.

## Production environment
Set these on Railway:

- `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN=30m`
- `CLIENT_EMAIL_VERIFICATION_URL=https://www.dv-technologies.in/verify-email`

The existing `RESEND_API_KEY` and `EMAIL_FROM` are reused.

## Database
From `backend` after setting `DATABASE_URL`:

```bash
npx prisma generate
npx prisma migrate deploy
```

Existing users are marked as already verified by the migration so the new requirement does not lock existing accounts out.

## Registration behavior

New self-registered accounts receive a verification email and cannot log in until the link is used. Verification automatically creates a normal Nimbus session and redirects the user to the dashboard.
