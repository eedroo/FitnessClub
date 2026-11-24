'use client';

import { useTransition } from 'react';
import { dismissPremiumRequest, setUserPlan } from '@/actions/admin';
import { Button } from '@/components/ui/Button';

/** Um pedido de Premium: dar o Premium (manual, sem fim; avisa a pessoa por push) ou recusar. Área interna, só PT-PT. */
export function PremiumRequestActions({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="mg-form__row">
      <Button className="mg-btn--body" loading={pending} onClick={() => start(async () => void (await setUserPlan(userId, 'PREMIUM', 'MANUAL', null)))}>
        Dar Premium
      </Button>
      <Button variant="subtle" disabled={pending} onClick={() => start(async () => void (await dismissPremiumRequest(userId)))}>
        Recusar
      </Button>
    </div>
  );
}
