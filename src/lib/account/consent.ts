import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';

/**
 * Consentimento explícito para dados de saúde (peso e meta). Sem ele, o peso fica desactivado.
 * Uma leitura por pedido.
 */
export const hasWellbeingConsent = cache(async (userId: string): Promise<boolean> => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { wellbeingConsentAt: true } });
  return !!user?.wellbeingConsentAt;
});
