CREATE TYPE "CctvDeviceStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "cctv_devices" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "token_prefix" TEXT NOT NULL,
  "status" "CctvDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
  "last_seen_at" TIMESTAMP(3),
  "last_upload_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cctv_devices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cctv_devices_token_hash_key" ON "cctv_devices"("token_hash");
CREATE INDEX "cctv_devices_user_id_idx" ON "cctv_devices"("user_id");
ALTER TABLE "cctv_devices" ADD CONSTRAINT "cctv_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cctv_uploads" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "size" BIGINT NOT NULL,
  "recorded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cctv_uploads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cctv_uploads_device_id_filename_key" ON "cctv_uploads"("device_id", "filename");
CREATE INDEX "cctv_uploads_device_id_created_at_idx" ON "cctv_uploads"("device_id", "created_at");
ALTER TABLE "cctv_uploads" ADD CONSTRAINT "cctv_uploads_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "cctv_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
