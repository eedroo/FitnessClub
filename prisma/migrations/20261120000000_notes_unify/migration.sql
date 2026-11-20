-- Uma só nota por exercício (a da pessoa ou a da IA): as notas que a IA tinha posto nos itens dos treinos passam para
-- as notas do exercício (só onde a pessoa ainda não tem nota) e saem dos itens.
INSERT INTO "ExerciseNote" ("userId", "exerciseId", "text", "byAi", "updatedAt")
SELECT DISTINCT ON (w."userId", i."exerciseId") w."userId", i."exerciseId", i."notes", true, NOW()
FROM "WorkoutItem" i
JOIN "FitnessWorkout" w ON w."id" = i."workoutId"
WHERE i."notes" IS NOT NULL AND btrim(i."notes") <> ''
ORDER BY w."userId", i."exerciseId", i."id"
ON CONFLICT ("userId", "exerciseId") DO NOTHING;

UPDATE "WorkoutItem" SET "notes" = NULL WHERE "notes" IS NOT NULL;
