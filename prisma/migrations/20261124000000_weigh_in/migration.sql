-- Lembrete de pesagem: nunca, todos os dias ou uma vez por semana (pop-up ao abrir a app).
CREATE TYPE "WeighInFrequency" AS ENUM ('OFF', 'DAILY', 'WEEKLY');

ALTER TABLE "FitnessPrefs" ADD COLUMN "weighInFrequency" "WeighInFrequency" NOT NULL DEFAULT 'OFF';

-- Quem já tinha o lembrete ligado passa a diário.
UPDATE "FitnessPrefs" SET "weighInFrequency" = 'DAILY' WHERE "weighInReminder" = true;

-- Tour de boas-vindas do app (destaques por separador): visto ou saltado.
ALTER TABLE "FitnessPrefs" ADD COLUMN "tourDoneAt" TIMESTAMP(3);
