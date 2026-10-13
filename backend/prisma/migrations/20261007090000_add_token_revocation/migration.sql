-- AlterTable
ALTER TABLE "users" ADD COLUMN "tokens_valid_after" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "rotated_at" TIMESTAMP(3);
