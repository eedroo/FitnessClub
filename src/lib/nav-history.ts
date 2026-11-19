/**
 * Histórico de navegação dentro do app (sessionStorage). O `document.referrer` não muda nas navegações do lado do
 * cliente do Next, por isso o "Voltar" precisa deste registo para saber se há uma página anterior no app.
 * Puro (sem DOM): recebe a pilha e devolve a nova.
 */
export const NAV_STACK_KEY = 'fc_nav_stack';
const MAX = 50;

/** Nova pilha depois de chegar a `path`: voltar a anterior tira o topo; repetir a mesma não muda; senão empilha. */
export function pushPath(stack: string[], path: string): string[] {
  if (stack[stack.length - 1] === path) return stack;
  if (stack[stack.length - 2] === path) return stack.slice(0, -1);
  return [...stack, path].slice(-MAX);
}

/** Há uma página anterior dentro do app? */
export function canGoBack(stack: string[]): boolean {
  return stack.length > 1;
}

export function readStack(raw: string | null): string[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
