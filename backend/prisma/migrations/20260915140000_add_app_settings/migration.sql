-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "support_email" TEXT NOT NULL,
    "support_phone" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the initial owner contact details directly in the migration (rather
-- than requiring `npm run prisma:seed` to be re-run) so this row exists
-- the moment the migration is applied, in every environment.
INSERT INTO "app_settings" ("id", "support_email", "support_phone", "updated_at")
VALUES ('singleton', 'hrishikeshdalvi0504@gmail.com', '9168598659', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
