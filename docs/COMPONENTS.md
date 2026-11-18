# FitnessClub — Mapa de componentes

Fonte de verdade da UI. Todo o componente listado aqui tem:

- **TSX** em `src/components/<grupo>/<Nome>.tsx`
- **CSS** em `src/styles/components/<ficheiro>.css`, importado por `src/styles/index.css`
- **Classes** com prefixo `mg-` e convenção BEM (`bloco`, `bloco__elemento`, `bloco--modificador`) — o prefixo veio do MYGLOW e mantém-se
- Apenas `var(--…)` de `src/styles/tokens.css` — nunca cores, raios, sombras ou espaçamentos literais
- Nenhum texto visível próprio: o texto chega por props ou por `useTranslations`, vindo de `messages/*.json`

**Inline style** só é permitido para um ajuste pontual numa instância de um componente reutilizado. Nunca Tailwind.

Os componentes vieram do MYGLOW (commit `73f7028`); as etiquetas `F…` indicam a fase do MYGLOW em que nasceram.

---

## Primitivos (`src/components/ui/`)

### GlassCard — F1
- **TSX:** `GlassCard.tsx` (Server) · **CSS:** `card.css`
- **Classes:** `mg-card`, `mg-card__header`, `mg-card__title`, `mg-card__body`
- **Variantes:** `mg-card--accent` (borda dourada mais forte + brilho), `mg-card--flat` (sem blur, fundo opaco), `mg-card--interactive` (hover/focus elevado)
- **Props:** `as?: 'section' | 'div' | 'article'`, `variant?: 'accent' | 'flat' | 'interactive' | Array<…>`, `title?: ReactNode`, `header?: ReactNode`, `className?`, `children`
- Fallback `@supports not (backdrop-filter: blur(1px))` → `var(--glass-bg-strong)`

### MagicIcon — F1
- **TSX:** `MagicIcon.tsx` (Server, sem estado) · **CSS:** `magic-icon.css`
- **Classes:** `mg-magic-icon`, `mg-magic-icon--sm | --md | --lg | --xl` (24 / 40 / 56 / 120 px), `mg-magic-icon--placeholder`, `mg-magic-icon--glyph`, `mg-magic-icon__img`, `mg-magic-icon__svg`
- **Props:** `name: MagicIconName`, `size?: 'sm' | 'md' | 'lg' | 'xl'`, `decorative?: boolean`, `label?: string` (obrigatório se `decorative = false`), `className?`
- `ready: true` → `next/image` com `/icons/magic/<name>.png`; glifos prontos usam `mask-image` para herdar a cor
- `ready: false` → fallback (lucide ou glifo SVG) em `--gold-500` / `--gold-300` (escuro), `strokeWidth` 1.5, com halo radial dourado
- Registo em `src/lib/icons.ts`, tabela em `docs/ICONS.md`. **Nenhum componente usa lucide directamente para ícones mágicos.**

### Button — F1
- **TSX:** `Button.tsx` (Server-compatible; sem estado) · **CSS:** `button.css`
- **Classes:** `mg-btn`, `mg-btn--primary` (gradiente dourado), `mg-btn--ghost`, `mg-btn--subtle`, `mg-btn--block`, `mg-btn--loading`, `mg-btn__spinner`, `mg-btn__label`
- **Props:** `variant?: 'primary' | 'ghost' | 'subtle' | 'danger'`, `block?: boolean`, `loading?: boolean`, `loadingLabel?: string` + atributos nativos de `<button>`
- **F9:** `mg-btn--danger` (vermelho, para acções destrutivas: apagar conta)

### Field — F1
- **TSX:** `Field.tsx` (Server) · **CSS:** `field.css`
- **Classes:** `mg-field`, `mg-field__label`, `mg-field__hint`, `mg-field__error`, `mg-field--inline`
- **Props:** `id: string`, `label: string`, `hint?: string`, `error?: string`, `children` (o controlo; recebe `aria-describedby` via props do chamador)

