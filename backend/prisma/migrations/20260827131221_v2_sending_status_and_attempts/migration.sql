-- AlterEnum
ALTER TYPE "CardStatus" ADD VALUE 'SENDING';

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3);
