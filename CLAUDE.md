# FitnessClub — instruções para o Claude Code

Lê `docs/DECISIONS.md` e `docs/COMPONENTS.md` antes de implementar qualquer coisa. Este app nasceu do "Foco no corpo" do MYGLOW; o MYGLOW é outro repositório e não se mexe nele a partir daqui.

## Regras que nunca se quebram
- CSS: cada componente tem classes `mg-*` (BEM) em `src/styles/components/<nome>.css`. Inline style só para ajuste pontual numa instância. Sem Tailwind.
- Cores, espaços, raios, sombras: só `var(--…)` definidos em `src/styles/tokens.css` (tema claro e escuro).
- Antes de criar um componente novo, acrescenta-o a `docs/COMPONENTS.md`.
- Páginas são Server Components; `'use client'` só em componentes interactivos; Prisma nunca no cliente; mutações por Server Actions validadas com Zod.
- Datas de calendário são strings `YYYY-MM-DD` (`DateISO`) calculadas no fuso do utilizador; conversão para `Date` só com `toDbDate`/`fromDbDate` de `src/lib/dates.ts`.
- Semana começa ao domingo; lógica de semanas só em `src/lib/weeks.ts`.
- Peso em gramas inteiras; peso e meta só com o consentimento de dados de saúde.
- Texto visível só em `messages/pt-PT.json`, `pt-BR.json`, `en.json`, escrito de forma nativa em cada língua (o admin é interno, em PT-PT no código).
- Ícones de destaque via `MagicIcon` (`src/lib/icons.ts`); lucide directo só para ícones de UI de linha.
- Alterações cirúrgicas: nunca reescrever ficheiros inteiros existentes.
- Commits: um commit único por fase, no fim, com `vitest`, `tsc --noEmit` e build a passar.
- Testes: só Vitest + lista de verificação manual. Sem Playwright.
- Segredos: nunca no repositório nem no chat; as variáveis de ambiente vivem na Vercel (`.env.example` só tem nomes e exemplos).
