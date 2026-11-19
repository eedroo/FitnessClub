# FitnessClub

App de treino independente, nascido do "Foco no corpo" do MYGLOW: programas, treinos, sessões com cronómetro e
descanso, recordes e evolução por exercício, peso diário com meta. PWA em PT-PT, PT-BR e EN.

Antes de mexer no código: `CLAUDE.md`, `docs/DECISIONS.md` e `docs/COMPONENTS.md`.

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencher DATABASE_URL, DIRECT_URL e AUTH_SECRET (Postgres local ou Neon de dev)
npx prisma migrate deploy
npm run seed:exercises
npm run dev
```

Verificação antes de cada commit: `npx vitest run`, `npx tsc --noEmit` e `npm run build`.

## Deploy na Vercel (passo 6 do plano)

As variáveis vivem só na Vercel (Project → Settings → Environment Variables). Nada disto vai para o repositório nem para o chat.

1. **Projecto:** Vercel → Add New → Project → importar `eedroo/FitnessClub`. Build Command:
   `prisma generate && prisma migrate deploy && tsx prisma/seed-exercises.ts && next build` (é o script `vercel-build`, usado sozinho).
2. **Banco:** separador Storage → Create → Neon (Postgres). A integração cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`;
   criar `DIRECT_URL` com o valor de `DATABASE_URL_UNPOOLED`. O primeiro deploy só passa depois de o banco existir.
3. **Variáveis** (Production; Preview se quiser):
   - `AUTH_SECRET` (novo: `npx auth secret`); `AUTH_URL` e `APP_URL` só quando houver domínio próprio (sem elas, na Vercel usa-se o domínio `*.vercel.app` de produção);
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (par novo: `npx web-push generate-vapid-keys`);
   - `GEMINI_API_KEY` (Secret; Google AI Studio). Por agora no nível gratuito, como diz a Política (secção 4); ao activar a faturação, mudar esse parágrafo e subir a versão dos documentos;
   - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (app novo no Inngest, endpoint `https://<domínio>/api/inngest`; ou a integração Inngest da Vercel);
   - `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` (domínio verificado no Resend);
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (base nova; ou a integração Upstash da Vercel);
   - `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (projecto Sentry novo, região UE) — opcional;
   - `LEGAL_TERMS_VERSION=2026-11-19`, `LEGAL_PRIVACY_VERSION=2026-11-19` (opcionais: sem elas vale a versão do código), `ADMIN_EMAILS` (o teu email);
   - `BLOB_READ_WRITE_TOKEN` só para reenviar as imagens (ver abaixo).
   Não são precisas: `OPENAI_*`, `GUIDE_CONSENT_VERSION`, `BETA*`.
4. **Primeiro acesso:** registar a conta com o email de `ADMIN_EMAILS`. O app está aberto a todos (recurso `pro` em
   «Todos»); para o fechar a premium: `/admin/features` → `pro` → Premium.
5. **Domínio e PWA:** ligar o domínio (Settings → Domains) e actualizar `AUTH_URL` e `APP_URL`; mudar de domínio depois obriga a reinstalar o app e a reactivar os avisos.

### Imagens dos exercícios

`content/exercises/images.json` aponta para o Blob do MYGLOW (serve na v1). Antes de apagar esse Blob: criar um Blob
neste projecto (Storage → Blob), pôr `BLOB_READ_WRITE_TOKEN` no terminal e correr
`npx tsx scripts/fitness/import-images.ts --reupload`; fazer commit do `images.json` e um deploy (o seed actualiza os URLs).

### Copiar o histórico do MYGLOW (passo 7, opcional)

Depois de registar a conta no FitnessClub (mesmo email) e de o seed ter corrido:

```bash
MYGLOW_DATABASE_URL="…" DATABASE_URL="…" npx tsx scripts/copy-my-data.ts --email o-teu@email
```

Mostra o que vai copiar; repetir com `--apply` para gravar. As duas ligações põem-se só no terminal. O peso e a meta só
passam se o consentimento de dados de saúde estiver dado no FitnessClub.

## Lista de verificação manual (num telemóvel)

- [ ] Registo → boas-vindas (descanso, aviso, modelo) → Treinos com o programa do modelo.
- [ ] Com `pro` em Premium no admin, uma conta grátis vê o cadeado em `/locked`; Definições, exportação e apagar a conta funcionam.
- [ ] Sessão: começar treino, registar séries, descanso com contagem, −15 s / +30 s / Saltar, terminar → resumo.
- [ ] Push de fim de descanso com o app em segundo plano (no iPhone, com o app instalado no ecrã inicial).
- [ ] Sem rede a meio da sessão: as séries ficam na fila e gravam ao voltar.
- [ ] Recordes (troféu), comparação com a anterior, página do exercício (séries, evolução, recordes).
- [ ] Dia, calendário, mapa muscular; peso (registar, gráfico, apagar) e meta.
- [ ] Definições: língua, tema, fuso, descanso por defeito, retirar o consentimento de saúde (com e sem apagar).
- [ ] Email de confirmação e recuperação de palavra-passe a chegarem (Resend).
- [ ] Admin: métricas, utilizadores, plano, interruptor `pro`.
- [ ] IA (Premium): nova Política aceite uma vez; Treinos → "Criar com IA" → consentimento → programa proposto (só exercícios da biblioteca) → Guardar → notas marcadas "IA" no programa, treinos e exercícios.
- [ ] Retrospectiva: Treinos → "Retrospectiva da semana" → pedir a da semana passada → números e texto; ao domingo às 9h chega sozinha (push).
- [ ] Conta grátis: o cartão da IA mostra "Premium" e não pede nada; Definições › Privacidade › IA: retirar o consentimento.
- [ ] Admin › IA: custo do mês, por tipo e por pessoa.
