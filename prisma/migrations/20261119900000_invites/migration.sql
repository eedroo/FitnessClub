-- CreateEnum
CREATE TYPE "InviteVisibility" AS ENUM ('PUBLIC', 'FRIENDS', 'DIRECT');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('INVITED', 'REQUESTED', 'GOING', 'DECLINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SocialNoticeKind" ADD VALUE 'INVITE';
ALTER TYPE "SocialNoticeKind" ADD VALUE 'INVITE_REQUEST';
ALTER TYPE "SocialNoticeKind" ADD VALUE 'INVITE_ACCEPTED';

-- AlterTable
ALTER TABLE "SocialNotice" ADD COLUMN     "inviteId" TEXT;

-- CreateTable
CREATE TABLE "WorkoutInvite" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activityType" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER,
    "placeName" TEXT NOT NULL,
    "placeLat" DOUBLE PRECISION NOT NULL,
    "placeLng" DOUBLE PRECISION NOT NULL,
    "visibility" "InviteVisibility" NOT NULL DEFAULT 'FRIENDS',
    "maxPeople" INTEGER,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteGuest" (
    "inviteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GuestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteGuest_pkey" PRIMARY KEY ("inviteId","userId")
);

-- CreateIndex
CREATE INDEX "WorkoutInvite_startsAt_idx" ON "WorkoutInvite"("startsAt");

-- CreateIndex
CREATE INDEX "WorkoutInvite_hostId_startsAt_idx" ON "WorkoutInvite"("hostId", "startsAt");

-- CreateIndex
CREATE INDEX "InviteGuest_userId_status_idx" ON "InviteGuest"("userId", "status");

-- AddForeignKey
ALTER TABLE "WorkoutInvite" ADD CONSTRAINT "WorkoutInvite_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteGuest" ADD CONSTRAINT "InviteGuest_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "WorkoutInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteGuest" ADD CONSTRAINT "InviteGuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