### TextInput — F1
- **TSX:** `TextInput.tsx` (Server-compatible) · **CSS:** `input.css`
- **Classes:** `mg-input`, `mg-input--error`; `mg-select` para `<select>` nativo
- **Props:** atributos nativos de `<input>` + `invalid?: boolean`

### SegmentedControl — F1
- **TSX:** `SegmentedControl.tsx` (`'use client'`) · **CSS:** `segmented.css`
- **Classes:** `mg-segmented`, `mg-segmented__option`, `mg-segmented__option--active`, `mg-segmented__input`
- `radiogroup` com inputs `radio` nativos (teclado ← → grátis)
- **Props:** `name`, `legend`, `options: { value, label }[]`, `value`, `onChange?`, `defaultValue?`
- Usado em tema e língua (3 opções cada)

### CheckChip — F2 (showcase F1)
- **TSX:** `CheckChip.tsx` (`'use client'`) · **CSS:** `check-chip.css`
- **Classes:** `mg-check-chip`, `mg-check-chip__input`, `mg-check-chip__box`, `mg-check-chip__label`, `mg-check-chip--checked`
- Check pequeno inline com ícone (alongamento, treino, água)
- **Props:** `icon: MagicIconName`, `label`, `checked`, `onCheckedChange`

### Toast — F1
- **TSX:** `Toast.tsx` (`'use client'`) · **CSS:** `toast.css`
- **Classes:** `mg-toast`, `mg-toast--success`, `mg-toast--error`, `mg-toast__message`, `mg-toast__close`
- `role="status"` (success) / `role="alert"` (error); fecha automaticamente após 5 s
- **Props:** `variant: 'success' | 'error'`, `message`, `closeLabel`, `onClose?`

---

## Shell (`src/components/shell/`, CSS em `shell.css`)

### AmbientBackground — F1
- **TSX:** `AmbientBackground.tsx` (Server)
- **Classes:** `mg-ambient`, `mg-ambient__orb`, `mg-ambient__orb--1 … --4`
- 4 orbes dourados desfocados, animação lenta (40–60 s); parado com `prefers-reduced-motion`
- `aria-hidden`, `position: fixed`, atrás de tudo

### PageHeader — F1
- **TSX:** `PageHeader.tsx` (Server) · **Classes:** `mg-page-header`, `mg-page-header__eyebrow`, `mg-page-header__title`, `mg-page-header__subtitle`
- Título em Cormorant + subtítulo. **Props:** `title`, `subtitle?`, `eyebrow?`

### Layouts auxiliares (classes em `shell.css`)
- `mg-auth`, `__brand`, `__wordmark`, `__title`, `__tagline`, `__card`, `__card--wide`, `__footer` — layout central de login, registo e boas-vindas
- `mg-form-actions` — linha de botões Voltar / Seguinte
- `mg-dl` — lista de definição (dados da conta)

---

---

## Formulários (`src/components/forms/`, todos `'use client'`)

Compõem primitivos; não têm CSS próprio além de `field.css` (`mg-form-error`, `mg-checkbox`).

| Componente | Usa | Acção |
|---|---|---|
| `LoginForm` | `Field`, `TextInput`, `Button` | `login` (useFormState); F9: link "Esqueceste-te da palavra-passe?" |
| `RegisterForm` | `Field`, `TextInput`, `SegmentedControl`, `Button` | `register` (useFormState); caixas obrigatórias Termos + Política (links) e consentimento dos dados de saúde — peso e meta (`mg-checkbox--top`); sem convites do beta |
| `SettingsForm` | `Field`, `TextInput`, `SegmentedControl`, `Toast`, `Button` | `saveSettings` → `setTheme` → `update({})` → `router.refresh()`; F6: pronomes (Ela / Ele / Neutro); F9: `part` — `profile` (nome, pronomes) ou `preferences` (língua, tema, fuso, sono, hemisfério), cada um grava só os seus campos; a nota de privacidade das leituras passou para a secção Privacidade |

---

## Providers (`src/components/providers/`)

