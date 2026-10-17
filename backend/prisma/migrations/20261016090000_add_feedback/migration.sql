CREATE TABLE "feedback" ("id" TEXT NOT NULL,"rating" INTEGER NOT NULL,"description" TEXT NOT NULL,"email" TEXT,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),CONSTRAINT "feedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5));
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");
CREATE INDEX "feedback_rating_idx" ON "feedback"("rating");
