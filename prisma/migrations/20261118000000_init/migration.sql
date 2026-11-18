-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ThemePref" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('PT_PT', 'PT_BR', 'EN');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('MANUAL', 'GIFT', 'PAID');

-- CreateEnum
CREATE TYPE "FeatureRollout" AS ENUM ('HIDDEN', 'PREMIUM', 'ALL');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('REST_DONE');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'EMAIL_CHANGE');

-- CreateEnum
CREATE TYPE "ExerciseSource" AS ENUM ('LIBRARY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExerciseMeasure" AS ENUM ('REPS_WEIGHT', 'REPS', 'DURATION');

-- CreateEnum
CREATE TYPE "ProgramKind" AS ENUM ('STRENGTH', 'STRETCH', 'MIXED');

-- CreateEnum
CREATE TYPE "BodyGoalDirection" AS ENUM ('GAIN', 'MAINTAIN', 'LOSE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'PT_PT',
    "theme" "ThemePref" NOT NULL DEFAULT 'LIGHT',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "onboardedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "termsAcceptedAt" TIMESTAMP(3),
    "termsVersion" TEXT,
    "privacyVersion" TEXT,
    "wellbeingConsentAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planSource" "PlanSource",
    "planSince" TIMESTAMP(3),
    "planExpiresAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "newEmail" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pushed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActiveDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "UserActiveDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL,
    "rollout" "FeatureRollout" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "FeatureOverride" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureOverride_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "source" "ExerciseSource" NOT NULL,
    "ownerId" TEXT,
    "names" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "measure" "ExerciseMeasure" NOT NULL,
    "primaryMuscles" TEXT[],
    "secondaryMuscles" TEXT[],
    "equipment" TEXT,
    "level" TEXT,
    "instructions" JSONB,
    "images" TEXT[],
    "defaultRestSec" INTEGER,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessPrefs" (
    "userId" TEXT NOT NULL,
    "defaultRestSec" INTEGER NOT NULL DEFAULT 90,
    "restAlert" BOOLEAN NOT NULL DEFAULT true,
    "keepAwake" BOOLEAN NOT NULL DEFAULT true,
    "weighInReminder" BOOLEAN NOT NULL DEFAULT false,
    "weighInTime" TEXT NOT NULL DEFAULT '08:00',
    "onboardedAt" TIMESTAMP(3),

    CONSTRAINT "FitnessPrefs_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FitnessProgram" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "ProgramKind" NOT NULL DEFAULT 'STRENGTH',
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitnessProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessWorkout" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "FitnessWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutItem" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER,
    "targetRepsMin" INTEGER,
    "targetRepsMax" INTEGER,
    "targetSec" INTEGER,
    "restSec" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WorkoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workoutId" TEXT,
    "date" DATE NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "restEndsAt" TIMESTAMP(3),
    "restExerciseId" TEXT,
    "clientHidden" BOOLEAN NOT NULL DEFAULT false,
    "extraExercises" TEXT[],
    "notes" TEXT,

    CONSTRAINT "FitnessSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "reps" INTEGER,
    "weightGrams" INTEGER,
    "durationSec" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "restSec" INTEGER,
    "prKinds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "SessionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyWeightEntry" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "grams" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyWeightEntry_pkey" PRIMARY KEY ("userId","date")
);

-- CreateTable
CREATE TABLE "BodyGoal" (
    "userId" TEXT NOT NULL,
    "direction" "BodyGoalDirection" NOT NULL,
    "weeklyRateGrams" INTEGER NOT NULL,
    "targetGrams" INTEGER,
    "startGrams" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyGoal_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_sentAt_idx" ON "NotificationLog"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_userId_kind_periodKey_key" ON "NotificationLog"("userId", "kind", "periodKey");

-- CreateIndex
CREATE INDEX "UserActiveDay_day_idx" ON "UserActiveDay"("day");

-- CreateIndex
CREATE INDEX "Exercise_ownerId_idx" ON "Exercise"("ownerId");

-- CreateIndex
CREATE INDEX "FitnessProgram_userId_idx" ON "FitnessProgram"("userId");

-- CreateIndex
CREATE INDEX "FitnessWorkout_userId_idx" ON "FitnessWorkout"("userId");

-- CreateIndex
CREATE INDEX "WorkoutItem_workoutId_idx" ON "WorkoutItem"("workoutId");

-- CreateIndex
CREATE INDEX "FitnessSession_userId_startedAt_idx" ON "FitnessSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "SessionSet_userId_exerciseId_completedAt_idx" ON "SessionSet"("userId", "exerciseId", "completedAt");

-- CreateIndex
CREATE INDEX "SessionSet_sessionId_idx" ON "SessionSet"("sessionId");

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActiveDay" ADD CONSTRAINT "UserActiveDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureOverride" ADD CONSTRAINT "FeatureOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessPrefs" ADD CONSTRAINT "FitnessPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessProgram" ADD CONSTRAINT "FitnessProgram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessWorkout" ADD CONSTRAINT "FitnessWorkout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "FitnessProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutItem" ADD CONSTRAINT "WorkoutItem_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "FitnessWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutItem" ADD CONSTRAINT "WorkoutItem_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessSession" ADD CONSTRAINT "FitnessSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessSession" ADD CONSTRAINT "FitnessSession_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "FitnessWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FitnessSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyWeightEntry" ADD CONSTRAINT "BodyWeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyGoal" ADD CONSTRAINT "BodyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

