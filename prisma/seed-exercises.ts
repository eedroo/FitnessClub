/**
 * Biblioteca de exercícios na base: upsert de todos os exercícios LIBRARY a partir de
 * `content/exercises/{source/exercises.json, images.json, i18n/*.json}` e dos próprios em
 * `content/exercises/extra/exercises.json`. Nunca toca nos CUSTOM.
 * Corre em cada deploy (`vercel-build`) e à mão com `npm run seed:exercises`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { extraToExerciseRow, toExerciseRow, type ExtraExerciseItem, type FreeExerciseDbItem, type I18nItem } from '../src/lib/fitness/library';

const ROOT = path.join(process.cwd(), 'content', 'exercises');
const read = <T>(p: string, fallback: T): T => (fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')) as T) : fallback);
const CHUNK = 50;

async function main() {
  const db = new PrismaClient();
  const source = read<FreeExerciseDbItem[]>(path.join(ROOT, 'source', 'exercises.json'), []);
  const images = read<Record<string, string[]>>(path.join(ROOT, 'images.json'), {});
  const ptPT = read<Record<string, I18nItem>>(path.join(ROOT, 'i18n', 'pt-PT.json'), {});
  const ptBR = read<Record<string, I18nItem>>(path.join(ROOT, 'i18n', 'pt-BR.json'), {});

  const extra = read<ExtraExerciseItem[]>(path.join(ROOT, 'extra', 'exercises.json'), []);

  const rows = [
    ...source.map((s) => toExerciseRow(s, images[s.id] ?? [], { ptPT: ptPT[s.id], ptBR: ptBR[s.id] })),
    ...extra.map((e) => extraToExerciseRow(e, images[e.id] ?? [])),
  ];
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.$transaction(
      rows.slice(i, i + CHUNK).map((row) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, source: _s, ...update } = row;
        return db.exercise.upsert({ where: { id }, create: row, update });
      }),
    );
  }
  console.log(`[seed-exercises] ${rows.length} exercícios (${extra.length} próprios, ${Object.keys(images).length} com imagens, ${Object.keys(ptPT).length} pt-PT, ${Object.keys(ptBR).length} pt-BR)`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
