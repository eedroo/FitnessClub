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
- **App nativo do iPhone** (pedido da dona do projecto): segue as Human Interface Guidelines — fonte do sistema, cores de sistema claras e escuras, listas agrupadas, barra de navegação com título grande, tab bar e barras translúcidas, folhas que sobem de baixo, interruptores e segmented control do iOS, um único acento grafite. Sem fontes externas, dourado, vidro nem sombras nos cartões. O tema segue o do sistema por defeito (`User.theme` = `SYSTEM`).
- **Vidro líquido** (pedido da dona do projecto): superfícies translúcidas e desfocadas sobre orbes tingidas pelo acento, cápsulas, tab bar flutuante. Cor oficial grafite (prata no escuro), escolhida pela dona do projecto, sem escolha de cor pela pessoa; azul (`--highlight`) só nos detalhes do corpo (mapa muscular, exercício em foco, descanso, gráficos). Ícone: haltere prateado sobre placa de grafite.
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
- IA (Fase B) só com consentimento próprio (`User.aiConsentAt`), pedido antes do primeiro uso e retirável nas Definições. Vai para o Gemini só o perfil de treino e os números dos treinos; nunca o nome, o email, o peso do corpo, a meta nem fotos.

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

## Progressão e comparação (pedido da dona do projecto)
- **Progressão dupla:** com um alvo de reps (ex.: 3 × 5–8), cada sessão soma uma rep à última vez na primeira série que a pode receber sem ficar mais de 1 rep acima da seguinte (6,5,5 → 6,6,5 → 7,6,5 → … → 8,8,8). Tudo no máximo → sobe a carga (+2,5 kg; halteres e kettlebells +2 kg) e as reps voltam ao mínimo. Da última vez com séries em falta → primeiro completá-las. Peso do corpo no topo → "torna-o mais difícil". Lógica pura em `src/lib/fitness/progression.ts`; a próxima série vem preenchida com a sugestão.
- **Comparação nos resumos:** o resumo da sessão compara volume, carga máxima, reps e séries com a última vez do mesmo treino (treino livre: o treino livre anterior) e cada exercício com a última vez; na tab Dia, cada sessão do dia compara-se da mesma forma (nunca com o dia anterior, que pode ser de descanso ou de outro treino).
- **Notas pessoais:** programa (`FitnessProgram.notes`), treino (`FitnessWorkout.notes`) e exercício (`ExerciseNote`, uma por pessoa e exercício, também da biblioteca), escritas pela pessoa ou pela IA (`notesByAi`/`byAi`; editar à mão tira a marca). Entram na exportação.

## Perfil de treino (Fase A)
- `TrainingProfile` (1 por pessoa): objectivos, nível, equipamento, músculos em foco (partes do mapa), dias da semana, tempo por treino, pedidos e o que evitar. Preenchido nas boas-vindas e editável em `/training-profile`; aberto a todos (sem `pro`). Entra na exportação.
- O peso dado no perfil vai para o peso diário de hoje, só com o consentimento de dados de saúde.
- Sem IA, o perfil escolhe o modelo sugerido (`recommendTemplate`): 4+ dias → superior/inferior; 3 → push · pull · legs (iniciante: corpo inteiro); 1–2 → corpo inteiro; só saúde sem ginásio → alongamentos.
- "Voltar" na página do exercício regressa à página de onde se veio (histórico do app em `sessionStorage`; o `document.referrer` não muda nas navegações do Next).

