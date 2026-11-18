'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { finishWelcome } from '@/actions/welcome';
import { Button } from '@/components/ui/Button';

/** Botão que fecha as boas-vindas e entra no app (o token passa a `onboarded`). */
export function WelcomeStart({ label }: { label: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        block
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await finishWelcome();
            if (!res.ok) return setError(t(res.error));
            await update({});
            router.push('/');
            router.refresh();
          })
        }
      >
        {label}
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
