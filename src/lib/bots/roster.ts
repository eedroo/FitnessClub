/**
 * Bots (contas de demonstração, «placeholders») para o feed e as 3 primeiras ligas do ranking não estarem vazios
 * enquanto há poucas pessoas. Aparecem como perfis normais (decisão da dona do projecto, 25/11); por dentro são
 * `User.isBot`: sem login, fora das métricas e do pódio semanal, e ocultáveis de uma vez no admin. Puro: a lista, a
 * escolha diária e a progressão dupla das cargas.
 */
export type BotTemplate = 'ppl' | 'fullbody' | 'upperlower';

export interface BotDef {
  handle: string;
  name: string;
  bio: string;
  /** Nível a atingir com o histórico inicial (define a liga: bronze 1–5, prata 6–10, ouro 11–20). */
  level: number;
  /** Treinos por semana (a probabilidade de treinar em cada dia é isto ÷ 7). */
  perWeek: number;
  template: BotTemplate;
  /** Força relativa (multiplica as cargas de partida). */
  strength: number;
}

export const BOTS: BotDef[] = [
  { handle: 'lia.souza', name: 'Lia Souza', bio: 'Voltando aos treinos depois de um tempo parada 💪', level: 2, perWeek: 3, template: 'fullbody', strength: 0.6 },
  { handle: 'davi.rocha', name: 'Davi Rocha', bio: 'Começando agora. Um treino de cada vez.', level: 3, perWeek: 3, template: 'fullbody', strength: 0.8 },
  { handle: 'nina.alves', name: 'Nina Alves', bio: 'Academia antes do trabalho ☀️', level: 4, perWeek: 3, template: 'upperlower', strength: 0.65 },
  { handle: 'rafa.lima', name: 'Rafa Lima', bio: 'PPL e café.', level: 7, perWeek: 4, template: 'ppl', strength: 0.9 },
  { handle: 'bruna.costa', name: 'Bruna Costa', bio: 'Foco em glúteos e constância 🍑', level: 8, perWeek: 4, template: 'upperlower', strength: 0.75 },
  { handle: 'theo.martins', name: 'Théo Martins', bio: 'Sempre mais uma repetição.', level: 9, perWeek: 3, template: 'ppl', strength: 1 },
  { handle: 'mari.ferreira', name: 'Mari Ferreira', bio: 'Treino é terapia.', level: 12, perWeek: 4, template: 'ppl', strength: 0.85 },
  { handle: 'caio.ribeiro', name: 'Caio Ribeiro', bio: 'Supino, agacho e terra. O resto é acessório.', level: 14, perWeek: 5, template: 'upperlower', strength: 1.1 },
  { handle: 'jade.nunes', name: 'Jade Nunes', bio: '5x por semana, chova ou faça sol 🌧️', level: 16, perWeek: 5, template: 'ppl', strength: 0.95 },
];

/** Gerador pseudo-aleatório com semente (o mesmo resultado para a mesma semente, nos testes). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Treina hoje? Probabilidade `perWeek / 7`, sem treinar dois dias seguidos quando treina 3 ou menos vezes. */
export function trainsToday(perWeek: number, trainedYesterday: boolean, r: number): boolean {
  if (trainedYesterday && perWeek <= 3) return false;
  return r < perWeek / 7;
}

/** Carga de partida (kg) de um exercício com peso, pela categoria do movimento e a força do bot. */
export function startingKg(exerciseId: string, strength: number): number {
  const base =
    /Squat|Deadlift|Leg_Press/.test(exerciseId) ? (/Leg_Press/.test(exerciseId) ? 90 : 50)
    : /Bench|Row|Press/.test(exerciseId) ? 35
    : /Pulldown|Cable/.test(exerciseId) ? 35
    : /Curl|Raise|Pushdown|Extension|Fly|Face/.test(exerciseId) ? 12
    : 20;
  return Math.max(2.5, Math.round((base * strength) / 2.5) * 2.5);
}

export interface Progress {
  kg: number | null; // null = sem carga (peso do corpo)
  reps: number[]; // repetições da última vez, por série
}

/**
 * A próxima sessão de um exercício pela progressão dupla: soma uma repetição na série com menos repetições (às vezes
 * não consegue, `r` alto); quando todas chegam ao topo, sobe a carga (2,5 kg, ou 1 kg nas cargas pequenas) e volta
 * ao começo da faixa. Sem carga: só repetições, até ao topo.
 */
export function nextSets(last: Progress, min: number, max: number, sets: number, r: number): Progress {
  const reps = last.reps.length ? [...last.reps] : Array.from({ length: sets }, () => min);
  while (reps.length < sets) reps.push(reps[reps.length - 1] ?? min);
  if (last.kg != null && reps.every((x) => x >= max)) {
    const step = last.kg < 15 ? 1 : 2.5;
    return { kg: Math.round((last.kg + step) * 10) / 10, reps: reps.map((_, i) => Math.max(min, max - 3 - (i > 0 ? 1 : 0))) };
  }
  // Dia mau (15 %): repete; dia normal: +1 na série mais fraca.
  if (r < 0.15) return { kg: last.kg, reps };
  const i = reps.indexOf(Math.min(...reps));
  reps[i] = Math.min(max, reps[i]! + 1);
  return { kg: last.kg, reps };
}