## IA (Fase B)
- **Modelo:** Gemini 3.8 Flash por REST (o 2.5 Flash deixou de estar disponível para contas novas; `GEMINI_MODEL` muda-o sem deploy de código) (`src/lib/ai/gemini.ts`), chave só na Vercel (`GEMINI_API_KEY`), saída JSON com `responseSchema` e validação com Zod. `AI_FAKE=1` (só fora de produção) responde sem chave, para testar.
- **Acesso:** recurso `ai`, por defeito só Premium; o consentimento e a chave também contam. Política de Privacidade e Termos na versão `2026-11-19` (re-aceitação); a versão do código ganha a uma `LEGAL_*_VERSION` mais antiga na Vercel.
- **Jobs:** a IA corre só no Inngest (`ai-program`, `ai-insight`, `ai-insight-cron` de hora a hora); sem Inngest, fora de produção, o job corre no próprio processo; em produção o pedido fica "falhado".
- **Perguntas a cada programa (pedido da dona do projecto):** um programa pode ser 2× por semana, outro de segunda a sexta, outro na praça. As perguntas (objectivos, nível, equipamento, foco, dias e tempo, pedidos) fazem-se em "Novo programa" → "Criar com IA", sugeridas com as respostas da última vez, e ficam no pedido (`AiRequest.facts`); as boas-vindas já não as fazem. "Pedir outro" repete as mesmas respostas. Pedidos falhados ou presos não gastam o limite; admins sem limite.
- **Programa:** candidatos da biblioteca filtrados pelo equipamento e nível (até 320, primeiro os dos modelos e com imagens); a IA só pode usar esses ids — os outros caem fora e, acima de 20 %, o pedido falha (uma nova tentativa com o motivo). A pessoa revê antes de guardar; ao guardar, as notas do programa e dos treinos ficam marcadas como da IA e as notas de exercício só entram onde a pessoa não escreveu a sua. Limite: 3 por dia, 15 por mês.
- **Retrospectiva semanal:** ao domingo às 9h no fuso da pessoa, para a semana (domingo a sábado) que acabou, só se houve treinos; também pedida à mão (uma por semana). A app calcula os factos (`weekFacts`: sessões, séries, reps, volume contra a semana anterior, recordes, exercícios principais, exercícios parados há 3+ semanas); a IA só interpreta e cada número do texto tem de existir nos factos (`checkInsight`). Push "A tua semana em revista" a quem tem notificações.
- **Custo:** cada pedido guarda tokens e custo (US$ 0,75 / 3,75 por milhão de tokens de entrada / saída, preço do nível pago; no gratuito não se paga); `/admin/ai` mostra o mês, os 30 dias por tipo e por pessoa. Nunca se guarda o prompt.

## Gamificação (Fase D)
- **Tudo calculado do histórico** (nada guardado): editar ou apagar uma sessão corrige XP e emblemas; as sessões copiadas do MYGLOW contam.
- **XP (externo):** sessão terminada 50; série 2 (até 30 por sessão); recorde 15 (até 3 por sessão); semana cumprida 100. Semana cumprida = os treinos do plano (dias do perfil), no máximo 2; a semana em curso não parte a sequência. Nunca carga absoluta.
- **Níveis só com números, sem tecto (decisão da dona do projecto):** até ao 10 sobe depressa (2 = 100 XP … 10 = 4500), daí cada nível custa 1000 XP (~2–3 semanas de treino regular).
- **Emblemas:** 1.º treino, 10/50/100/250 treinos, 1.º recorde, 25/100 recordes, 1000 séries, 4/12/26 semanas seguidas (metas de grupo na Fase C). Arte em `public/game/` (WebP 256 px, limpa e recortada a partir dos PNG enviados pela dona do projecto): molduras de nível por faixa (1, 10, 25, 50, 100), 12 emblemas (por ganhar: cinzento e transparente) e 5 medalhas de força.
- **Nível de força (interno, só a pessoa vê):** Bronze → Prata → Ouro → Platina → Diamante. Com carga: 1RM estimado ÷ peso do corpo mais recente (só com o consentimento de saúde); com o peso do corpo: melhor nº de repetições numa série. Só exercícios com padrão (`STRENGTH_STANDARDS`): básicos com barra, alguns com halteres (carga registada = soma dos dois halteres), barra fixa, flexões e paralelas. **Um padrão único para todas as pessoas, sem pedir género**, com a régua baixa o bastante para toda a gente subir (ex.: supino com barra 0,4 / 0,6 / 0,8 / 1,0 / 1,25 × o peso).
- **Na sessão:** selo do nível de força ao lado do nome do exercício, recalculado no cliente logo a seguir a cada série. O resumo da sessão mostra o XP ganho, a subida de nível e os emblemas novos.
- Mostrar os níveis de força no perfil público fica para a Fase C (desligado por defeito).

