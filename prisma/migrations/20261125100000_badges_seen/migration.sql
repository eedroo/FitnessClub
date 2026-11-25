-- Pop-up de emblema novo: os emblemas já celebrados e a última verificação.
ALTER TABLE "FitnessPrefs" ADD COLUMN "badgesSeen" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "FitnessPrefs" ADD COLUMN "badgesSeenAt" TIMESTAMP(3);