| Componente | Tipo | Função |
|---|---|---|
| `ThemeProvider` | client | `next-themes` com `attribute="data-theme"`, `defaultTheme="light"`, `enableSystem` |
| `ThemeSync` | client | ao montar, aplica o `theme` da sessão se for diferente do actual |
| `ServiceWorkerRegister` | client | regista `/sw.js` apenas em produção |
| `AuthSessionProvider` | client | `SessionProvider` do Auth.js — dá `useSession().update()` aos formulários |

---

## Compostos por feature

### Notificações — F7 (`src/components/notifications/`)

Lembretes push (`web-push`) + caixa de avisos na app (funciona sem push). A permissão só é pedida depois de tocar em "Activar".

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `NotificationsPromptCard` | client | `notify-prompt.css` | `mg-notify-prompt`, `__icon`, `__body`, `__title`, `__text`, `__actions`, `__status` | nas boas-vindas e nas definições: "Queres um aviso quando o descanso acaba?" → "Activar" (`subscribePush`) / "Agora não" (cookie 14 dias); some se o dispositivo já estiver subscrito; iPhone fora da app instalada → `InstallGuide` |
| `InstallGuide` | client | `install.css` | `mg-install`, `__intro`, `__steps`, `__step`, `__num` | iPhone/iPad: Partilhar → "Adicionar ao ecrã principal" → abrir pelo ícone (ícones de linha lucide) + "No iPhone, os lembretes só funcionam com a app instalada." |
| `InstallButton` | client | `install-btn.css` | `mg-install-btn` | Android/desktop: guarda `beforeinstallprompt` e mostra "Instalar FitnessClub"; escondido em standalone ou sem o evento |

### Conta, email e privacidade — F9 (`src/components/account/`, `settings/`, `legal/`)

