ALTER TYPE "CctvDeviceStatus" ADD VALUE IF NOT EXISTS 'PROVISIONING';
ALTER TABLE "cctv_devices"
  ALTER COLUMN "token_hash" DROP NOT NULL,
  ADD COLUMN "enrollment_code_hash" TEXT,
  ADD COLUMN "enrollment_expires_at" TIMESTAMP(3),
  ADD COLUMN "gateway_id" TEXT,
  ADD COLUMN "nvr_host" TEXT,
  ADD COLUMN "nvr_username" TEXT,
  ADD COLUMN "nvr_password_encrypted" TEXT,
  ADD COLUMN "cameras_json" TEXT,
  ADD COLUMN "segment_seconds" INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN "upload_poll_seconds" INTEGER NOT NULL DEFAULT 15;
CREATE UNIQUE INDEX "cctv_devices_enrollment_code_hash_key" ON "cctv_devices"("enrollment_code_hash");
