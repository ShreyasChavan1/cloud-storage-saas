-- Real Razorpay Subscriptions / autopay support
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING';

CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'HALTED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

CREATE TABLE "billing_subscriptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "razorpay_subscription_id" TEXT NOT NULL,
  "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'CREATED',
  "current_start" TIMESTAMP(3),
  "current_end" TIMESTAMP(3),
  "charge_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "subscription_id" TEXT,
  CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscriptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_subscriptions_razorpay_subscription_id_key" ON "billing_subscriptions"("razorpay_subscription_id");
CREATE INDEX "billing_subscriptions_user_id_idx" ON "billing_subscriptions"("user_id");
CREATE INDEX "billing_subscriptions_plan_id_idx" ON "billing_subscriptions"("plan_id");

ALTER TABLE "payments" ADD COLUMN "billing_subscription_id" TEXT;
CREATE INDEX "payments_billing_subscription_id_idx" ON "payments"("billing_subscription_id");
ALTER TABLE "payments" ADD CONSTRAINT "payments_billing_subscription_id_fkey" FOREIGN KEY ("billing_subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
