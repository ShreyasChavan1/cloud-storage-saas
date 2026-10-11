CREATE TYPE "ClientFormStatus" AS ENUM ('NEW', 'IN_REVIEW', 'PROPOSAL_SENT', 'CLOSED');
CREATE TYPE "ClientFormPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "agreement_acceptances" ("id" TEXT NOT NULL,"user_id" TEXT NOT NULL,"agreement_version" TEXT NOT NULL,"email" TEXT NOT NULL,"event" TEXT NOT NULL DEFAULT 'REGISTRATION',"ip_address" TEXT,"user_agent" TEXT,"accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "agreement_acceptances_pkey" PRIMARY KEY ("id"));
CREATE INDEX "agreement_acceptances_user_id_idx" ON "agreement_acceptances"("user_id");
ALTER TABLE "agreement_acceptances" ADD CONSTRAINT "agreement_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "client_requirement_forms" ("id" TEXT NOT NULL,"status" "ClientFormStatus" NOT NULL DEFAULT 'NEW',"company_name" TEXT NOT NULL,"contact_person" TEXT NOT NULL,"designation" TEXT,"mobile" TEXT NOT NULL,"email" TEXT NOT NULL,"industry" TEXT,"city" TEXT,"website" TEXT,"services" TEXT[],"answers" JSONB NOT NULL,"recommended_service" TEXT,"estimated_scope" TEXT,"suggested_architecture" TEXT,"third_party_services" TEXT,"migration_setup" BOOLEAN,"custom_development" BOOLEAN,"proposal_required_by" DATE,"priority" "ClientFormPriority" NOT NULL DEFAULT 'NORMAL',"technical_notes" TEXT,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL,CONSTRAINT "client_requirement_forms_pkey" PRIMARY KEY ("id"));
CREATE INDEX "client_requirement_forms_status_created_at_idx" ON "client_requirement_forms"("status", "created_at");
