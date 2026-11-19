-- CreateEnum
CREATE TYPE "TrainingLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateTable
CREATE TABLE "TrainingProfile" (
    "userId" TEXT NOT NULL,
    "goals" TEXT[],
    "level" "TrainingLevel" NOT NULL DEFAULT 'BEGINNER',
    "equipment" TEXT[],
    "focusMuscles" TEXT[],
    "trainingDays" INTEGER[],
    "sessionMinutes" INTEGER,
    "wishes" TEXT,
    "avoid" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProfile_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "TrainingProfile" ADD CONSTRAINT "TrainingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