## Atividades (pedido da dona do projecto)
- **Outros treinos, como no app Saúde do iPhone:** ~80 tipos em 13 grupos (força, cardio, caminhada e corrida, ciclismo, água, corpo e mente, dança, lutas, desportos de equipa, raquetes, neve, ar livre, outros), registados à mão em `Activity`: dia e hora de início, duração, esforço 1–10 (leve, moderado, difícil, máximo) e distância nos tipos que a têm.
- Aparecem nas Sessões (misturadas com as sessões, por data), no Dia (e contam como dia com treino) e na retrospectiva semanal da IA. Até um ano para trás, nunca no futuro.
- **XP:** 1 por minuto (até 90); contam como treino para a semana cumprida e para os emblemas de treinos; não dão recordes nem nível de força.
- Entram na exportação e apagam-se com a conta.

## Rede social — Fase C1
- **Toda a conta é um perfil (pedido da dona do projecto):** o @ (3–20 de a-z, 0-9, _ e ., alguns reservados) e o nome escolhem-se nas boas-vindas; contas antigas recebem um @ automático (a partir do nome) que podem mudar no Eu. As regras da comunidade estão nos Termos (aceites no registo). Publicar é sempre opcional.
- **Feed:** as publicações em destaque; o "+" abre a nova publicação (texto, fotos, treino, quem vê).
- **Visibilidade por publicação:** pública (qualquer pessoa com conta) ou só amigos (por defeito). Feed = as minhas, as dos amigos e as públicas, filtro Todos/Amigos. Nunca sem sessão iniciada (nada é público na web).
- **Amizade mútua** (pedido e aceitação; pedir a quem já me pediu aceita logo). **Bloquear** esconde as duas pessoas uma da outra (perfil, posts, comentários, pesquisa, avisos) e desfaz a amizade.
- **Treino partilhado:** retrato guardado no post (nome, data, duração, séries, volume, recordes e exercícios; ou tipo, duração e distância da atividade) — nunca o peso do corpo. "Partilhar no feed" no resumo da sessão e na atividade.
- **Perfil público:** @, nome, bio, nível, emblemas ganhos e nº de amigos; níveis de força só se a pessoa ligar "Mostrar os meus níveis de força" (desligado por defeito).
- **Avisos:** sino no Feed (pedido, amizade aceite, gosto, comentário); push só para pedido, aceite e comentário.
- **Moderação:** denúncias (8 motivos) de posts, comentários e pessoas; `/admin/reports` esconde ou volta a mostrar e fecha as denúncias. O autor vê o seu post escondido com o aviso.
- **Limites por dia:** 20 posts, 200 comentários, 50 pedidos de amizade, 30 denúncias.
- **Navegação:** 5 separadores — Feed · Treinos · Sessões · Dia · Eu (o Corpo passou a Eu: o meu perfil e o corpo).
- Termos e Política na versão `2026-11-19.2` (regras da comunidade e dados sociais). Entra tudo na exportação; apagar a conta apaga tudo em cascata.
- **Próximas partes:** C2 fotos (Vercel Blob), C3 grupos com metas e rankings, C4 convites de treino com pino no mapa (academia ou região, nunca a posição exacta).
- **Treinos:** cabeçalho com o nível e a barra de XP; depois os programas, "Novo programa", os meus exercícios e a retrospectiva da semana. Na página do exercício só o selo do nível de força (leva às conquistas).
