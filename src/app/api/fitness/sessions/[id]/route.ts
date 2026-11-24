import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { endSessionFor, logSetFor } from '@/lib/fitness/write';

export const dynamic = 'force-dynamic';

const bodySchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('set'), set: z.record(z.unknown()) }),
  z.object({ op: z.literal('hidden'), hidden: z.boolean() }),
  z.object({ op: z.literal('notes'), notes: z.string().max(1000) }),
  // Terminado sem rede: a hora real em que a pessoa terminou.
  z.object({ op: z.literal('end'), endedAt: z.string().datetime() }),
]);

/**
 * Escritas de fundo da sessão: séries da fila sem rede, app em segundo plano, notas e o fim (terminado sem rede). Por `fetch` (ou
 * `sendBeacon` ao esconder) em vez de Server Action: sem rede, um `fetch` falha em silêncio; uma Server Action
 * falhada partia o router e deixava o ecrã de erro até a app ser fechada.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const headers = { 'Cache-Control': 'no-store' };
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return Response.json({ ok: false, error: 'common.errors.unauthorized' }, { status: 401, headers });
  if (!(await getEntitlements(uid)).features['pro']) return Response.json({ ok: false }, { status: 404, headers });
  if (!z.string().min(1).max(191).safeParse(params.id).success) return Response.json({ ok: false }, { status: 400, headers });

  let json: unknown;
  try {
    json = JSON.parse(await req.text()); // sendBeacon envia text/plain
  } catch {
    return Response.json({ ok: false }, { status: 400, headers });
  }
  const p = bodySchema.safeParse(json);
  if (!p.success) return Response.json({ ok: false }, { status: 400, headers });

  if (p.data.op === 'set') return Response.json(await logSetFor(uid, params.id, p.data.set as never), { headers });
  if (p.data.op === 'end') {
    const res = await endSessionFor(uid, params.id, p.data.endedAt);
    if (res.ok) revalidatePath('/', 'layout');
    return Response.json(res, { headers });
  }
  if (p.data.op === 'hidden') {
    await db.fitnessSession.updateMany({ where: { id: params.id, userId: uid, endedAt: null }, data: { clientHidden: p.data.hidden } });
  } else {
    const notes = p.data.notes.trim();
    await db.fitnessSession.updateMany({ where: { id: params.id, userId: uid }, data: { notes: notes || null } });
  }
  return Response.json({ ok: true }, { headers });
}
