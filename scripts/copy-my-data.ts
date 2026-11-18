/**
 * Copia o histórico de treino e peso de UMA pessoa do banco do MYGLOW para o FitnessClub (opcional, uma vez).
 *
 *   MYGLOW_DATABASE_URL=… DATABASE_URL=… npx tsx scripts/copy-my-data.ts --email a@exemplo.com          (simulação)
 *   MYGLOW_DATABASE_URL=… DATABASE_URL=… npx tsx scripts/copy-my-data.ts --email a@exemplo.com --apply  (grava)
 *
 * - As duas ligações são postas pela própria pessoa no terminal (nunca no repositório nem no chat). A do MYGLOW
 *   só é lida: usar, de preferência, um utilizador só de leitura.
 * - A conta tem de existir já no FitnessClub com o mesmo email (registo normal: palavra-passe e consentimento
 *   próprios). Os dados passam a pertencer a essa conta; os ids de programas, treinos, sessões, séries e
 *   exercícios próprios mantêm-se. Os exercícios da biblioteca vêm do seed (mesmos ids): correr o seed antes.
 * - Idempotente (`skipDuplicates`): correr de novo não duplica. Peso e meta só com o consentimento de saúde
 *   dado no FitnessClub.
 */
import { PrismaClient } from '@prisma/client';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('--email')?.trim().toLowerCase();
  const apply = process.argv.includes('--apply');
  const fromUrl = process.env.MYGLOW_DATABASE_URL;
  const toUrl = process.env.DATABASE_URL;
  if (!email) throw new Error('Falta --email.');
  if (!fromUrl || !toUrl) throw new Error('Faltam MYGLOW_DATABASE_URL e/ou DATABASE_URL.');
  if (fromUrl === toUrl) throw new Error('MYGLOW_DATABASE_URL e DATABASE_URL são iguais.');

  // Os modelos do treino e do peso têm as mesmas tabelas e colunas nos dois bancos; do User só se lêem colunas comuns.
  const from = new PrismaClient({ datasources: { db: { url: fromUrl } } });
  const to = new PrismaClient({ datasources: { db: { url: toUrl } } });
  try {
    const src = await from.user.findUnique({ where: { email }, select: { id: true } });
    if (!src) throw new Error(`Não há conta ${email} no MYGLOW.`);
    const dst = await to.user.findUnique({ where: { email }, select: { id: true, wellbeingConsentAt: true } });
    if (!dst) throw new Error(`Cria primeiro a conta ${email} no FitnessClub (registo normal).`);
    const uid = dst.id;

    const [prefs, custom, programs, sessions, weights, goal] = await Promise.all([
      from.fitnessPrefs.findUnique({ where: { userId: src.id } }),
      from.exercise.findMany({ where: { ownerId: src.id, source: 'CUSTOM' } }),
      from.fitnessProgram.findMany({ where: { userId: src.id }, include: { workouts: { include: { items: true } } } }),
      from.fitnessSession.findMany({ where: { userId: src.id }, include: { sets: true } }),
      from.bodyWeightEntry.findMany({ where: { userId: src.id } }),
      from.bodyGoal.findUnique({ where: { userId: src.id } }),
    ]);
    const workouts = programs.flatMap((p) => p.workouts);
    const items = workouts.flatMap((w) => w.items);
    const sets = sessions.flatMap((s) => s.sets);

    // Exercícios usados que não são próprios têm de existir no destino (seed da biblioteca).
    const customIds = new Set(custom.map((e) => e.id));
    const needed = [...new Set([...items.map((i) => i.exerciseId), ...sets.map((s) => s.exerciseId)])].filter((id) => !customIds.has(id));
    const present = new Set((await to.exercise.findMany({ where: { id: { in: needed } }, select: { id: true } })).map((e) => e.id));
    const missing = needed.filter((id) => !present.has(id));
    if (missing.length) throw new Error(`Exercícios da biblioteca em falta no FitnessClub (correr o seed): ${missing.slice(0, 10).join(', ')}`);

    const withHealth = !!dst.wellbeingConsentAt;
    console.log(`[copy] ${email}: ${custom.length} exercícios próprios, ${programs.length} programas, ${workouts.length} treinos, ${items.length} itens, ${sessions.length} sessões, ${sets.length} séries, ${weights.length} pesagens${goal ? ', meta' : ''}${prefs ? ', preferências' : ''}`);
    if (!withHealth && (weights.length || goal)) console.log('[copy] Sem consentimento de dados de saúde no FitnessClub: o peso e a meta ficam de fora.');
    if (!apply) {
      console.log('[copy] Simulação: nada foi gravado. Correr de novo com --apply.');
      return;
    }

    await to.$transaction(async (tx) => {
      if (prefs) {
        const { userId: _u, ...p } = prefs;
        await tx.fitnessPrefs.upsert({ where: { userId: uid }, create: { ...p, userId: uid }, update: p });
      }
      await tx.exercise.createMany({
        data: custom.map((e) => ({ ...e, ownerId: uid, names: e.names ?? {}, instructions: e.instructions ?? undefined })),
        skipDuplicates: true,
      });
      await tx.fitnessProgram.createMany({ data: programs.map(({ workouts: _w, ...p }) => ({ ...p, userId: uid })), skipDuplicates: true });
      await tx.fitnessWorkout.createMany({ data: workouts.map(({ items: _i, ...w }) => ({ ...w, userId: uid })), skipDuplicates: true });
      await tx.workoutItem.createMany({ data: items, skipDuplicates: true });
      await tx.fitnessSession.createMany({
        // Uma sessão que ficou aberta no MYGLOW chega fechada (sem descanso em curso).
        data: sessions.map(({ sets: _s, ...s }) => ({ ...s, userId: uid, endedAt: s.endedAt ?? s.startedAt, restEndsAt: null, restExerciseId: null, clientHidden: false })),
        skipDuplicates: true,
      });
      await tx.sessionSet.createMany({ data: sets.map((s) => ({ ...s, userId: uid })), skipDuplicates: true });
      if (withHealth) {
        await tx.bodyWeightEntry.createMany({ data: weights.map((w) => ({ ...w, userId: uid })), skipDuplicates: true });
        if (goal) {
          const { userId: _u, ...g } = goal;
          await tx.bodyGoal.upsert({ where: { userId: uid }, create: { ...g, userId: uid }, update: g });
        }
      }
    }, { timeout: 120_000 });
    console.log('[copy] Feito.');
  } finally {
    await Promise.all([from.$disconnect(), to.$disconnect()]);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
