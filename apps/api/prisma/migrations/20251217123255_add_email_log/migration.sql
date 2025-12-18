-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed');

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT,
    "message_id" VARCHAR(255),
    "template" VARCHAR(100) NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "bounce_type" VARCHAR(50),
    "complained_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_message_id_key" ON "email_logs"("message_id");

-- CreateIndex
CREATE INDEX "email_logs_hotel_id_idx" ON "email_logs"("hotel_id");

-- CreateIndex
CREATE INDEX "email_logs_message_id_idx" ON "email_logs"("message_id");

-- CreateIndex
CREATE INDEX "email_logs_recipient_idx" ON "email_logs"("recipient");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at");
