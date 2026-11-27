-- Aviso «um amigo treinou» e a preferência para o desligar.
ALTER TYPE "NotificationKind" ADD VALUE 'FRIEND_WORKOUT';
ALTER TABLE "FitnessPrefs" ADD COLUMN "notifyFriendWorkouts" BOOLEAN NOT NULL DEFAULT true;
