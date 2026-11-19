-- CreateEnum
CREATE TYPE "AiKind" AS ENUM ('PROGRAM', 'INSIGHT');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('PENDING', 'DONE', 'FAILED', 'APPLIED', 'DISCARDED');

-- AlterTable
ALTER TABLE "FitnessPrefs" ADD COLUMN     "aiWeeklyInsights" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiConsentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AiKind" NOT NULL,
    "status" "AiStatus" NOT NULL DEFAULT 'PENDING',
    "weekStart" DATE,
    "facts" JSONB,
    "result" JSONB,
    "error" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRequest_userId_kind_createdAt_idx" ON "AiRequest"("userId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "AiRequest_createdAt_idx" ON "AiRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiRequest_userId_kind_weekStart_key" ON "AiRequest"("userId", "kind", "weekStart");

-- AddForeignKey
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
