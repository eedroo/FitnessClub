-- AlterTable
ALTER TABLE "FitnessProgram" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "notesByAi" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FitnessWorkout" ADD COLUMN     "notesByAi" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExerciseNote" (
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "byAi" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseNote_pkey" PRIMARY KEY ("userId","exerciseId")
);

-- AddForeignKey
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