Rotas novas: `(auth)/forgot-password`, `reset-password`, `verify-email`, `confirm-email-change` (abertas com ou sem sessão); `(public)/privacy`, `terms`, `goodbye` (sem login). Textos em `account`, `legal`, `settings` e `emails`.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `VerifyEmailBanner` | server | `banner.css` | `mg-banner`, `--info`, `__icon`, `__text`, `__actions`, `__close` | no topo da app enquanto o email não está confirmado (escondido 3 dias ao fechar, cookie `mg_verify_banner`): "Confirma o teu email para poderes recuperar a conta." + `ResendVerificationButton` + fechar (`BannerDismiss`) |
| `BannerDismiss` | client | `banner.css` | `mg-banner__close` | grava o cookie e esconde o banner |
| `ResendVerificationButton` | client | `banner.css` | `mg-banner__status` | "Reenviar email" → `resendVerification`; mostra "Enviámos um novo email." ou o erro |
| `ForgotPasswordForm` | client | `auth-form.css` | `mg-auth-form`, `__intro`, `__sent`, `__links` | `/forgot-password`; depois de enviar mostra sempre "Se existir uma conta com este email, enviámos um link." |
| `ResetPasswordForm` | client | `auth-form.css` | `mg-auth-form`, `__links` | `/reset-password?token=`: nova palavra-passe; token inválido/expirado → mensagem + link para pedir novo; sucesso → link para entrar |
| `VerifyEmailResult` | server | `auth-result.css` | `mg-auth-result`, `--ok`, `--error`, `__icon`, `__title`, `__text`, `__actions` | `/verify-email?token=` → consome o token e mostra sucesso ou erro |
| `ConfirmEmailChangeResult` | server | `auth-result.css` | `mg-auth-result`, … | `/confirm-email-change?token=` → aplica o email novo; pede para entrar de novo |
| `SettingsNav` | client | `settings-nav.css` | `mg-settings-nav`, `__list`, `__item`, `--active` | índice das secções das definições (âncoras); no desktop fica fixo ao lado; secção visível marcada (IntersectionObserver) |
| `TrainingPrefsForm` | client | `form.css` (reutiliza) | `mg-form`, `__row`, `__status` | Definições → Treino (só com `pro`): descanso por defeito (60 · 90 · 120 · 180 s, `SegmentedControl`), aviso de fim de descanso e ecrã aceso (`CheckChip`) → `updateFitnessPrefs` |
| Página `/settings` | server | `settings-nav.css` | `mg-settings__back` | link de volta aos treinos (ou ao cadeado) por cima do título |
| `ChangeEmailForm` | client | `form.css` | `mg-form`, `__row`, `__status`, `--error` | email novo + palavra-passe actual → `requestEmailChange` ("Enviámos um link para o email novo.") |
| `ChangePasswordForm` | client | `form.css` | `mg-form`, … | palavra-passe actual + nova → `changePassword` (outros dispositivos saem; este continua) |
| `WellbeingConsentCard` | client | `form.css` | `mg-form`, `__status` | privacidade: data do consentimento; "Retirar" (aviso + opção de apagar as pesagens e a meta) ou "Dar consentimento" |
| `DeleteAccountDialog` | client | `danger.css` | `mg-danger`, `__text`, `__list`, `__confirm`, `__actions` | zona de perigo: explica o que é apagado (tudo, sem recuperação), sugere exportar antes; `<dialog>` com palavra-passe + escrever "APAGAR"/"DELETE"; botão `mg-btn--danger` |
| `PolicyUpdateDialog` | client | `policy-dialog.css` | `mg-policy-dialog`, `__title`, `__text`, `__links`, `__consent`, `__actions` | bloqueante no layout `(app)` quando a versão dos Termos/Política mudou (ou nunca foi aceite): resumo + links + "Aceitar"; sem consentimento dos dados de saúde mostra também a caixa (opcional) |
| `LegalPage` | server | `legal.css` | `mg-legal`, `__meta`, `__draft`, `__body` | `/privacy` e `/terms`: `content/legal/<doc>/<locale>.md` com o parser mínimo (títulos `##`, listas, links, citações); Cormorant nos títulos, Jost no corpo, largura máxima 68ch; versão e data no topo |
| `AuthResult` | server | `auth-result.css` | `mg-auth-result`, … | bloco comum (ícone, título, texto, acções) de `VerifyEmailResult` e `ConfirmEmailChangeResult` |
| Layouts | server | `legal.css`, `settings-nav.css` | `mg-public`, `__header`, `__brand` · `mg-settings`, `__sections`, `__section` | grupo `(public)` (marca + "Voltar", sem login) · grelha das definições (índice + secções; 2 colunas a partir de 1024 px) |
| `GoodbyePage` (página) | server | `goodbye.css` | `mg-goodbye`, `__icon`, `__title`, `__text` | `/goodbye`: "A tua conta foi apagada. Obrigada por teres feito parte." + link para a página inicial |

### Administração — F12 (`src/components/admin/`, grupo `(admin)`, rotas `/admin/*`)

Só para os emails em `ADMIN_EMAILS` (`requireAdmin()` em `lib/admin.ts`; os outros recebem 404, sem indexação). Texto em PT-PT directamente nos componentes (área interna). Nunca mostra treinos, séries nem peso de ninguém. Dados em `lib/metrics/server.ts`; acções em `actions/admin.ts` (todas com `requireAdmin()` e Zod).

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `AdminNav` | client | `admin.css` | `mg-admin-nav`, `__link`, `--active` | Métricas · Utilizadores · Funcionalidades · voltar ao app |
| `MetricCard` | server | `admin.css` | `mg-stat`, `__value`, `__label`, `__hint` | número em destaque + rótulo (+ nota opcional); em grelha `mg-admin__tiles` |
| `AdminTable` | server | `admin.css` | `mg-admin-table`, `__num` | tabela simples com cabeçalho; colunas numéricas à direita (`tabular-nums`) |
| `ActivityBars` | server | `admin.css` | `mg-admin-bars`, `__bar`, `__fill`, `__label` | activos por dia nos últimos 30 dias, barras em CSS (altura relativa ao máximo; valor no `title` e numa tabela escondida) |
| `UserTable` | server | `admin.css` | `mg-admin-table` | email, nome, criado, última actividade, plano (origem, fim), boas-vindas; link para a ficha |
| `UserPlanForm` | client | `admin.css` | `mg-admin-form` | plano FREE/PREMIUM, origem MANUAL/GIFT, data de fim opcional → `setUserPlan` |
| `FeatureOverrideRow` | client | `admin.css` | `mg-admin-row` | por funcionalidade: seguir regra · forçar ligado · forçar desligado → `setFeatureOverride` |
| `FeatureRolloutRow` | client | `admin.css` | `mg-admin-row` | interruptor do premium (`pro`): HIDDEN · PREMIUM · ALL, nº de excepções → `setFeatureRollout` |

