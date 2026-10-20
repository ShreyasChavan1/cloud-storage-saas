ALTER TABLE "feedback" ADD COLUMN "user_id" TEXT;
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
