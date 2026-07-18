# Migrating from Phase 2 → Phase 3

If your database still has the old Phase 2 shape (`users.plan` as an enum,
`refresh_tokens` table), the normal path is simplest:

```bash
cd backend
npx prisma migrate dev --name phase3_billing_schema
npm run prisma:seed
```

Prisma will detect the schema diff and generate the right migration SQL for
you (drops the old `plan` enum column, adds `plan_id`/`role`/`nextcloud_username`,
renames `refresh_tokens` → `sessions` and drops its `revoked_at`/`token_hash`
columns in favor of `refresh_token`).

**If you have real user data you need to keep** (not just dev/test rows),
`prisma migrate dev` will refuse to silently drop the `plan` column — it'll
show you the generated SQL and ask for confirmation, or in some cases ask to
reset the database. Review the generated migration file under
`prisma/migrations/` before confirming. In particular, existing users won't
have a `plan_id` until you either:

1. Run `npm run prisma:seed` first (so the `plans` table has rows to point to), then
2. Backfill each user's `plan_id` based on their old `plan` enum value, e.g.:

```sql
UPDATE users SET plan_id = (SELECT id FROM plans WHERE name = 'Free')
WHERE plan_id IS NULL;
```

For a throwaway dev database (which is almost certainly what you have right
now, given this is still early Phase 2/3 development), it's simpler to just
reset:

```bash
npx prisma migrate reset
npm run prisma:seed
```

This drops and recreates every table from the current schema, then reloads
the three plans. You'll need to re-register your test account afterward.