### Premium — F12 (`src/components/premium/`)

Plano lido do servidor por pedido (`getEntitlements`, `cache()` do React; nunca no JWT). A verificação que conta é sempre no servidor (`requireFeature`); o hook só decide o que mostrar. Sem pagamentos nem preços.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `EntitlementsProvider` | client | — | — | no layout `(app)`; `useEntitlements()` → `{ plan, can('pro') }` |
| `PremiumBadge` | server | `premium-badge.css` | `mg-premium-badge` | pílula pequena dourada "Premium"; no perfil, ao lado do nível, só para quem é premium |
| `PremiumLock` | client | `premium-lock.css` | `mg-premium-lock`, `__icon`, `__title`, `__text` | cartão em vidro com cadeado e brilho suave; `title` + `teaser`; em `/locked`, para onde vão as páginas do treino sem o recurso `pro` |
| `SentryUser` | client | — | — | (`components/providers/`) `Sentry.setUser({ id })` no layout `(app)`, só o id interno |
| `PublicAnalytics` | client | — | — | (`components/providers/`) `@vercel/analytics` (sem cookies) só em `/login`, `/register`, `/privacy`, `/terms`: montado nos layouts `(public)` e `(auth)`; `beforeSend` descarta qualquer outra rota (ex.: depois de entrar na app) |

### Treino — F16 (`src/components/body/`, lógica em `src/lib/fitness/`, grupo `(app)/(train)`, rotas na raiz)

