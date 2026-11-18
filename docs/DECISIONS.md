# FitnessClub — Decisões de arquitectura

App de treino independente, nascido do "Foco no corpo" do MYGLOW (commit `73f7028` do MYGLOW; plano em `docs/FOCO-NO-CORPO-SEPARACAO.md` do repositório `eedroo/myglow`). PWA, PT-PT, PT-BR e EN (cada uma escrita de forma nativa), tema claro/escuro/sistema.

## Separação do MYGLOW (decisões tomadas)
- **Contas:** próprias — banco (Neon novo) e login separados do MYGLOW. Sem partilha de base de dados.
- **Utilizadores:** só a dona do projeto usava o Foco no corpo: não há migração de contas. O histórico dela pode ser copiado com `scripts/copy-my-data.ts` (opcional).
- **Premium:** interruptor próprio no admin (recurso `pro`, que cobre o app inteiro). A dona do projeto é admin (`ADMIN_EMAILS`).
- **Nome:** FitnessClub (repositório `eedroo/FitnessClub`). Domínio a definir.
- **Sem diário:** terminar uma sessão já não marca os checks do diário do MYGLOW; uma ponte futura seria uma API pequena com token por utilizador e autorização explícita (§8 do plano), nunca o banco partilhado.
- **Rotas na raiz:** o que no MYGLOW vivia em `/body/*` passa para a raiz (`/`, `/session`, `/exercises`, …); as boas-vindas do treino são o onboarding (`/welcome`).

## Linguagem visual
- **App nativo do iPhone** (pedido da dona do projecto): segue as Human Interface Guidelines — fonte do sistema, cores de sistema claras e escuras, listas agrupadas, barra de navegação com título grande, tab bar e barras translúcidas, folhas que sobem de baixo, interruptores e segmented control do iOS, um único acento laranja. Sem fontes externas, dourado, vidro nem sombras nos cartões. O tema segue o do sistema por defeito (`User.theme` = `SYSTEM`).
- **Página de entrada** (`/start`) para quem chega sem sessão, no padrão do ecrã de boas-vindas das apps da Apple.

## Stack
- Next.js 14 App Router + TypeScript, Prisma + Neon (Postgres), Auth.js v5 (Credentials, JWT), Zod, Vercel
- CSS próprio com CSS variables + classes de componente (sem Tailwind, sem shadcn); prefixo `mg-` herdado do MYGLOW
- next-intl (sem prefixo de locale no URL, locale via cookie + preferência do user; `PT_PT`, `PT_BR`, `EN`)
- next-themes (`data-theme`, opções LIGHT / DARK / SYSTEM, sistema por defeito)
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
- Um recurso, `pro`, com interruptor global (`HIDDEN`/`PREMIUM`/`ALL`, sem novo deploy, por defeito `ALL` — o app está aberto a todos; cada funcionalidade nova decide-se grátis ou premium quando for lançada) e excepções por pessoa; a verificação que conta é sempre no servidor (`requireFeature`). Sem acesso: os treinos mostram o cadeado; as definições, a exportação e apagar a conta continuam abertas.
- Administração em `/admin` só para `ADMIN_EMAILS` (os outros recebem 404), sem acesso aos treinos nem ao peso de ninguém.
- Actividade diária em `UserActiveDay` (um registo por dia no fuso da pessoa) para DAU/WAU/MAU.
- Sentry na região UE, sem dados pessoais (só o id interno) nem Session Replay.
- Vercel Analytics (sem cookies) só nas páginas públicas.
- Notificações: só o push de fim de descanso; a permissão só é pedida depois de um gesto ("Activar"); iOS só com o app instalado no ecrã inicial (16.4+). Subscrições que respondem 404/410 são apagadas.

## Treino (do Foco no corpo do MYGLOW, F16)
- **Acesso:** todo o treino é do recurso `pro`. Sem ele, as páginas levam a `/locked` (cadeado premium) e as acções respondem 404.
- **Biblioteca:** free-exercise-db (Unlicense) importada para a DB pelo seed em cada deploy, com imagens no Vercel Blob (na v1 os URLs do Blob do MYGLOW; `scripts/fitness/import-images.ts --reupload` cria a cópia própria). Exercícios próprios por pessoa.
- **Estrutura:** Programa → Treino → Item. As séries ficam em `SessionSet`, ligadas ao exercício (histórico por data).
- **Sessão:** uma activa de cada vez; tempos sempre a partir de timestamps; descanso por item, depois por exercício, depois pela preferência; sessão esquecida há mais de 6 h termina na última série.
- **Aviso de fim de descanso:** push só com o app em segundo plano (job Inngest `fitness-rest-alert`, TTL 60 s).
- **Fim da sessão:** abre o resumo da sessão (já não marca checks de nenhum diário).

## Peso e evolução (do Corpo II do MYGLOW, F17)
- **Peso diário** (com consentimento de dados de saúde): 1 registo por dia; a média semanal (domingo a sábado) é o número principal; tendência de 7 dias; objectivo ganhar / manter / perder com ritmos fixos e linguagem neutra.
- **Recordes:** peso, e1RM (Epley, até 12 reps) e reps por peso, gravados na série e recalculados ao editar.
- **Comparação** com a sessão anterior por exercício.
- **Mapa muscular** com recuperação: menos de 48 h, 48 a 72 h, mais de 72 h.
- Nunca sugere dietas nem suplementos.

## Treino (pedidos da dona do projecto, já no MYGLOW)
- O exercício em foco (borda acesa) é o último com série registada; cumpridas as séries do alvo, o foco passa logo ao exercício seguinte por fazer, mesmo durante o descanso (`focusExercise`).
- A comparação com a anterior é um cartão 2×2 (séries, reps, volume, kg por rep; ▲ verde quando sobe, o resto neutro) na página do exercício e em cada exercício da sessão (contra a última vez).
- As séries aparecem em linhas com a hora e os números grandes com a unidade pequena; no histórico, da mais recente para a mais antiga.
- Na página do exercício, só uma linha curta debaixo do nome; o resto em "Detalhes e ações". "Voltar" regressa à página anterior.
- O gráfico do peso liga as pesagens (sem a média de 7 dias).
- Navegação com 4 itens: Treinos · Sessões · Dia · Corpo; os exercícios abrem-se a partir de Treinos.

## Boas-vindas, definições e conta
- **Onboarding = boas-vindas do treino** (`/welcome`, 4 passos: olá, descanso, aviso de fim de descanso, modelo ou do zero). Concluir grava as preferências e `User.onboardedAt`; sem `pro` também se conclui (o modelo de programa só se copia com `pro`) e a pessoa vê o cadeado.
- **Definições** (`/settings`, abertas com ou sem `pro`): perfil, conta (email, palavra-passe), preferências (língua, tema, fuso), treino (descanso por defeito, aviso, ecrã aceso — só com `pro`), aviso de fim de descanso neste dispositivo, privacidade (consentimento de saúde, exportação, documentos), sessões e zona de perigo.
- **Apagar a conta:** remove séries e programas antes do utilizador (as séries e os itens apontam para exercícios sem cascata; um exercício próprio já usado bloqueava a remoção — bug herdado do MYGLOW).
