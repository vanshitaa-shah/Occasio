-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'PENDING',
    "design" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Card_status_sendAt_idx" ON "Card"("status", "sendAt");