Recurso premium `pro` com navegação própria, inspirado no Setgraph: biblioteca de exercícios (free-exercise-db + próprios), Programa → Treino → Item, sessão com cronómetro e descanso, histórico por exercício. Tempos sempre a partir de timestamps gravados (`startedAt`, `restEndsAt`). Acento próprio: `--body-accent`, `--body-accent-soft`, `--body-surface`, `--body-timer`; cores fixas por métrica (`--metric-reps`, `--metric-kg`, `--metric-volume`, `--metric-time`), sem significado de bom ou mau. Números grandes; alvos de toque ≥ 48 px.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `BodyShell` | server | `body-shell.css` | `mg-body-shell`, `__main` | layout do grupo `(train)`: fundo, conteúdo, `ActiveSessionPill` e `BodyNav`; entrada com fade e brilho |
| `BodyHeader` | server | `body-shell.css` | `mg-body-header`, `__back`, `__title`, `__actions` | nas páginas de topo, o link das Definições (⚙); nas outras, o voltar da secção; título e acções |
| `BodyNav` | client | `body-nav.css` | `mg-body-nav`, `__item`, `--active` | Treinos · Sessões · Dia · Corpo |
| `useNow` / `formatClock` | client (hook) | — | — | hora actual a cada segundo (e ao voltar à app); `formatClock` ("1:02:05") vive em `src/lib/fitness/session.ts` (usado também nos componentes servidor) |
| `ActiveSessionPill` | client | `session-pill.css` | `mg-session-pill` | "Sessão em curso · 00:32:10" acima da `BodyNav`; toca para voltar (escondida no ecrã da sessão) |
| `BodyWelcome` | client | `body-welcome.css` | `mg-body-welcome`, `__step`, `__options`, `__option--active` | boas-vindas do app (`/welcome`, onboarding; `completeFitnessOnboarding` grava as preferências e `User.onboardedAt`, `update({})` → `/`) em 4 passos: boas-vindas, descanso (60 · 90 · 120 · 180 · outro), aviso de fim de descanso (pede notificações), modelo ou do zero |
| `ProgramList` / `ProgramRow` | server | `program.css` | `mg-program-list`, `mg-program-row` | programas: nome, descrição curta, nº de treinos |
| `ProgramForm` | client | `program.css` | `mg-program-form` | criar ou editar programa (nome, descrição, tipo) e "Usar um modelo"; arquivar |
| `WorkoutList` / `WorkoutRow` | client (reordenação) | `program.css` | `mg-workout-list`, `mg-workout-row` | treinos do programa: nome, notas curtas, nº de exercícios |
| `WorkoutForm` | client | `workout.css` | `mg-workout-form` | criar ou editar treino (nome, notas); arquivar |
| `ReorderButtons` | client | `workout.css` | `mg-reorder` | subir e descer (programas, treinos e itens) |
| `WorkoutItemRow` | client | `workout.css` | `mg-workout-item` | exercício com alvo ("3 × 8–12 · descanso 90 s"), "última vez há 3 sem."; editar (abre `WorkoutItemForm`), remover, reordenar |
| `WorkoutItemForm` | client | `workout.css` | `mg-workout-item-form` | séries, reps mín. e máx. (ou segundos), descanso próprio |
| `WorkoutItems` | client | `workout.css` | `mg-workout-items` | lista de `WorkoutItemRow` e "+ Exercícios" (abre o `ExercisePicker`) |
| `ExerciseThumb` | server | `workout.css` | `mg-ex-row__thumb` (ou a classe passada) | miniatura WebP (ou haltere quando não há imagem) |
| `StartSessionButton` | client | `workout.css` | — | "Começar treino" (ou "Treino livre"); com sessão activa volta a ela |
| `ExercisePicker` | client | `ex-picker.css` | `mg-ex-picker`, `__search`, `__list`, `__item--selected`, `__footer` | folha (`dialog`) com pesquisa e filtros, selecção múltipla; confirma para o treino ou para a sessão; os exercícios próprios primeiro e "+ Criar exercício" ali mesmo (`CustomExerciseForm` com `onCreated`), que entra já seleccionado |
| `ExerciseList` / `ExerciseRow` | client | `ex-list.css` | `mg-ex-list`, `mg-ex-row` | biblioteca e os meus, com miniatura, músculos e equipamento; separador "Os meus" |
| `ExerciseFilters` | client | `ex-list.css` | `mg-ex-filters` | músculo, equipamento, categoria |
| `CustomExerciseForm` | client | `ex-list.css` | `mg-ex-form` | exercício próprio: nome, como se regista, músculos, equipamento; arquivar; `onCreated`, `initialOpen`, `initialName`, `onCancel` para usar dentro do `ExercisePicker` |
| `ExerciseDetail` | server | `ex-detail.css` | `mg-ex-detail`, `__summary`, `__more`, `__tags` | debaixo do nome, uma linha curta (músculo principal · equipamento); o resto (todos os músculos, categoria, medida, nível, "Adicionar a um treino" e editar o exercício próprio) num `<details>` "Detalhes" fechado |
| `ExerciseHistory` | server | `ex-detail.css` | `mg-ex-history`, `__group`, `__date` | por data (dia da semana em destaque), as séries em `SetLine`, da mais recente para a mais antiga |
| `SetLine` | server/client | `set-line.css` | `mg-set-line`, `__time`, `__rest`, `__metric`, `__num`, `__unit`, `__end` | uma série numa linha: hora (e descanso antes) à esquerda; à direita o número grande com a unidade pequena (reps na cor das reps, kg na cor dos kg, ou segundos) e o fim (✓, troféu ou …) |
| `ExerciseHowTo` | server | `ex-detail.css` | `mg-ex-howto`, `__images` | imagens e instruções na língua da pessoa |
| `AddToWorkout` | client | `ex-detail.css` | `mg-add-to-workout` | escolhe o treino e acrescenta o exercício |
| `SessionScreen` | client | `session.css` | `mg-session`, `__top`, `__list` | sessão activa: nome, cronómetro total, Terminar e ⋯ (notas, descartar), cartões dos exercícios, "+ Exercício", descanso; fila de gravação sem rede; wake lock; `visibilitychange` → `setClientHidden` |
| `SessionTimer` | client | `session.css` | `mg-session-timer` | cronómetro total grande a partir de `startedAt` |
| `SessionExerciseCard` | client | `session.css` | `mg-session-ex`, `__target`, `__last` | nome, alvo, "Última vez: 60 kg × 10, 10, 9", séries feitas e a próxima |
| `SetRow` | client | `session.css` | `mg-set-row` | série feita em `SetLine` (com a hora), toque para editar ou apagar |
| `SetInputRow` | client | `session.css` | `mg-set-input` | próxima série pré-preenchida (`prefillSet`) com steppers e "Feita ✓" |
| `NumberStepper` | client | `session.css` | `mg-stepper`, `__btn`, `__value` | − / valor (teclado numérico ao tocar) / + |
| `sessionQueue` | client (módulo) | — | — | fila de séries sem rede no dispositivo (id do cliente e hora real), reenviada ao voltar a rede |
| `RestTimer` | client | `rest.css` | `mg-rest`, `__ring`, `__count`, `--done` | faixa fixa: contagem decrescente grande, anel, −15 s, +30 s, Saltar; a 0 "Bora!", som curto e vibração (pisca sem `prefers-reduced-motion`) |
| `SessionSummary` | server | `session-summary.css` | `mg-session-summary`, `__stats`, `__ex` | duração, exercícios, séries, reps, volume, descanso médio; lista por exercício; entrada animada ao terminar |
| `SessionList` / `SessionRow` | server | `session-summary.css` | `mg-session-list`, `mg-session-row` | sessões por mês: treino, duração, data |

