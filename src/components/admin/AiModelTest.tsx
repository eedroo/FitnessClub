'use client';

import { useState, useTransition } from 'react';
import { testAiModel, type AiModelTest as Result } from '@/actions/admin';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

/** Admin › IA: testar um modelo do Gemini (responde? quanto demora? quantos tokens?). Área interna, só PT-PT. */
export function AiModelTest({ current }: { current: string }) {
  const [model, setModel] = useState('gemini-3.5-flash-lite');
  const [results, setResults] = useState<Result[]>([]);
  const [pending, start] = useTransition();
  const run = (m: string) =>
    start(async () => {
      const r = await testAiModel(m);
      setResults((list) => [r, ...list].slice(0, 6));
    });
  return (
    <div className="mg-form">
      <label className="mg-admin__note">
        Modelo
        <TextInput value={model} onChange={(e) => setModel(e.target.value)} spellCheck={false} autoCapitalize="none" />
      </label>
      <div className="mg-form__row">
        <Button loading={pending} onClick={() => run(model)}>
          Testar
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run(current)}>
          Testar o actual ({current})
        </Button>
      </div>
      {results.map((r, i) => (
        <div key={i} className="mg-admin__note">
          <strong>
            {r.model}: {r.ok ? `✓ responde em ${(r.ms / 1000).toFixed(1)} s · ${r.inputTokens} + ${r.outputTokens} tokens` : `✗ ${(r.ms / 1000).toFixed(1)} s`}
          </strong>
          <pre className="mg-admin__pre">{r.ok ? r.answer : r.error}</pre>
        </div>
      ))}
    </div>
  );
}
