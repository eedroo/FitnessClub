import 'server-only';

/**
 * Cliente mínimo do Gemini (REST, sem SDK). A chave vive só na Vercel (`GEMINI_API_KEY`).
 * Saída sempre em JSON com `responseSchema`; quem chama valida com Zod (nunca confiar no modelo).
 * `AI_FAKE=1` (só fora de produção) devolve a resposta falsa dada por quem chama, para testar sem chave.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Preço do Gemini 3.8 Flash no nível pago (USD por milhão de tokens; a saída inclui o "pensamento"). No nível
// gratuito do AI Studio não se paga: o custo no admin é o que custaria no pago.
const PRICE_IN_PER_M = 0.75;
const PRICE_OUT_PER_M = 3.75;

export function costMicroUsd(inputTokens: number, outputTokens: number): number {
  return Math.round(inputTokens * PRICE_IN_PER_M + outputTokens * PRICE_OUT_PER_M);
}

export function hasAi(): boolean {
  return Boolean(process.env.GEMINI_API_KEY) || isFakeAi();
}

export function isFakeAi(): boolean {
  return process.env.AI_FAKE === '1' && process.env.NODE_ENV !== 'production';
}

export interface AiCall {
  system: string;
  prompt: string;
  /** Esquema no formato OpenAPI do Gemini (`type: 'OBJECT'`, …). */
  schema: Record<string, unknown>;
  temperature?: number;
  thinkingBudget?: number;
  /** Resposta usada com `AI_FAKE=1`. */
  fake: () => unknown;
}

export interface AiResponse {
  json: unknown;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export class AiError extends Error {}

export async function generateJson(call: AiCall): Promise<AiResponse> {
  if (isFakeAi()) return { json: call.fake(), inputTokens: 0, outputTokens: 0, model: 'fake' };
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError('GEMINI_API_KEY em falta');
  // Gemini 3: "pensamento" por nível e temperatura por defeito (recomendação da Google); 2.5: orçamento em tokens.
  const gen3 = GEMINI_MODEL.startsWith('gemini-3');
  const thinking = gen3 ? { thinkingLevel: (call.thinkingBudget ?? 0) > 0 ? 'medium' : 'low' } : { thinkingBudget: call.thinkingBudget ?? 0 };
  const send = (withThinking: boolean) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: call.system }] },
        contents: [{ role: 'user', parts: [{ text: call.prompt }] }],
        generationConfig: {
          ...(!gen3 && { temperature: call.temperature ?? 0.4 }),
          responseMimeType: 'application/json',
          responseSchema: call.schema,
          ...(withThinking && { thinkingConfig: thinking }),
        },
      }),
    });
  let res = await send(true);
  // Se o modelo não aceitar a configuração do pensamento, tenta sem ela.
  if (res.status === 400) {
    const text = await res.clone().text();
    if (/thinking/i.test(text)) res = await send(false);
  }
  if (!res.ok) throw new AiError(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  const usage = body.usageMetadata ?? {};
  const inputTokens = usage.promptTokenCount ?? 0;
  const outputTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    const err = new AiError(`Resposta sem JSON (${body.candidates?.[0]?.finishReason ?? '?'})`);
    Object.assign(err, { inputTokens, outputTokens });
    throw err;
  }
  return { json, inputTokens, outputTokens, model: GEMINI_MODEL };
}