### Peso e evolução — F17 (`src/components/body/`, lógica em `src/lib/body/` e `src/lib/fitness/progress.ts`, rotas `/day`, `/corpo`, `/weight`)

Peso diário com média semanal, objectivo em linguagem neutra, recordes e evolução por exercício, tab Dia (estilo Today do Setgraph) e mapa muscular com recuperação. Tudo `pro`; o peso só com o consentimento de dados de saúde. Sem cores de bom/mau no peso: setas e diferenças usam `--text-muted`. Gráficos em SVG próprio.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `BodyDayView` | server | `day-metrics.css` | — | tab Dia: título (Hoje ou a data), `DayStrip`, `DayMetrics`, `SetDetails` e as sessões; sem treino "Dia de descanso" e "Começar treino" (só hoje) |
| `DayStrip` | client | `day-strip.css` | `mg-day-strip`, `__day`, `--trained`, `--selected`, `--today` | 7 dias (domingo a sábado) com marcador de treino; tocar abre o dia; setas para a semana anterior e seguinte; botão do calendário |
| `TrainingCalendar` | client | `train-cal.css` | `mg-train-cal`, `__month`, `__day--trained`, `--today` | folha (`dialog`) com os meses (do mais recente para trás), dias treinados preenchidos com `--body-accent`; tocar abre o dia |
| `DayMetrics` | server | `day-metrics.css` | `mg-day-metrics`, `__metric`, `--{kind}` | grelha 2 colunas: Séries, Repetições, Exercícios, Volume, Duração, Descanso médio, Tempo de sessão, Recordes (cor fixa por métrica) |
| `SetDetails` | server | `set-details.css` | `mg-set-details`, `__ex`, `__line` | por exercício: "60 kg: 11, 10, 10 rep" (troféu quando há recorde) |
| `BodyWeightCard` | server | `weight-card.css` | `mg-weight-card`, `__value`, `__delta` | último peso e média da semana com a diferença (seta neutra) → `/weight` |
| `MuscleMap` | client | `muscle-map.css` | `mg-muscle-map`, `__views`, `__view`, `__shape--{just,mid,rested,neutral}`, `__glow`, `__legend` | SVG próprio (formas de `mapShapes.ts`) frente e costas, com gradiente, cantos suaves, brilho a pulsar nos músculos acabados de treinar e teclado; cores `--recovery-just`, `--recovery-mid`, `--recovery-rested`; tocar num músculo abre a `MuscleExercisesSheet` |
| `MuscleExercisesSheet` | client | `muscle-map.css` | `mg-muscle-sheet` | últimos exercícios do músculo, com data e link |
| `WeightChart` | client | `weight-chart.css` | `mg-weight-chart`, `__point`, `__trend`, `__goal`, `__axis`, `__tip` | SVG responsivo: pontos diários vazios ligados por uma linha que passa por cada pesagem, linha tracejada do alvo, 4 a 5 marcas por eixo; toque num ponto mostra data e kg; selector M · 6M · A (`SegmentedControl`); períodos Semana (por defeito), Mês e 6 meses |
| `WeightEntrySheet` | client | `weight-entry.css` | `mg-weight-entry` | folha (`dialog`): data (hoje por defeito), kg com teclado decimal, "Guardar"; abre sozinha com `?new=1` |
| `WeightList` | client | `weight-entry.css` | `mg-weight-list`, `__row`, `__delete` | registos (data e kg), deslizar para a esquerda (ou botão) para apagar |
| `BodyGoalSheet` | client | `goal.css` | `mg-goal-sheet` | direcção (Ganhar · Manter · Perder em `SegmentedControl`), ritmo de `GOAL_RATES` ("+0,25 kg por semana"), alvo opcional; remover objectivo |
| `BodyGoalCard` | server | `goal.css` | `mg-goal-card` | "Objectivo: ganhar 0,25 kg/semana" · "Esta semana: +0,3 kg (dentro do ritmo)" · "Faltam 2,0 kg (≈ 8 semanas)" |
| `ExerciseTabs` | client | `ex-list.css` (reutiliza `mg-ex-tabs`) | `mg-ex-tabs`, `__tab` | Séries · Evolução · Recordes no topo do exercício |
| `CompareBlock` | server | — | — | na página do exercício: a última sessão contra a anterior, em `CompareCard` |
| `CompareCard` | server/client | `compare.css` | `mg-compare`, `__head`, `__grid`, `__cell`, `__bar`, `__label`, `__value`, `__delta`, `--up` | cartão "Comparado com a anterior": grelha 2×2 (séries, reps, volume, kg por rep), cada uma com barra de cor, nome, valor e variação com ▲/▼ e % (▲ em verde quando sobe; o resto neutro); também em cada exercício da sessão, contra a última vez, assim que há uma série |
| `ExerciseProgressChart` | client | `ex-chart.css` | `mg-ex-chart` | SVG de linha por sessão; selector melhor peso · e1RM · volume |
| `ExerciseRecords` | server | `ex-records.css` | `mg-ex-records`, `__row` | melhor peso, melhor e1RM, máx. reps por peso, com datas |
| `PrTrophy` | client | `pr.css` | `mg-pr`, `--fresh` | troféu dourado (`--pr-gold`); animação curta só sem `prefers-reduced-motion` |

### Recuperação de erros (F18, `src/components/shell/RouteError.tsx`, `src/lib/errors/recover.ts`)

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `RouteError` | client | `route-error.css` | `mg-route-error`, `__title`, `__actions` | `error.tsx` do grupo `(app)`: mensagem em cartão de vidro dentro do layout (a navegação continua à vista), "Tentar de novo" (refresca e repõe) e "Recarregar a app"; erros de rede ou de versão nova (`isRecoverableError`) recarregam sozinhos, no máximo uma vez por minuto |
