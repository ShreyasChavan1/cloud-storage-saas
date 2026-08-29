-- DropIndex
DROP INDEX "subscriptions_user_id_idx";

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "quota_synced_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "plan_id" TEXT,
ADD COLUMN     "provider_order_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_order_id_key" ON "payments"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_plan_id_idx" ON "payments"("plan_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
