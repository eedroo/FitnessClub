-- Ranking semanal por ligas: sair do ranking e o pódio de cada semana.
ALTER TABLE "SocialProfile" ADD COLUMN "inRanking" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "LeagueResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "league" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeagueResult_userId_weekStart_key" ON "LeagueResult"("userId", "weekStart");
CREATE INDEX "LeagueResult_weekStart_idx" ON "LeagueResult"("weekStart");

ALTER TABLE "LeagueResult" ADD CONSTRAINT "LeagueResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Publicações em carrossel: a foto na capa e o treino, dia ou conquista no slide seguinte.
ALTER TABLE "Post" ADD COLUMN "carousel" BOOLEAN NOT NULL DEFAULT false;
