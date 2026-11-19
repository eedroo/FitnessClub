'use client';

import { useTransition } from 'react';
import { dismissReport, moderate } from '@/actions/admin';
import { Button } from '@/components/ui/Button';

/** Uma denúncia: esconder o conteúdo (fecha as denúncias dele) ou fechar sem acção. Área interna, só PT-PT. */
export function ReportActions({ reportId, target, targetId, hidden }: { reportId: string; target: 'POST' | 'COMMENT' | 'USER'; targetId: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="mg-form__row">
      {target !== 'USER' && (
        <Button variant={hidden ? 'ghost' : 'danger'} loading={pending} onClick={() => start(async () => void (await moderate(target, targetId, !hidden)))}>
          {hidden ? 'Voltar a mostrar' : 'Esconder'}
        </Button>
      )}
      <Button variant="subtle" disabled={pending} onClick={() => start(async () => void (await dismissReport(reportId)))}>
        Fechar sem acção
      </Button>
    </div>
  );
}
