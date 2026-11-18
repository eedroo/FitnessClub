# FitnessClub — Decisões de arquitectura

App de treino independente, nascido do "Foco no corpo" do MYGLOW (commit `73f7028` do MYGLOW; plano em `docs/FOCO-NO-CORPO-SEPARACAO.md` do repositório `eedroo/myglow`). PWA, PT-PT, PT-BR e EN (cada uma escrita de forma nativa), tema claro/escuro/sistema.

## Separação do MYGLOW (decisões tomadas)
- **Contas:** próprias — banco (Neon novo) e login separados do MYGLOW. Sem partilha de base de dados.
- **Utilizadores:** só a dona do projeto usava o Foco no corpo: não há migração de contas. O histórico dela pode ser copiado com `scripts/copy-my-data.ts` (opcional).
- **Premium:** interruptor próprio no admin (recurso `pro`, que cobre o app inteiro). A dona do projeto é admin (`ADMIN_EMAILS`).
- **Nome:** FitnessClub (repositório `eedroo/FitnessClub`). Domínio a definir.
- **Sem diário:** terminar uma sessão já não marca os checks do diário do MYGLOW; uma ponte futura seria uma API pequena com token por utilizador e autorização explícita (§8 do plano), nunca o banco partilhado.
- **Rotas na raiz:** o que no MYGLOW vivia em `/body/*` passa para a raiz (`/`, `/session`, `/exercises`, …); as boas-vindas do treino são o onboarding (`/welcome`).

## Stack
- Next.js 14 App Router + TypeScript, Prisma + Neon (Postgres), Auth.js v5 (Credentials, JWT), Zod, Vercel
- CSS próprio com CSS variables + classes de componente (sem Tailwind, sem shadcn); prefixo `mg-` herdado do MYGLOW
- next-intl (sem prefixo de locale no URL, locale via cookie + preferência do user; `PT_PT`, `PT_BR`, `EN`)
- next-themes (`data-theme`, opções LIGHT / DARK / SYSTEM, claro por defeito)
- Luxon (datas e fusos)
- Inngest (aviso de fim de descanso), Web Push (VAPID), Resend (emails), Upstash (rate limit), Sentry (UE)
- Vitest

## Regras
- CSS: mapear componentes primeiro → cada componente tem classes em `src/styles/components/*.css` com prefixo `mg-`. Inline style só para ajuste pontual de uma instância reutilizada.
- Tokens de cor/espaço/raio/sombra só em `tokens.css` (claro e escuro).
- Server Components para páginas e leitura de dados (Prisma só corre no servidor). `'use client'` apenas em componentes interactivos. Mutações por Server Actions validadas com Zod.
- Datas de calendário são strings `YYYY-MM-DD` (`DateISO`) no fuso do user; conversão para `Date` só com `toDbDate`/`fromDbDate`; timestamps em UTC.
- Semana começa ao **domingo**; lógica de semanas só em `src/lib/weeks.ts`.
- Peso em gramas inteiras; introduzido em kg (aceita vírgula ou ponto).
- Commits: um commit por passo, no fim, com `vitest`, `tsc --noEmit` e build a passar. Alterações cirúrgicas.
- Testes: só Vitest + lista de verificação manual (sem Playwright).

## Conta e privacidade
- Emails transaccionais via Resend: 6 templates (confirmação, recuperação, confirmar email novo, aviso ao email antigo, palavra-passe alterada, conta apagada) nas 3 línguas.
- Tokens de email guardados só como hash SHA-256, de uso único: confirmação 24 h, recuperação e alteração de email 1 h.
- `sessionVersion` invalida os JWT (verificada a cada 5 min): reset/alteração de palavra-passe, alteração de email e "terminar sessão em todos os dispositivos".
- A confirmação de email não bloqueia o uso (só um aviso no topo, escondível 3 dias).
- Exportação de dados em JSON `fitnessclub-export-v1`.
- Apagar a conta = remoção imediata em cascata.
- Peso e meta são dados de saúde: consentimento explícito (`wellbeingConsentAt`), pedido no registo e retirável; sem ele o peso e a meta ficam desactivados (nem se mostram nem se gravam).
- Idade mínima 16 anos (nos Termos).
- Versões dos Termos e da Política de Privacidade com re-aceitação quando mudam. Textos legais são rascunho até revisão jurídica. Responsável pelos dados: Onda.
- Sem IA: nenhum dado sai para serviços de IA.

## Premium e operação
- Plano `FREE`/`PREMIUM` lido do servidor por pedido (nunca no JWT), com origem (`MANUAL`, `GIFT`, `PAID` mais tarde) e data de fim opcional. Sem pagamentos por agora.
- Um recurso, `pro`, com interruptor global (`HIDDEN`/`PREMIUM`/`ALL`, sem novo deploy, por defeito `PREMIUM`) e excepções por pessoa; a verificação que conta é sempre no servidor (`requireFeature`). Sem acesso: os treinos mostram o cadeado; as definições, a exportação e apagar a conta continuam abertas.
- Administração em `/admin` só para `ADMIN_EMAILS` (os outros recebem 404), sem acesso aos treinos nem ao peso de ninguém.
- Actividade diária em `UserActiveDay` (um registo por dia no fuso da pessoa) para DAU/WAU/MAU.
- Sentry na região UE, sem dados pessoais (só o id interno) nem Session Replay.
- Vercel Analytics (sem cookies) só nas páginas públicas.
- Notificações: só o push de fim de descanso; a permissão só é pedida depois de um gesto ("Activar"); iOS só com o app instalado no ecrã inicial (16.4+). Subscrições que respondem 404/410 são apagadas.
